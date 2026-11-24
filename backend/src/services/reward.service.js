
import mongoose from "mongoose";

import { Task } from "../models/tasks.model.js";
import { QuestionLog } from "../models/questionLog.model.js";
import { UserReward } from "../models/userReward.model.js";
import { User } from "../models/users.model.js";
// All dates used for streaks and weekly calculations are based on IST.
const IST_OFFSET_MINUTES = 330;

const getISTDateKey = (date = new Date()) => {
  const istDate = new Date(
    date.getTime() + IST_OFFSET_MINUTES * 60 * 1000
  );

  return istDate.toISOString().slice(0, 10);
};

const dateKeyToUTC = (key) => new Date(`${key}T00:00:00.000Z`);

const addDays = (key, amount) => {
  const date = dateKeyToUTC(key);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
};

const getMonday = (key) => {
  const date = dateKeyToUTC(key);
  const day = date.getUTCDay();
  const difference = day === 0 ? -6 : 1 - day;

  date.setUTCDate(date.getUTCDate() + difference);

  return date.toISOString().slice(0, 10);
};

const sumMetrics = (logs, metricKey) =>
  logs.reduce(
    (sum, log) => sum + (Number(log.metrics?.[metricKey]) || 0),
    0
  );

const sumAllMetrics = (logs) =>
  logs.reduce((total, log) => {
    return (
      total +
      Object.values(log.metrics || {}).reduce(
        (sum, value) => sum + (Number(value) || 0),
        0
      )
    );
  }, 0);

const getProgress = async (userId) => {
  const [tasks, questionLogs] = await Promise.all([
    Task.find({ userId })
      .select("scheduledDate status durationMinutes completedAt")
      .lean(),

    QuestionLog.find({ userId })
      .select("date metrics")
      .lean(),
  ]);

  const completedTasks = tasks.filter(
    (task) => task.status === "completed"
  );

  const totalCompletedTasks = completedTasks.length;
  const totalQuestions = sumAllMetrics(questionLogs);

  const completedTaskDates = new Set(
    completedTasks.map((task) =>
      getISTDateKey(new Date(task.scheduledDate))
    )
  );

  const questionDates = new Set(
    questionLogs
      .filter((log) => sumAllMetrics([log]) > 0)
      .map((log) => getISTDateKey(new Date(log.date)))
  );

  const activeDates = new Set([
    ...completedTaskDates,
    ...questionDates,
  ]);

  let longestStreak = 0;
  let currentRun = 0;
  let previousDate = null;

  const sortedDates = [...activeDates].sort();

  for (const key of sortedDates) {
    if (previousDate && addDays(previousDate, 1) === key) {
      currentRun += 1;
    } else {
      currentRun = 1;
    }

    longestStreak = Math.max(longestStreak, currentRun);
    previousDate = key;
  }

  const today = getISTDateKey();
  const weekStart = getMonday(today);
  const nextWeek = addDays(weekStart, 7);

  const weeklyTasks = completedTasks.filter((task) => {
    const key = getISTDateKey(new Date(task.scheduledDate));
    return key >= weekStart && key < nextWeek;
  });

  const weeklyQuestions = questionLogs.filter((log) => {
    const key = getISTDateKey(new Date(log.date));
    return key >= weekStart && key < nextWeek;
  });

  const weeklyStudyMinutes = weeklyTasks.reduce(
    (sum, task) => sum + (Number(task.durationMinutes) || 0),
    0
  );

  const weeklyQuestionCount = sumAllMetrics(weeklyQuestions);

  const biologyQuestions = questionLogs.reduce(
    (sum, log) => sum + (Number(log.metrics?.biology) || 0),
    0
  );

  const physicsQuestions = questionLogs.reduce(
    (sum, log) => sum + (Number(log.metrics?.physics) || 0),
    0
  );

  const chemistryQuestions = questionLogs.reduce(
    (sum, log) => sum + (Number(log.metrics?.chemistry) || 0),
    0
  );

  const leetcodeQuestions = questionLogs.reduce(
    (sum, log) => sum + (Number(log.metrics?.leetcode) || 0),
    0
  );

  return {
    totalCompletedTasks,
    totalQuestions,
    longestStreak,
    weeklyStudyMinutes,
    weeklyQuestionCount,
    weeklyCompletedTasks: weeklyTasks.length,
    biologyQuestions,
    physicsQuestions,
    chemistryQuestions,
    leetcodeQuestions,
  };
};

