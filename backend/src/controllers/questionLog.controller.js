import { QuestionLog } from "../models/questionLog.model.js";
import {User} from "../models/users.model.js";
import { TRACKER_CONFIG } from "../config/questionTracker.js";

import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Validate date and return UTC midnight.
const parseDate = (value) => {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    throw new ApiError(400, "Invalid date format");
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    throw new ApiError(400, "Invalid date");
  }

  return date;
};

// Get authenticated user's goal.
const getUserGoal = async (userId) => {
  const user = await User.findById(userId).select("goal");

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return user.goal;
};

// Validate submitted metrics against registration goal.
const validateMetrics = (goal, metrics) => {
  if (
    !metrics ||
    typeof metrics !== "object" ||
    Array.isArray(metrics)
  ) {
    throw new ApiError(400, "Metrics must be an object");
  }

  const allowedKeys = TRACKER_CONFIG[goal]?.map(
    (item) => item.key
  );

  if (!allowedKeys) {
    throw new ApiError(400, "Invalid user goal");
  }

  const submittedKeys = Object.keys(metrics);

  if (submittedKeys.length === 0) {
    throw new ApiError(400, "At least one metric is required");
  }

  for (const key of submittedKeys) {
    if (!allowedKeys.includes(key)) {
      throw new ApiError(
        400,
        `Metric '${key}' is not allowed for ${goal}`
      );
    }

    if (
      !Number.isInteger(metrics[key]) ||
      metrics[key] < 0
    ) {
      throw new ApiError(
        400,
        `Metric '${key}' must be a non-negative integer`
      );
    }
  }
};

// Get Monday-to-Monday UTC range.
const getWeekRange = () => {
  const now = new Date();

  const start = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate()
    )
  );

  const daysSinceMonday = (start.getUTCDay() + 6) % 7;
  start.setUTCDate(start.getUTCDate() - daysSinceMonday);

  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 7);

  return { start, end };
};

// 1. Create or update daily tracker metrics.
const createQuestionLog = asyncHandler(async (req, res) => {
  const { date, metrics } = req.body;

  if (!date || !metrics) {
    throw new ApiError(400, "Date and metrics are required");
  }

  const logDate = parseDate(date);
  const goal = await getUserGoal(req.user._id);

  validateMetrics(goal, metrics);

  const log = await QuestionLog.findOneAndUpdate(
    {
      userId: req.user._id,
      date: logDate,
    },
    {
      $set: {
        metrics,
      },
      $setOnInsert: {
        userId: req.user._id,
        goal,
        date: logDate,
      },
    },
    {
      new: true,
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    }
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, log, "Daily tracker updated successfully")
    );
});

// 2. Get all daily tracker records.
const getQuestionLogs = asyncHandler(async (req, res) => {
  const filter = {
    userId: req.user._id,
  };

  if (req.query.date) {
    const date = parseDate(req.query.date);
    const nextDate = new Date(date);
    nextDate.setUTCDate(nextDate.getUTCDate() + 1);

    filter.date = { $gte: date, $lt: nextDate };
  }

  if (req.query.startDate || req.query.endDate) {
    if (req.query.date) {
      throw new ApiError(400, "Use either date or date range");
    }

    const range = {};

    if (req.query.startDate) {
      range.$gte = parseDate(req.query.startDate);
    }

    if (req.query.endDate) {
      const endDate = parseDate(req.query.endDate);
      endDate.setUTCDate(endDate.getUTCDate() + 1);
      range.$lt = endDate;
    }

    if (range.$gte && range.$lt && range.$gte >= range.$lt) {
      throw new ApiError(400, "Invalid date range");
    }

    filter.date = range;
  }

  const logs = await QuestionLog.find(filter).sort({
    date: -1,
  });

  return res
    .status(200)
    .json(
      new ApiResponse(200, logs, "Tracker history fetched successfully")
    );
});

// 3. Get a specific daily record.
const getQuestionLogById = asyncHandler(async (req, res) => {
  const log = await QuestionLog.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });

  if (!log) {
    throw new ApiError(404, "Tracker record not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, log, "Tracker record fetched successfully"));
});

// 4. Delete a daily record.
const deleteQuestionLog = asyncHandler(async (req, res) => {
  const log = await QuestionLog.findOneAndDelete({
    _id: req.params.id,
    userId: req.user._id,
  });

  if (!log) {
    throw new ApiError(404, "Tracker record not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, log, "Tracker record deleted successfully"));
});

// 5. Get daily metrics and goal configuration.
const getDailySummary = asyncHandler(async (req, res) => {
  const goal = await getUserGoal(req.user._id);

  const date = req.query.date
    ? parseDate(req.query.date)
    : (() => {
        const now = new Date();
        return new Date(
          Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate()
          )
        );
      })();

  const log = await QuestionLog.findOne({
    userId: req.user._id,
    date,
  });

  const metrics = Object.fromEntries(
    (log?.metrics ?? new Map()).entries()
  );

  const subjects = TRACKER_CONFIG[goal].map((item) => ({
    ...item,
    value: metrics[item.key] ?? 0,
  }));

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {
          goal,
          date,
          subjects,
          total: subjects.reduce(
            (sum, item) => sum + item.value,
            0
          ),
        },
        "Daily summary fetched successfully"
      )
    );
});

// 6. Get weekly totals for each metric.
const getWeeklySummary = asyncHandler(async (req, res) => {
  const goal = await getUserGoal(req.user._id);
  const { start, end } = getWeekRange();

  const logs = await QuestionLog.find({
    userId: req.user._id,
    date: { $gte: start, $lt: end },
  });

  const totals = Object.fromEntries(
    TRACKER_CONFIG[goal].map((item) => [item.key, 0])
  );

  for (const log of logs) {
    for (const [key, value] of log.metrics.entries()) {
      if (key in totals) {
        totals[key] += value;
      }
    }
  }

  const subjects = TRACKER_CONFIG[goal].map((item) => ({
    ...item,
    total: totals[item.key],
  }));

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {
          goal,
          weekStart: start,
          weekEnd: end,
          subjects,
          total: subjects.reduce(
            (sum, item) => sum + item.total,
            0
          ),
        },
        "Weekly summary fetched successfully"
      )
    );
});

// 7. Get available tracker metrics for the registered goal.
const getTrackerConfig = asyncHandler(async (req, res) => {
  const goal = await getUserGoal(req.user._id);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {
          goal,
          metrics: TRACKER_CONFIG[goal],
        },
        "Tracker configuration fetched successfully"
      )
    );
});

export {
  createQuestionLog,
  getQuestionLogs,
  getQuestionLogById,
  deleteQuestionLog,
  getDailySummary,
  getWeeklySummary,
  getTrackerConfig,
};
