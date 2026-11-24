
import mongoose from "mongoose";

import { Friend } from "../models/friend.model.js";
import { User } from "../models/users.model.js";
import { Activity } from "../models/activity.model.js";
import { QuestionLog } from "../models/questionLog.model.js";
import { Task } from "../models/tasks.model.js";
import { getDailyDuelStats } from "../utils/dailyDuel.service.js";

import { TRACKER_CONFIG } from "../config/questionTracker.js";

import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const PUBLIC_USER_FIELDS = "name goal";

// --------------------------------------------------
// SHARED HELPERS
// --------------------------------------------------

// Sort IDs to maintain one relationship per user pair.
const getSortedPair = (firstId, secondId) => {
  return [firstId, secondId].sort((a, b) =>
    a.toString().localeCompare(b.toString())
  );
};

const isDuplicateKeyError = (error) => error?.code === 11000;

// Escape search input before creating a regular expression.
const escapeRegex = (value) => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

// Get current date in Indian Standard Time.
const getTodayKey = () => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const values = Object.fromEntries(
    parts.map(({ type, value }) => [type, value])
  );

  return `${values.year}-${values.month}-${values.day}`;
};

// Validate YYYY-MM-DD date keys.
const isValidDateKey = (dateKey) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    return false;
  }

  const date = new Date(`${dateKey}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === dateKey
  );
};

// Add or subtract days from YYYY-MM-DD.
const addDays = (dateKey, amount) => {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + amount);

  return date.toISOString().slice(0, 10);
};

// Verify accepted friendship before allowing comparison.
const getAcceptedFriendship = async (userId, friendId) => {
  if (!mongoose.isValidObjectId(friendId)) {
    throw new ApiError(400, "Invalid friend ID");
  }

  if (userId.toString() === friendId.toString()) {
    throw new ApiError(400, "You cannot perform this action on yourself");
  }

  const [userA, userB] = getSortedPair(userId, friendId);

  const friendship = await Friend.findOne({
    userA,
    userB,
    status: "accepted",
  });

  if (!friendship) {
    throw new ApiError(403, "You are not friends with this user");
  }

  return friendship;
};

// Check whether both users are available for a new partnership.
const assertUsersAvailable = async (firstId, secondId, session = null) => {
  const ids = [firstId, secondId];

  let userQuery = User.find({
    _id: { $in: ids },
  }).select("_id friendId");

  if (session) userQuery = userQuery.session(session);

  const users = await userQuery;

  if (users.length !== 2) {
    throw new ApiError(404, "One or both user accounts were not found");
  }

  if (users.some((user) => user.friendId)) {
    throw new ApiError(
      409,
      "One or both users already have a study partner"
    );
  }

  // Also catches old accepted friendships created before friendId existed.
  let friendshipQuery = Friend.findOne({
    status: "accepted",
    $or: [
      { userA: { $in: ids } },
      { userB: { $in: ids } },
    ],
  });

  if (session) friendshipQuery = friendshipQuery.session(session);

  const existingFriendship = await friendshipQuery;

  if (existingFriendship) {
    throw new ApiError(
      409,
      "One or both users already have a study partner"
    );
  }
};

// Atomically assign each user their one allowed study partner.
const assignPartnerSlots = async (firstId, secondId, session) => {
  await assertUsersAvailable(firstId, secondId, session);

  const firstUser = await User.findOneAndUpdate(
    {
      _id: firstId,
      friendId: null,
    },
    {
      $set: { friendId: secondId },
    },
    {
      new: true,
      session,
    }
  );

  if (!firstUser) {
    throw new ApiError(
      409,
      "The first user already has a study partner"
    );
  }

  const secondUser = await User.findOneAndUpdate(
    {
      _id: secondId,
      friendId: null,
    },
    {
      $set: { friendId: firstId },
    },
    {
      new: true,
      session,
    }
  );

  if (!secondUser) {
    throw new ApiError(
      409,
      "The second user already has a study partner"
    );
  }
};

// --------------------------------------------------
// USER DISCOVERY
// --------------------------------------------------

// Search users by name.
export const searchUsers = asyncHandler(async (req, res) => {
  const query = req.query.query?.trim();

  if (!query || query.length < 2) {
    throw new ApiError(
      400,
      "Search query must contain at least 2 characters"
    );
  }

  if (query.length > 50) {
    throw new ApiError(400, "Search query is too long");
  }

  const searchRegex = new RegExp(escapeRegex(query), "i");

  const users = await User.find({
    _id: { $ne: req.user._id },
    isActive: true,
    name: searchRegex,
  })
    .select(PUBLIC_USER_FIELDS)
    .limit(10)
    .lean();

  const userIds = users.map((user) => user._id);

  const relationships = userIds.length
    ? await Friend.find({
        $or: [
          {
            userA: req.user._id,
            userB: { $in: userIds },
          },
          {
            userB: req.user._id,
            userA: { $in: userIds },
          },
        ],
      })
        .select("userA userB requestedBy status")
        .lean()
    : [];

  const relationshipMap = new Map();

  for (const relationship of relationships) {
    const otherUserId =
      relationship.userA.toString() === req.user._id.toString()
        ? relationship.userB.toString()
        : relationship.userA.toString();

    let relationshipStatus = "none";

    if (relationship.status === "accepted") {
      relationshipStatus = "friends";
    } else if (relationship.status === "pending") {
      relationshipStatus =
        relationship.requestedBy.toString() === req.user._id.toString()
          ? "outgoing"
          : "incoming";
    } else if (relationship.status === "rejected") {
      relationshipStatus = "rejected";
    }

    relationshipMap.set(otherUserId, {
      relationshipStatus,
      friendshipId: relationship._id,
    });
  }

  const results = users.map((user) => ({
    ...user,
    ...(relationshipMap.get(user._id.toString()) ?? {
      relationshipStatus: "none",
      friendshipId: null,
    }),
  }));

  return res.status(200).json(
    new ApiResponse(200, results, "Users fetched successfully")
  );
});

// --------------------------------------------------
// FRIEND REQUESTS
// --------------------------------------------------

// Send friend request using user ID or invite code.
export const sendFriendRequest = asyncHandler(async (req, res) => {
  const { userId: targetUserId } = req.body;

  let receiver;

  // Find receiver using user ID or invitation code.
  if (targetUserId) {
    if (!mongoose.isValidObjectId(targetUserId)) {
      throw new ApiError(400, "Invalid user ID");
    }

    receiver = await User.findOne({
      _id: targetUserId,
      isActive: true,
    }).select("_id");
  } else {
    const inviteCode = req.body.inviteCode?.trim().toUpperCase();

    if (!inviteCode) {
      throw new ApiError(
        400,
        "Invite code or user ID is required"
      );
    }

    receiver = await User.findOne({
      inviteCode,
      isActive: true,
    }).select("_id");
  }

  if (!receiver) {
    throw new ApiError(404, "No active user found");
  }

  const senderId = req.user._id;
  const receiverId = receiver._id;

  if (senderId.toString() === receiverId.toString()) {
    throw new ApiError(
      400,
      "You cannot send a friend request to yourself"
    );
  }

  const [userA, userB] = getSortedPair(senderId, receiverId);

  let friendship = await Friend.findOne({
    userA,
    userB,
  });

  if (friendship?.status === "accepted") {
    throw new ApiError(409, "You are already friends");
  }

  // Handle existing pending request.
  if (friendship?.status === "pending") {
    if (friendship.requestedBy.toString() === senderId.toString()) {
      throw new ApiError(409, "Friend request already sent");
    }

    // Reciprocal request: accept only if both users are available.
    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        await assignPartnerSlots(
          senderId,
          receiverId,
          session
        );

        const updatedFriendship = await Friend.findOneAndUpdate(
          {
            _id: friendship._id,
            status: "pending",
            requestedBy: receiverId,
          },
          {
            $set: {
              status: "accepted",
              respondedAt: new Date(),
            },
          },
          {
            new: true,
            session,
          }
        );

        if (!updatedFriendship) {
          throw new ApiError(
            409,
            "Friend request was already handled"
          );
        }

        friendship = updatedFriendship;
      });
    } finally {
      await session.endSession();
    }

    return res.status(200).json(
      new ApiResponse(
        200,
        friendship,
        "Friend request accepted"
      )
    );
  }

  await assertUsersAvailable(senderId, receiverId);

  // Reopen a previously rejected request.
  if (friendship?.status === "rejected") {
    friendship = await Friend.findOneAndUpdate(
      {
        _id: friendship._id,
        status: "rejected",
      },
      {
        $set: {
          status: "pending",
          requestedBy: senderId,
          respondedAt: null,
        },
      },
      {
        new: true,
      }
    );

    if (!friendship) {
      throw new ApiError(
        409,
        "Friend request status changed. Try again"
      );
    }

    return res.status(200).json(
      new ApiResponse(
        200,
        friendship,
        "Friend request sent successfully"
      )
    );
  }

  // Create a new friend request.
  try {
    friendship = await Friend.create({
      userA,
      userB,
      requestedBy: senderId,
      status: "pending",
    });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new ApiError(
        409,
        "A friend request already exists"
      );
    }

    throw error;
  }

  return res.status(201).json(
    new ApiResponse(
      201,
      friendship,
      "Friend request sent successfully"
    )
  );
});

// Get incoming requests.
export const getIncomingRequests = asyncHandler(async (req, res) => {
  const requests = await Friend.find({
    requestedBy: { $ne: req.user._id },
    status: "pending",
    $or: [
      { userA: req.user._id },
      { userB: req.user._id },
    ],
  })
    .populate("requestedBy", PUBLIC_USER_FIELDS)
    .sort({ createdAt: -1 });

  return res.status(200).json(
    new ApiResponse(
      200,
      requests,
      "Incoming requests fetched successfully"
    )
  );
});

// Get outgoing requests.
export const getOutgoingRequests = asyncHandler(async (req, res) => {
  const requests = await Friend.find({
    requestedBy: req.user._id,
    status: "pending",
  })
    .populate("userA userB", PUBLIC_USER_FIELDS)
    .sort({ createdAt: -1 });

  return res.status(200).json(
    new ApiResponse(
      200,
      requests,
      "Outgoing requests fetched successfully"
    )
  );
});

// Accept incoming request.
export const acceptFriendRequest = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(400, "Invalid friend request ID");
  }

  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const friendship = await Friend.findOne({
        _id: id,
        status: "pending",
        requestedBy: { $ne: req.user._id },
        $or: [
          { userA: req.user._id },
          { userB: req.user._id },
        ],
      }).session(session);

      if (!friendship) {
        throw new ApiError(
          404,
          "Incoming friend request not found or already handled"
        );
      }

      const otherUserId =
        friendship.userA.toString() === req.user._id.toString()
          ? friendship.userB
          : friendship.userA;

      await assignPartnerSlots(
        req.user._id,
        otherUserId,
        session
      );

      const updatedFriendship = await Friend.findOneAndUpdate(
        {
          _id: id,
          status: "pending",
          requestedBy: { $ne: req.user._id },
        },
        {
          $set: {
            status: "accepted",
            respondedAt: new Date(),
          },
        },
        {
          new: true,
          session,
        }
      );

      if (!updatedFriendship) {
        throw new ApiError(
          409,
          "Friend request was already handled"
        );
      }
    });
  } finally {
    await session.endSession();
  }

  const acceptedFriendship = await Friend.findById(id)
    .populate("userA userB", PUBLIC_USER_FIELDS);

  return res.status(200).json(
    new ApiResponse(
      200,
      acceptedFriendship,
      "Friend request accepted"
    )
  );
});

// Reject incoming request.
export const rejectFriendRequest = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(400, "Invalid friend request ID");
  }

  const friendship = await Friend.findOneAndUpdate(
    {
      _id: id,
      status: "pending",
      requestedBy: { $ne: req.user._id },
      $or: [
        { userA: req.user._id },
        { userB: req.user._id },
      ],
    },
    {
      $set: {
        status: "rejected",
        respondedAt: new Date(),
      },
    },
    { new: true }
  ).populate("userA userB", PUBLIC_USER_FIELDS);

  if (!friendship) {
    throw new ApiError(
      404,
      "Incoming friend request not found or already handled"
    );
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      friendship,
      "Friend request rejected"
    )
  );
});

// Cancel outgoing request.
export const cancelFriendRequest = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(400, "Invalid friend request ID");
  }

  const friendship = await Friend.findOneAndDelete({
    _id: id,
    requestedBy: req.user._id,
    status: "pending",
  });

  if (!friendship) {
    throw new ApiError(404, "Outgoing friend request not found");
  }

  return res.status(200).json(
    new ApiResponse(200, null, "Friend request cancelled")
  );
});

// --------------------------------------------------
// FRIEND MANAGEMENT
// --------------------------------------------------

// Get accepted friends.
export const getFriends = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const friendships = await Friend.find({
    status: "accepted",
    $or: [
      { userA: userId },
      { userB: userId },
    ],
  })
    .populate("userA userB", PUBLIC_USER_FIELDS)
    .sort({ updatedAt: -1 });

  const friends = friendships
    .map((friendship) => {
      const friend =
        friendship.userA?._id?.toString() === userId.toString()
          ? friendship.userB
          : friendship.userA;

      if (!friend) return null;

      return {
        friendshipId: friendship._id,
        friend,
        friendsSince: friendship.respondedAt || friendship.updatedAt,
      };
    })
    .filter(Boolean);

  return res.status(200).json(
    new ApiResponse(200, friends, "Friends fetched successfully")
  );
});

// Remove accepted friend.
export const removeFriend = asyncHandler(async (req, res) => {
  const { friendId } = req.params;
  const currentUserId = req.user._id;

  if (!mongoose.isValidObjectId(friendId)) {
    throw new ApiError(400, "Invalid friend ID");
  }

  if (currentUserId.toString() === friendId.toString()) {
    throw new ApiError(400, "You cannot remove yourself");
  }

  const [userA, userB] = getSortedPair(currentUserId, friendId);

  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const friendship = await Friend.findOneAndDelete({
        userA,
        userB,
        status: "accepted",
      }).session(session);

      if (!friendship) {
        throw new ApiError(404, "Friendship not found");
      }

      // Release both users' partner slots.
      await User.updateMany(
        {
          _id: { $in: [userA, userB] },
          friendId: { $in: [userA, userB] },
        },
        {
          $set: { friendId: null },
        },
        { session }
      );
    });
  } finally {
    await session.endSession();
  }

  return res.status(200).json(
    new ApiResponse(200, null, "Friend removed successfully")
  );
});

// --------------------------------------------------
// WEEKLY STUDY COMPARISON
// --------------------------------------------------

// Get weekly study statistics.
const getWeeklyStats = async (userId, goal) => {
  const today = getTodayKey();
  const startDate = addDays(today, -6);
  const endDate = addDays(today, 1);

  // Task dates are stored as UTC midnight date-only values.
  const scheduledStart = new Date(`${startDate}T00:00:00.000Z`);
  const scheduledEnd = new Date(`${endDate}T00:00:00.000Z`);

  // Study time and active days come from completed tasks.
  const completedTaskStats = await Task.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId.toString()),
        status: "completed",
        scheduledDate: {
          $gte: scheduledStart,
          $lt: scheduledEnd,
        },
      },
    },
    {
      $group: {
        _id: "$scheduledDate",
        studyMinutes: {
          $sum: "$durationMinutes",
        },
      },
    },
    {
      $group: {
        _id: null,
        totalStudyMinutes: {
          $sum: "$studyMinutes",
        },
        activeDays: {
          $sum: 1,
        },
      },
    },
  ]);

  const totalStudyMinutes =
    completedTaskStats[0]?.totalStudyMinutes || 0;

  const activeDays =
    completedTaskStats[0]?.activeDays || 0;

  // Sessions remain sourced from Activity.
  const activities = await Activity.find({
    userId,
    dateKey: { $gte: startDate, $lte: today },
  }).select("sessionsCount -_id");

  const totalSessions = activities.reduce(
    (sum, item) => sum + (item.sessionsCount || 0),
    0
  );

  // Questions remain sourced from QuestionLog.
  const questionLogs = await QuestionLog.find({
    userId,
    date: {
      $gte: new Date(`${startDate}T00:00:00.000Z`),
      $lt: new Date(`${endDate}T00:00:00.000Z`),
    },
  }).select("metrics -_id");

  const weeklyMetrics = {};

  if (goal && TRACKER_CONFIG[goal]) {
    for (const metric of TRACKER_CONFIG[goal]) {
      weeklyMetrics[metric.key] = 0;
    }

    for (const log of questionLogs) {
      const metrics =
        log.metrics instanceof Map
          ? Object.fromEntries(log.metrics)
          : log.metrics || {};

      for (const metric of TRACKER_CONFIG[goal]) {
        weeklyMetrics[metric.key] += Number(
          metrics[metric.key] || 0
        );
      }
    }
  }

  return {
    totalStudyMinutes,
    totalStudyHours: Number((totalStudyMinutes / 60).toFixed(2)),
    activeDays,
    totalSessions,
    weeklyMetrics,
  };
};

// Compare weekly study performance with a friend.
export const compareFriend = asyncHandler(async (req, res) => {
  const currentUserId = req.user._id;
  const { friendId } = req.params;

  await getAcceptedFriendship(currentUserId, friendId);

  const [currentUser, friend] = await Promise.all([
    User.findOne({
      _id: currentUserId,
      isActive: true,
    }).select("name goal"),

    User.findOne({
      _id: friendId,
      isActive: true,
    }).select("name goal"),
  ]);

  if (!currentUser) {
    throw new ApiError(404, "Your user account was not found");
  }

  if (!friend) {
    throw new ApiError(404, "Friend account not found");
  }

  const [myStats, friendStats] = await Promise.all([
    getWeeklyStats(currentUserId, currentUser.goal),
    getWeeklyStats(friendId, friend.goal),
  ]);

  const today = getTodayKey();

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        period: {
          startDate: addDays(today, -6),
          endDate: today,
          label: "Last 7 days",
        },
        me: {
          name: currentUser.name,
          goal: currentUser.goal,
          ...myStats,
        },
        friend: {
          name: friend.name,
          goal: friend.goal,
          ...friendStats,
        },
        sameGoal: currentUser.goal === friend.goal,
      },
      "Weekly comparison fetched successfully"
    )
  );
});

// --------------------------------------------------
// DAILY DUEL
// --------------------------------------------------

// Compare two independent daily competition categories.
const getDailyWinner = (myValue, friendValue) => {
  if (myValue > friendValue) return "me";
  if (friendValue > myValue) return "friend";

  return "draw";
};

// Format daily player statistics.
const formatDailyPlayer = (stats) => ({
  studyMinutes: stats.studyMinutes || 0,

  studyHours: Number(
    ((stats.studyMinutes || 0) / 60).toFixed(2)
  ),

  totalTasks: stats.totalTasks || 0,
  completedTasks: stats.completedTasks || 0,
  completionRate: stats.completionRate || 0,
});

// Get daily duel history and today's live comparison.
export const getDailyDuel = asyncHandler(async (req, res) => {
  const currentUserId = req.user._id;
  const { friendId } = req.params;

  // Only accepted friends can access the duel.
  await getAcceptedFriendship(currentUserId, friendId);

  // Validate days query strictly.
  const rawDays = req.query.days;

  let days = 7;

  if (rawDays !== undefined) {
    if (!/^\d+$/.test(rawDays)) {
      throw new ApiError(
        400,
        "Days must be a valid number between 1 and 30"
      );
    }

    days = Number(rawDays);

    if (!Number.isInteger(days) || days < 1 || days > 30) {
      throw new ApiError(
        400,
        "Days must be between 1 and 30"
      );
    }
  }

  const [currentUser, friend] = await Promise.all([
    User.findOne({
      _id: currentUserId,
      isActive: true,
    }).select("name goal"),

    User.findOne({
      _id: friendId,
      isActive: true,
    }).select("name goal"),
  ]);

  if (!currentUser) {
    throw new ApiError(404, "Your user account was not found");
  }

  if (!friend) {
    throw new ApiError(404, "Friend account not found");
  }

  const today = getTodayKey();
  const requestedStartDate = addDays(today, -(days - 1));

  // Do not generate history before the feature launch date.
  const configuredStartDate = process.env.DAILY_DUEL_START_DATE;

  let startDate = requestedStartDate;

  if (configuredStartDate) {
    if (!isValidDateKey(configuredStartDate)) {
      throw new ApiError(
        500,
        "Invalid DAILY_DUEL_START_DATE configuration"
      );
    }

    if (configuredStartDate > today) {
      throw new ApiError(
        500,
        "DAILY_DUEL_START_DATE cannot be in the future"
      );
    }

    if (configuredStartDate > startDate) {
      startDate = configuredStartDate;
    }
  }

  const history = [];

  // Fetch each date in chronological order.
  for (
    let dateKey = startDate;
    dateKey <= today;
    dateKey = addDays(dateKey, 1)
  ) {
    // getDailyDuelStats reads finalized snapshots for past dates
    // and calculates live statistics for today.
    const myStats = await getDailyDuelStats(
      currentUserId,
      dateKey
    );

    const friendStats = await getDailyDuelStats(
      friendId,
      dateKey
    );

    const me = formatDailyPlayer(myStats);
    const friendData = formatDailyPlayer(friendStats);

    history.push({
      dateKey,

      me,
      friend: friendData,

      winners: {
        // Study time is an independent competition.
        studyHours: getDailyWinner(
          me.studyMinutes,
          friendData.studyMinutes
        ),

        // No winner if either player had no scheduled tasks.
        goalCompletion:
          me.totalTasks > 0 && friendData.totalTasks > 0
            ? getDailyWinner(
                me.completionRate,
                friendData.completionRate
              )
            : null,
      },
    });
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        date: today,
        days: history.length,

        me: {
          name: currentUser.name,
          goal: currentUser.goal,
        },

        friend: {
          name: friend.name,
          goal: friend.goal,
        },

        history,
      },
      "Daily Duel history fetched successfully"
    )
  );
});
