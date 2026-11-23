
import mongoose from "mongoose";

import {User} from "../models/users.model.js";
import {Friend} from "../models/friend.model.js";
import {Activity} from "../models/activity.model.js";

import {
  getTodayKey,
  getWeekRange,
  addDays,
  calculateCompetitionStats,
} from "../utils/competition.utils.js";

import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Weekly friends-only leaderboard.
export const getWeeklyLeaderboard = asyncHandler(async (req, res) => {
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

  const participantIds = [userId, ...friendIds];

  const users = await User.find({
    _id: { $in: participantIds },
  }).select("name goal");

  const { startDate, endDate } = getWeekRange();

  // Include earlier history so streak bonuses can be calculated correctly.
  const activities = await Activity.find({
    userId: { $in: participantIds },
    dateKey: { $lte: endDate },
  }).select("userId dateKey studyMinutes sessionsCount -_id");

  const activitiesByUser = new Map();

  for (const activity of activities) {
    const key = activity.userId.toString();

    if (!activitiesByUser.has(key)) {
      activitiesByUser.set(key, []);
    }

    activitiesByUser.get(key).push(activity);
  }

  const leaderboard = users.map((user) => {
    const userActivities =
      activitiesByUser.get(user._id.toString()) || [];

    const stats = calculateCompetitionStats(userActivities);

    const weeklyDailyStats = stats.dailyStats.filter(
      (item) => item.dateKey >= startDate && item.dateKey <= endDate
    );

    const weeklyPoints = weeklyDailyStats.reduce(
      (sum, item) => sum + item.points,
      0
    );

    const weeklyMinutes = weeklyDailyStats.reduce(
      (sum, item) => sum + item.studyMinutes,
      0
    );

    const weeklyActiveDays = weeklyDailyStats.filter(
      (item) => item.studyMinutes > 0
    ).length;

    return {
      userId: user._id,
      name: user.name,
      goal: user.goal,
      weeklyPoints,
      weeklyStudyMinutes: weeklyMinutes,
      weeklyStudyHours: Number((weeklyMinutes / 60).toFixed(1)),
      weeklyActiveDays,
      currentStreak: stats.currentStreak,
      isCurrentUser: user._id.toString() === userId.toString(),
    };
  });

  leaderboard.sort(
    (a, b) =>
      b.weeklyPoints - a.weeklyPoints ||
      b.weeklyStudyMinutes - a.weeklyStudyMinutes ||
      b.weeklyActiveDays - a.weeklyActiveDays
  );

  leaderboard.forEach((user, index) => {
    user.rank = index + 1;
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        period: { startDate, endDate },
        leaderboard,
      },
      "Weekly leaderboard fetched successfully"
    )
  );
});

// Achievement badge definitions.
const BADGES = [
  {
    id: "first-session",
    name: "First Step",
    description: "Record your first study session",
    type: "activeDays",
    target: 1,
    icon: "footprints",
  },
  {
    id: "ten-hours",
    name: "Getting Serious",
    description: "Study for 10 total hours",
    type: "studyMinutes",
    target: 600,
    icon: "book-open",
  },
  {
    id: "fifty-hours",
    name: "Dedicated Learner",
    description: "Study for 50 total hours",
    type: "studyMinutes",
    target: 3000,
    icon: "graduation-cap",
  },
  {
    id: "hundred-hours",
    name: "Study Machine",
    description: "Study for 100 total hours",
    type: "studyMinutes",
    target: 6000,
    icon: "trophy",
  },
  {
    id: "seven-day-streak",
    name: "Consistency",
    description: "Maintain a 7-day study streak",
    type: "longestStreak",
    target: 7,
    icon: "flame",
  },
  {
    id: "thirty-day-streak",
    name: "Unstoppable",
    description: "Maintain a 30-day study streak",
    type: "longestStreak",
    target: 30,
    icon: "crown",
  },
  {
    id: "thirty-active-days",
    name: "Regular",
    description: "Study on 30 different days",
    type: "activeDays",
    target: 30,
    icon: "calendar-check",
  },
];

// Get all badges and the user's progress.
export const getMyBadges = asyncHandler(async (req, res) => {
  const activities = await Activity.find({
    userId: req.user._id,
    dateKey: { $lte: getTodayKey() },
  }).select("dateKey studyMinutes -_id");

  const stats = calculateCompetitionStats(activities);

  const progressValues = {
    studyMinutes: stats.totalStudyMinutes,
    activeDays: stats.activeDays,
    longestStreak: stats.longestStreak,
  };

  const badges = BADGES.map((badge) => {
    const progress = Math.min(
      progressValues[badge.type],
      badge.target
    );

    const unlocked = progress >= badge.target;

    return {
      ...badge,
      progress,
      unlocked,
      progressPercentage: Math.round(
        (progress / badge.target) * 100
      ),
    };
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        totalBadges: badges.length,
        unlockedBadges: badges.filter((badge) => badge.unlocked).length,
        badges,
      },
      "Achievement badges fetched successfully"
    )
  );
});
