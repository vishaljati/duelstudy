
import mongoose from "mongoose";

import {Challenge} from "../models/challenge.model.js";
import {Friend} from "../models/friend.model.js";
import {Activity} from "../models/activity.model.js";

import {
  getTodayKey,
  addDays,
} from "../utils/competition.utils.js";

import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const isValidDateKey = (dateKey) => {
  if (typeof dateKey !== "string") return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return false;

  const date = new Date(`${dateKey}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === dateKey
  );
};

const areFriends = async (userId, friendId) => {
  const [userA, userB] = [userId, friendId].sort((a, b) =>
    a.toString().localeCompare(b.toString())
  );

  return Boolean(
    await Friend.exists({
      userA,
      userB,
      status: "accepted",
    })
  );
};

// Create a challenge.
export const createChallenge = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    metric,
    target,
    startDate,
    endDate,
  } = req.body;

  if (
    !title ||
    typeof title !== "string" ||
    title.trim().length < 3 ||
    title.trim().length > 80
  ) {
    throw new ApiError(400, "Title must contain 3–80 characters");
  }

  if (!["studyMinutes", "activeDays"].includes(metric)) {
    throw new ApiError(400, "Invalid challenge metric");
  }

  if (
    !Number.isInteger(target) ||
    target < 1 ||
    (metric === "activeDays" && target > 90) ||
    (metric === "studyMinutes" && target > 129600)
  ) {
    throw new ApiError(400, "Invalid challenge target");
  }

  if (!isValidDateKey(startDate) || !isValidDateKey(endDate)) {
    throw new ApiError(400, "Invalid challenge dates");
  }

  const today = getTodayKey();

  if (startDate < today) {
    throw new ApiError(400, "Challenge start date cannot be in the past");
  }

  if (endDate < startDate) {
    throw new ApiError(400, "End date must be after start date");
  }

  const duration =
    (new Date(`${endDate}T00:00:00.000Z`) -
      new Date(`${startDate}T00:00:00.000Z`)) /
    86400000 + 1;

  if (duration > 90) {
    throw new ApiError(400, "Challenge cannot exceed 90 days");
  }

  const challenge = await Challenge.create({
    title: title.trim(),
    description: description?.trim() || "",
    createdBy: req.user._id,
    metric,
    target,
    startDate,
    endDate,
    participants: [req.user._id],
  });

  return res.status(201).json(
    new ApiResponse(201, challenge, "Challenge created successfully")
  );
});

// Join a friend's challenge.
export const joinChallenge = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(400, "Invalid challenge ID");
  }

  const challenge = await Challenge.findById(id);

  if (!challenge) {
    throw new ApiError(404, "Challenge not found");
  }

  if (challenge.endDate < getTodayKey()) {
    throw new ApiError(400, "This challenge has already ended");
  }

  const userId = req.user._id;

  if (challenge.participants.some(
    (participant) => participant.toString() === userId.toString()
  )) {
    throw new ApiError(409, "You have already joined this challenge");
  }

  if (challenge.createdBy.toString() === userId.toString()) {
    throw new ApiError(409, "You created this challenge");
  }

  const friendshipExists = await areFriends(
    challenge.createdBy,
    userId
  );

  if (!friendshipExists) {
    throw new ApiError(
      403,
      "Only accepted friends of the creator can join this challenge"
    );
  }

  // Atomic membership update prevents duplicate participant entries.
  const updatedChallenge = await Challenge.findOneAndUpdate(
    {
      _id: id,
      endDate: { $gte: getTodayKey() },
      participants: { $ne: userId },
    },
    {
      $addToSet: { participants: userId },
    },
    { new: true }
  );

  if (!updatedChallenge) {
    throw new ApiError(409, "Unable to join this challenge");
  }

  return res.status(200).json(
    new ApiResponse(200, updatedChallenge, "Challenge joined successfully")
  );
});

// Calculate each participant's challenge progress.
const getChallengeProgress = async (challenge) => {
  const participants = challenge.participants.map((id) => id._id || id);

  const today = getTodayKey();
  const effectiveEndDate =
    challenge.endDate < today ? challenge.endDate : today;

  const activities = await Activity.aggregate([
    {
      $match: {
        userId: { $in: participants },
        dateKey: {
          $gte: challenge.startDate,
          $lte: effectiveEndDate,
        },
      },
    },
    {
      $group: {
        _id: "$userId",
        totalStudyMinutes: { $sum: "$studyMinutes" },
        activeDays: {
          $sum: {
            $cond: [{ $gt: ["$studyMinutes", 0] }, 1, 0],
          },
        },
      },
    },
  ]);

  const activityMap = new Map(
    activities.map((item) => [item._id.toString(), item])
  );

  return participants.map((participantId) => {
    const id = participantId.toString();
    const stats = activityMap.get(id);

    const progress =
      challenge.metric === "studyMinutes"
        ? stats?.totalStudyMinutes || 0
        : stats?.activeDays || 0;

    return {
      userId: id,
      progress,
      target: challenge.target,
      progressPercentage: Math.min(
        100,
        Math.round((progress / challenge.target) * 100)
      ),
      completed: progress >= challenge.target,
    };
  });
};

// Get challenges created by you or your accepted friends.
export const getChallenges = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const friendships = await Friend.find({
    status: "accepted",
    $or: [{ userA: userId }, { userB: userId }],
  }).select("userA userB -_id");

  const friendIds = friendships.map((friendship) =>
    friendship.userA.toString() === userId.toString()
      ? friendship.userB
      : friendship.userA
  );

  const challenges = await Challenge.find({
    createdBy: { $in: [userId, ...friendIds] },
    endDate: { $gte: addDays(getTodayKey(), -90) },
  })
    .populate("createdBy", "name goal")
    .populate("participants", "name goal")
    .sort({ createdAt: -1 });

  const results = await Promise.all(
    challenges.map(async (challenge) => ({
      ...challenge.toObject(),
      progress: await getChallengeProgress(challenge),
    }))
  );

  return res.status(200).json(
    new ApiResponse(200, results, "Challenges fetched successfully")
  );
});

// Get one challenge and its progress.
export const getChallengeById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(400, "Invalid challenge ID");
  }

  const challenge = await Challenge.findById(id)
    .populate("createdBy", "name goal")
    .populate("participants", "name goal");

  if (!challenge) {
    throw new ApiError(404, "Challenge not found");
  }

  const userId = req.user._id;

  const canView =
    challenge.createdBy._id.toString() === userId.toString() ||
    challenge.participants.some(
      (participant) => participant._id.toString() === userId.toString()
    ) ||
    await areFriends(challenge.createdBy._id, userId);

  if (!canView) {
    throw new ApiError(403, "You cannot view this challenge");
  }

  const progress = await getChallengeProgress(challenge);

  return res.status(200).json(
    new ApiResponse(
      200,
      { challenge, progress },
      "Challenge details fetched successfully"
    )
  );
});