const getBadgeDefinitions = (goal, progress) => {
  const badges = [
    {
      rewardKey: "first-task",
      label: "First Step",
      description: "Complete your first task.",
      xp: 20,
      condition: progress.totalCompletedTasks >= 1,
    },
    {
      rewardKey: "tasks-25",
      label: "Task Grinder",
      description: "Complete 25 tasks.",
      xp: 60,
      condition: progress.totalCompletedTasks >= 25,
    },
    {
      rewardKey: "questions-100",
      label: "Curious Mind",
      description: "Solve 100 questions.",
      xp: 50,
      condition: progress.totalQuestions >= 100,
    },
    {
      rewardKey: "questions-500",
      label: "Question Slayer",
      description: "Solve 500 questions.",
      xp: 120,
      condition: progress.totalQuestions >= 500,
    },
    {
      rewardKey: "streak-3",
      label: "Knight",
      description: "Reach a 3-day activity streak.",
      xp: 30,
      condition: progress.longestStreak >= 3,
      type: "rank",
    },
    {
      rewardKey: "streak-7",
      label: "Warrior",
      description: "Reach a 7-day activity streak.",
      xp: 80,
      condition: progress.longestStreak >= 7,
      type: "rank",
    },
    {
      rewardKey: "streak-14",
      label: "Elite Knight",
      description: "Reach a 14-day activity streak.",
      xp: 120,
      condition: progress.longestStreak >= 14,
      type: "rank",
    },
    {
      rewardKey: "streak-30",
      label: "Legend",
      description: "Reach a 30-day activity streak.",
      xp: 250,
      condition: progress.longestStreak >= 30,
      type: "rank",
    },
    {
      rewardKey: "streak-60",
      label: "Mythic",
      description: "Reach a 60-day activity streak.",
      xp: 500,
      condition: progress.longestStreak >= 60,
      type: "rank",
    },
    {
      rewardKey: "streak-100",
      label: "Immortal",
      description: "Reach a 100-day activity streak.",
      xp: 1000,
      condition: progress.longestStreak >= 100,
      type: "rank",
    },
    {
      rewardKey: "weekly-study-20",
      label: "Study Machine",
      description: "Complete 20 hours of study in a week.",
      xp: 100,
      condition: progress.weeklyStudyMinutes >= 20 * 60,
    },
    {
      rewardKey: "weekly-tasks-15",
      label: "Weekly Warrior",
      description: "Complete 15 tasks in a week.",
      xp: 100,
      condition: progress.weeklyCompletedTasks >= 15,
    },
  ];

  if (goal === "NEET") {
    badges.push(
      {
        rewardKey: "biology-500",
        label: "Biology Specialist",
        description: "Log 500 Biology questions.",
        xp: 100,
        condition: progress.biologyQuestions >= 500,
      },
      {
        rewardKey: "neet-questions-5000",
        label: "Science Champion",
        description: "Solve 5,000 questions.",
        xp: 300,
        condition: progress.totalQuestions >= 5000,
      }
    );
  }

  if (goal === "CSE") {
    badges.push(
      {
        rewardKey: "leetcode-100",
        label: "LeetCode Rookie",
        description: "Solve 100 LeetCode problems.",
        xp: 100,
        condition: progress.leetcodeQuestions >= 100,
      },
      {
        rewardKey: "leetcode-150",
        label: "LeetCode Grinder",
        description: "Solve 150 LeetCode problems.",
        xp: 150,
        condition: progress.leetcodeQuestions >= 150,
      },
      {
        rewardKey: "leetcode-500",
        label: "Problem Solver",
        description: "Solve 500 LeetCode problems.",
        xp: 250,
        condition: progress.leetcodeQuestions >= 500,
      },
      {
        rewardKey: "leetcode-1000",
        label: "Problem Master",
        description: "Solve 1,000 LeetCode problems.",
        xp: 500,
        condition: progress.leetcodeQuestions >= 1000,
      }
    );
  }

  return badges;
};

const saveRewardOnce = async (userId, reward) => {
  try {
    const result = await UserReward.updateOne(
      {
        userId,
        rewardKey: reward.rewardKey,
      },
      {
        $setOnInsert: {
          userId,
          rewardKey: reward.rewardKey,
          type: reward.type || "badge",
          label: reward.label,
          description: reward.description,
          xp: reward.xp,
          unlockedAt: new Date(),
          metadata: reward.metadata || {},
        },
      },
      { upsert: true }
    );

    return result.upsertedCount === 1;
  } catch (error) {
    // Concurrent requests may race to unlock the same reward.
    if (error.code === 11000) return false;
    throw error;
  }
};

export const evaluateAndUnlockRewards = async (userId, goal) => {
  if (!mongoose.isValidObjectId(userId)) {
    throw new Error("Invalid user ID while evaluating rewards.");
  }

  const progress = await getProgress(userId);
  const definitions = getBadgeDefinitions(goal, progress);

  const newlyUnlocked = [];

  for (const reward of definitions) {
    if (!reward.condition) continue;

    const inserted = await saveRewardOnce(userId, reward);

    if (inserted) {
      newlyUnlocked.push({
        rewardKey: reward.rewardKey,
        type: reward.type || "badge",
        label: reward.label,
        description: reward.description,
        xp: reward.xp,
      });
    }
  }

  return {
    progress,
    newlyUnlocked,
  };
};

export const getUserRewards = async (userId) => {
  return UserReward.find({ userId })
    .sort({ unlockedAt: -1 })
    .lean();
};

export const getUserRewardSummary = async (userId) => {
  const [rewards, aggregate] = await Promise.all([
    getUserRewards(userId),
    UserReward.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: null,
          totalXP: { $sum: "$xp" },
          totalRewards: { $sum: 1 },
        },
      },
    ]),
  ]);

  return {
    rewards,
    totalRewardXP: aggregate[0]?.totalXP || 0,
    totalUnlocked: aggregate[0]?.totalRewards || 0,
  };
};



// Add this export to the existing reward.service.js file.
export const evaluateRewardsForUser = async (userId) => {
  const user = await User.findById(userId).select("goal");

  if (!user) {
    throw new Error("User not found while evaluating rewards.");
  }

  return evaluateAndUnlockRewards(userId, user.goal);
};

