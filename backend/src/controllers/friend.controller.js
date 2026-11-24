
import mongoose from "mongoose";

import { Friend } from "../models/friend.model.js";
import { User } from "../models/users.model.js";
import { Activity } from "../models/activity.model.js";
import { QuestionLog } from "../models/questionLog.model.js";

import { TRACKER_CONFIG } from "../config/questionTracker.js";

import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const PUBLIC_USER_FIELDS = "name goal";

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

// --------------------------------------------------
// USER DISCOVERY
// --------------------------------------------------

// Search users by name.
export const searchUsers = asyncHandler(async (req, res) => {
  const query = req.query.query?.trim();

  if (!query || query.length < 2) {
    throw new ApiError(400, "Search query must contain at least 2 characters");
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

// Send friend request using invite code.
export const sendFriendRequest = asyncHandler(async (req, res) => {
  const inviteCode = req.body.inviteCode?.trim().toUpperCase();

  if (!inviteCode) {
    throw new ApiError(400, "Invite code is required");
  }

  const receiver = await User.findOne({
    inviteCode,
    isActive: true,
  }).select("_id");

  if (!receiver) {
    throw new ApiError(404, "No active user found with this invite code");
  }

  const senderId = req.user._id;
  const receiverId = receiver._id;

  if (senderId.toString() === receiverId.toString()) {
    throw new ApiError(400, "You cannot send a friend request to yourself");
  }

  const [userA, userB] = getSortedPair(senderId, receiverId);

  let friendship = await Friend.findOne({ userA, userB });

  if (friendship?.status === "accepted") {
    throw new ApiError(409, "You are already friends");
  }

  if (friendship?.status === "pending") {
    if (friendship.requestedBy.toString() === senderId.toString()) {
      throw new ApiError(409, "Friend request already sent");
    }

    // Automatically accept the other user's existing request.
    friendship = await Friend.findOneAndUpdate(
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
      { new: true }
    );

    if (!friendship) {
      throw new ApiError(409, "Friend request was already handled");
    }

    return res.status(200).json(
      new ApiResponse(200, friendship, "Friend request accepted")
    );
  }

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
      { new: true }
    );

    if (!friendship) {
      throw new ApiError(409, "Friend request status changed. Try again");
    }

    return res.status(200).json(
      new ApiResponse(200, friendship, "Friend request sent successfully")
    );
  }

  try {
    friendship = await Friend.create({
      userA,
      userB,
      requestedBy: senderId,
      status: "pending",
    });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new ApiError(409, "A friend request already exists");
    }

    throw error;
  }

  return res.status(201).json(
    new ApiResponse(201, friendship, "Friend request sent successfully")
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
    new ApiResponse(200, requests, "Incoming requests fetched successfully")
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
    new ApiResponse(200, requests, "Outgoing requests fetched successfully")
  );
});

// Accept incoming request.
export const acceptFriendRequest = asyncHandler(async (req, res) => {
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
        status: "accepted",
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
    new ApiResponse(200, friendship, "Friend request accepted")
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
    new ApiResponse(200, friendship, "Friend request rejected")
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

  if (!mongoose.isValidObjectId(friendId)) {
    throw new ApiError(400, "Invalid friend ID");
  }

  if (req.user._id.toString() === friendId) {
    throw new ApiError(400, "You cannot remove yourself");
  }

  const [userA, userB] = getSortedPair(req.user._id, friendId);

  const friendship = await Friend.findOneAndDelete({
    userA,
    userB,
    status: "accepted",
  });

  if (!friendship) {
    throw new ApiError(404, "Friendship not found");
  }

  return res.status(200).json(
    new ApiResponse(200, null, "Friend removed successfully")
  );
});

// --------------------------------------------------
// STUDY COMPARISON
// --------------------------------------------------

// Get weekly study statistics.
const getWeeklyStats = async (userId, goal) => {
  const today = getTodayKey();
  const startDate = addDays(today, -6);

  const activities = await Activity.find({
    userId,
    dateKey: { $gte: startDate, $lte: today },
  }).select("dateKey studyMinutes sessionsCount -_id");

  const totalStudyMinutes = activities.reduce(
    (sum, item) => sum + (item.studyMinutes || 0),
    0
  );

  const activeDays = new Set(
    activities
      .filter((item) => item.studyMinutes > 0)
      .map((item) => item.dateKey)
  ).size;

  const totalSessions = activities.reduce(
    (sum, item) => sum + (item.sessionsCount || 0),
    0
  );

  const questionLogs = await QuestionLog.find({
    userId,
    date: {
      $gte: new Date(`${startDate}T00:00:00.000Z`),
      $lt: new Date(`${addDays(today, 1)}T00:00:00.000Z`),
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
    totalStudyHours: Number((totalStudyMinutes / 60).toFixed(1)),
    activeDays,
    totalSessions,
    weeklyMetrics,
  };
};

// Compare your weekly study performance with a friend.
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
