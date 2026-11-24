import { Task } from "../models/tasks.model.js";
import { User } from "../models/users.model.js";
import { DailyDuel } from "../models/dailyDuel.model.js";

import { ApiError } from "../utils/ApiError.js";

const TIME_ZONE = "Asia/Kolkata";

const DAILY_DUEL_START_DATE = process.env.DAILY_DUEL_START_DATE;

// Validate YYYY-MM-DD and reject impossible dates.
const isValidDateKey = (dateKey) => {
  if (
    typeof dateKey !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)
  ) {
    return false;
  }

  const date = new Date(`${dateKey}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === dateKey
  );
};

// Validate launch configuration when the service loads.
if (!isValidDateKey(DAILY_DUEL_START_DATE)) {
  throw new Error(
    "Invalid or missing DAILY_DUEL_START_DATE in backend environment variables. Use YYYY-MM-DD."
  );
}

// Get today's date in India.
export const getTodayKey = () => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const values = Object.fromEntries(
    parts.map(({ type, value }) => [type, value])
  );

  return `${values.year}-${values.month}-${values.day}`;
};

// Ensure the requested date belongs to the official competition period.
const validateCompetitionDate = (dateKey) => {
  if (!isValidDateKey(dateKey)) {
    throw new ApiError(400, "Invalid date. Use YYYY-MM-DD");
  }

  if (dateKey < DAILY_DUEL_START_DATE) {
    throw new ApiError(
      400,
      `Daily Duel started on ${DAILY_DUEL_START_DATE}. Earlier dates are unavailable.`
    );
  }

  if (dateKey > getTodayKey()) {
    throw new ApiError(400, "Future dates are not allowed");
  }
};

// Date-only task values are stored at UTC midnight.
const getScheduledDateBounds = (dateKey) => {
  const start = new Date(`${dateKey}T00:00:00.000Z`);
  const end = new Date(start);

  end.setUTCDate(end.getUTCDate() + 1);

  return { start, end };
};

// Completion timestamps are real timestamps, so use IST boundaries.
const getISTDayBounds = (dateKey) => {
  const start = new Date(`${dateKey}T00:00:00+05:30`);

  const end = new Date(
    start.getTime() + 24 * 60 * 60 * 1000
  );

  return { start, end };
};

// Get task completion statistics for every user on a particular date.
const getTaskStats = async (dateKey) => {
  const scheduled = getScheduledDateBounds(dateKey);
  const ist = getISTDayBounds(dateKey);

  const result = await Task.aggregate([
    {
      $match: {
        scheduledDate: {
          $gte: scheduled.start,
          $lt: scheduled.end,
        },
      },
    },
    {
      $group: {
        _id: "$userId",

        totalTasks: {
          $sum: 1,
        },

        completedTasks: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ["$status", "completed"] },
                  { $gte: ["$completedAt", ist.start] },
                  { $lt: ["$completedAt", ist.end] },
                ],
              },
              1,
              0,
            ],
          },
        },

        studyMinutes: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ["$status", "completed"] },
                  { $gte: ["$completedAt", ist.start] },
                  { $lt: ["$completedAt", ist.end] },
                ],
              },
              "$durationMinutes",
              0,
            ],
          },
        },
      },
    },
  ]);

  return new Map(
    result.map((item) => [
      item._id.toString(),
      {
        totalTasks: item.totalTasks,
        completedTasks: item.completedTasks,
        studyMinutes: item.studyMinutes,
      },
    ])
  );
};

/**
 * Finalizes one closed IST date.
 *
 * - Only dates from the official launch date are allowed.
 * - Today's and future dates cannot be finalized.
 * - Existing snapshots are never overwritten.
 * - Safe to run repeatedly.
 */
export const finalizeDailyDuel = async (dateKey) => {
  validateCompetitionDate(dateKey);

  const todayKey = getTodayKey();

  if (dateKey >= todayKey) {
    throw new ApiError(
      400,
      "Only completed days can be finalized"
    );
  }

  const [users, taskStats] = await Promise.all([
    User.find({}, { _id: 1 }).lean(),
    getTaskStats(dateKey),
  ]);

  const finalizedAt = new Date();

  const operations = users.map((user) => {
    const userId = user._id.toString();

    const taskData = taskStats.get(userId) || {
      totalTasks: 0,
      completedTasks: 0,
      studyMinutes: 0,
    };

    const totalTasks = taskData.totalTasks;
    const completedTasks = taskData.completedTasks;

    const completionRate =
      totalTasks > 0
        ? Number(
            ((completedTasks / totalTasks) * 100).toFixed(2)
          )
        : 0;

    return {
      updateOne: {
        filter: {
          userId: user._id,
          dateKey,
        },

        update: {
          $setOnInsert: {
            userId: user._id,
            dateKey,
            studyMinutes: taskData.studyMinutes,
            totalTasks,
            completedTasks,
            completionRate,
            finalizedAt,
          },
        },

        upsert: true,
      },
    };
  });

  if (operations.length > 0) {
    try {
      await DailyDuel.bulkWrite(operations, {
        ordered: false,
      });
    } catch (error) {
      const writeErrors = error.writeErrors || [];

      const onlyDuplicateKeyErrors =
        error.code === 11000 ||
        (
          writeErrors.length > 0 &&
          writeErrors.every(
            (writeError) => writeError.code === 11000
          )
        );

      if (!onlyDuplicateKeyErrors) {
        throw error;
      }
    }
  }

  return {
    dateKey,
    finalizedUsers: users.length,
  };
};

/**
 * Today's numbers are live because today has not closed.
 * Previous dates must come from finalized snapshots.
 */
export const getDailyDuelStats = async (userId, dateKey) => {
  validateCompetitionDate(dateKey);

  const todayKey = getTodayKey();

  // Previous dates must use finalized snapshots.
  if (dateKey < todayKey) {
    await finalizeDailyDuel(dateKey);

    const snapshot = await DailyDuel.findOne({
      userId,
      dateKey,
    }).lean();

    return (
      snapshot || {
        dateKey,
        studyMinutes: 0,
        totalTasks: 0,
        completedTasks: 0,
        completionRate: 0,
      }
    );
  }

  // Today's statistics are calculated live.
  const taskStats = await getTaskStats(dateKey);

  const stats = taskStats.get(userId.toString()) || {
    studyMinutes: 0,
    totalTasks: 0,
    completedTasks: 0,
  };

  const { totalTasks, completedTasks, studyMinutes } = stats;

  return {
    dateKey,
    studyMinutes,
    totalTasks,
    completedTasks,

    completionRate:
      totalTasks > 0
        ? Number(
            ((completedTasks / totalTasks) * 100).toFixed(2)
          )
        : 0,
  };
};
