
import mongoose from "mongoose";

import {Friend} from "../models/friend.model.js";
import {User} from "../models/users.model.js";
import {Activity} from "../models/activity.model.js";
import { Task }from "../models/tasks.model.js";
import {QuestionLog} from "../models/questionLog.model.js";

import { TRACKER_CONFIG } from "../config/questionTracker.js";

import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getSortedPair = (firstId, secondId) => {
  return [firstId, secondId].sort((a, b) =>
    a.toString().localeCompare(b.toString())
  );
};

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

const addDays = (dateKey, amount) => {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
};

// Verify that the relationship exists and is accepted.
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

// Send friend invitation using invite code.
export const sendFriendRequest = asyncHandler(async (req, res) => {
  const inviteCode = req.body.inviteCode?.trim().toUpperCase();

  if (!inviteCode) {
    throw new ApiError(400, "Invite code is required");
  }

  const receiver = await User.findOne({ inviteCode }).select(
    "_id name email goal inviteCode"
  );

  if (!receiver) {
    throw new ApiError(404, "No user found with this invite code");
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

  if (
    friendship?.status === "pending" &&
    friendship.requestedBy.toString() === senderId.toString()
  ) {
    throw new ApiError(409, "Friend request already sent");
  }

  // If the other user already sent a pending request,
  // treat this action as an automatic acceptance.
  if (
    friendship?.status === "pending" &&
    friendship.requestedBy.toString() === receiverId.toString()
  ) {
    friendship.status = "accepted";
    friendship.respondedAt = new Date();
    await friendship.save();

    return res.status(200).json(
      new ApiResponse(
        200,
        { friendship },
        "Existing friend request accepted"
      )
    );
  }

  if (friendship?.status === "rejected") {
    friendship.status = "pending";
    friendship.requestedBy = senderId;
    friendship.respondedAt = null;
    await friendship.save();
  } else {
    friendship = await Friend.create({
      userA,
      userB,
      requestedBy: senderId,
      status: "pending",
    });
  }

  return res.status(201).json(
    new ApiResponse(201, { friendship }, "Friend request sent successfully")
  );
});

// Get incoming friend requests.


export const getIncomingRequests = asyncHandler(async (req, res) => {
  const requests = await Friend.find({
    requestedBy: { $ne: req.user._id },
    status: "pending",
    $or: [
      { userA: req.user._id },
      { userB: req.user._id },
    ],
  })
    .populate("requestedBy", "name email goal inviteCode")
    .sort({ createdAt: -1 });

  return res.status(200).json(
    new ApiResponse(200, requests, "Incoming requests fetched successfully")
  );
});



// Get outgoing friend requests.
export const getOutgoingRequests = asyncHandler(async (req, res) => {
  const requests = await Friend.find({
    requestedBy: req.user._id,
    status: "pending",
  })
    .populate("userA userB", "name email goal inviteCode")
    .sort({ createdAt: -1 });

  return res.status(200).json(
    new ApiResponse(200, requests, "Outgoing requests fetched successfully")
  );
});

// Accept an incoming friend request.
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
  ).populate("userA userB", "name email goal");

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

// Reject an incoming friend request.
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
  );

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

// Cancel an outgoing request.
export const cancelFriendRequest = asyncHandler(async (req, res) => {
  const friendship = await Friend.findOneAndDelete({
    _id: req.params.id,
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

// Get accepted friends.
export const getFriends = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const friendships = await Friend.find({
    status: "accepted",
    $or: [{ userA: userId }, { userB: userId }],
  })
    .populate("userA userB", "name email goal inviteCode")
    .sort({ updatedAt: -1 });

  const friends = friendships.map((friendship) => {
    const friend =
      friendship.userA._id.toString() === userId.toString()
        ? friendship.userB
        : friendship.userA;

    return {
      friendshipId: friendship._id,
      friend,
      friendsSince: friendship.respondedAt || friendship.updatedAt,
    };
  });

  return res.status(200).json(
    new ApiResponse(200, friends, "Friends fetched successfully")
  );
});

// Remove an accepted friend.
export const removeFriend = asyncHandler(async (req, res) => {
  const friendId = req.params.friendId;

  if (!mongoose.isValidObjectId(friendId)) {
    throw new ApiError(400, "Invalid friend ID");
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

// Get one user's weekly study statistics.
const getWeeklyStats = async (userId, goal) => {
  const today = getTodayKey();
  const startDate = addDays(today, -6);

  const activities = await Activity.find({
    userId,
    dateKey: { $gte: startDate, $lte: today },
  }).select("dateKey studyMinutes sessionsCount -_id");

  const totalStudyMinutes = activities.reduce(
    (sum, item) => sum + item.studyMinutes,
    0
  );

  const activeDays = activities.filter(
    (item) => item.studyMinutes > 0
  ).length;

  const totalSessions = activities.reduce(
    (sum, item) => sum + item.sessionsCount,
    0
  );

  const questionLogs = await QuestionLog.find({
    userId,
    date: {
      $gte: new Date(`${startDate}T00:00:00.000Z`),
      $lte: new Date(`${today}T23:59:59.999Z`),
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

// Compare your weekly study performance with an accepted friend.
export const compareFriend = asyncHandler(async (req, res) => {
  const currentUserId = req.user._id;
  const friendId = req.params.friendId;

  await getAcceptedFriendship(currentUserId, friendId);

  const [currentUser, friend] = await Promise.all([
    User.findById(currentUserId).select("name goal"),
    User.findById(friendId).select("name goal"),
  ]);

  if (!friend) {
    throw new ApiError(404, "Friend account not found");
  }

  const [myStats, friendStats] = await Promise.all([
    getWeeklyStats(currentUserId, currentUser.goal),
    getWeeklyStats(friendId, friend.goal),
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        period: {
          startDate: addDays(getTodayKey(), -6),
          endDate: getTodayKey(),
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
