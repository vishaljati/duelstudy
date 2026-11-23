
import { Task } from "../models/tasks.model.js";
import { User } from "../models/users.model.js";

import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Helper: Get current week's UTC date range (Monday to Monday)
const getWeekRange = () => {
  const now = new Date();

  const start = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate()
    )
  );

  const day = start.getUTCDay();
  const daysSinceMonday = (day + 6) % 7;

  start.setUTCDate(start.getUTCDate() - daysSinceMonday);

  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 7);

  return { start, end };
};

// Helper: Validate YYYY-MM-DD date
const isValidDate = (value) => {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
};

// 1. CREATE TASK
const createTask = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    subject,
    scheduledDate,
    durationMinutes,
    priority,
  } = req.body;

  if (!title || !scheduledDate || durationMinutes === undefined) {
    throw new ApiError(
      400,
      "Title, scheduled date and duration are required"
    );
  }

  if (!isValidDate(scheduledDate)) {
    throw new ApiError(400, "Invalid scheduled date");
  }

  const task = await Task.create({
    userId: req.user._id,
    title,
    description,
    subject,
    scheduledDate: new Date(`${scheduledDate}T00:00:00.000Z`),
    durationMinutes,
    priority,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, task, "Task created successfully"));
});

// 2. GET ALL TASKS
const getTasks = asyncHandler(async (req, res) => {
  const filter = {
    userId: req.user._id,
  };

  // Optional date filter
  if (req.query.date) {
    if (!isValidDate(req.query.date)) {
      throw new ApiError(400, "Invalid date filter");
    }

    const date = new Date(`${req.query.date}T00:00:00.000Z`);

    const nextDate = new Date(date);
    nextDate.setUTCDate(nextDate.getUTCDate() + 1);

    filter.scheduledDate = {
      $gte: date,
      $lt: nextDate,
    };
  }

  // Optional status filter
  if (req.query.status) {
    if (!["planned", "completed"].includes(req.query.status)) {
      throw new ApiError(400, "Invalid task status");
    }

    filter.status = req.query.status;
  }

  const tasks = await Task.find(filter).sort({
    scheduledDate: 1,
    createdAt: -1,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, tasks, "Tasks fetched successfully"));
});

// 3. GET SINGLE TASK
const getTaskById = asyncHandler(async (req, res) => {
  const task = await Task.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });

  if (!task) {
    throw new ApiError(404, "Task not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, task, "Task fetched successfully"));
});

// 4. UPDATE TASK
const updateTask = asyncHandler(async (req, res) => {
  const allowedFields = [
    "title",
    "description",
    "subject",
    "scheduledDate",
    "durationMinutes",
    "priority",
  ];

  const updates = {};

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    throw new ApiError(400, "No valid fields provided for update");
  }

  if (updates.scheduledDate !== undefined) {
    if (!isValidDate(updates.scheduledDate)) {
      throw new ApiError(400, "Invalid scheduled date");
    }

    updates.scheduledDate = new Date(
      `${updates.scheduledDate}T00:00:00.000Z`
    );
  }

  const task = await Task.findOneAndUpdate(
    {
      _id: req.params.id,
      userId: req.user._id,
    },
    {
      $set: updates,
    },
    {
      new: true,
      runValidators: true,
    }
  );

  if (!task) {
    throw new ApiError(404, "Task not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, task, "Task updated successfully"));
});

// 5. COMPLETE / REOPEN TASK
const updateTaskStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  if (!["planned", "completed"].includes(status)) {
    throw new ApiError(
      400,
      "Status must be planned or completed"
    );
  }

  const task = await Task.findOneAndUpdate(
    {
      _id: req.params.id,
      userId: req.user._id,
    },
    {
      $set: {
        status,
        completedAt: status === "completed" ? new Date() : null,
      },
    },
    {
      new: true,
      runValidators: true,
    }
  );

  if (!task) {
    throw new ApiError(404, "Task not found");
  }

  const message =
    status === "completed"
      ? "Task completed successfully"
      : "Task moved back to planned";

  return res
    .status(200)
    .json(new ApiResponse(200, task, message));
});

// 6. DELETE TASK
const deleteTask = asyncHandler(async (req, res) => {
  const task = await Task.findOneAndDelete({
    _id: req.params.id,
    userId: req.user._id,
  });

  if (!task) {
    throw new ApiError(404, "Task not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, task, "Task deleted successfully"));
});

// 7. GET WEEKLY PROGRESS
const getWeeklyProgress = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select(
    "weeklyTargetHours"
  );

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const { start, end } = getWeekRange();

  const result = await Task.aggregate([
    {
      $match: {
        userId: user._id,
        status: "completed",
        completedAt: {
          $gte: start,
          $lt: end,
        },
      },
    },
    {
      $group: {
        _id: null,
        completedMinutes: {
          $sum: "$durationMinutes",
        },
        completedTasks: {
          $sum: 1,
        },
      },
    },
  ]);

  const completedMinutes = result[0]?.completedMinutes || 0;
  const completedTasks = result[0]?.completedTasks || 0;

  const targetMinutes = user.weeklyTargetHours * 60;

  const progressPercentage = Math.min(
    Math.round((completedMinutes / targetMinutes) * 100),
    100
  );

  const progress = {
    weeklyTargetHours: user.weeklyTargetHours,
    targetMinutes,
    completedMinutes,
    completedHours: Number((completedMinutes / 60).toFixed(2)),
    completedTasks,
    remainingMinutes: Math.max(
      targetMinutes - completedMinutes,
      0
    ),
    progressPercentage,
    weekStart: start,
    weekEnd: end,
  };

  return res
    .status(200)
    .json(
      new ApiResponse(200, progress, "Weekly progress fetched successfully")
    );
});

// 8. UPDATE WEEKLY TARGET
const updateWeeklyTarget = asyncHandler(async (req, res) => {
  const { weeklyTargetHours } = req.body;

  if (
    !Number.isInteger(weeklyTargetHours) ||
    weeklyTargetHours < 1 ||
    weeklyTargetHours > 168
  ) {
    throw new ApiError(
      400,
      "Weekly target must be an integer between 1 and 168 hours"
    );
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: { weeklyTargetHours },
    },
    {
      new: true,
      runValidators: true,
    }
  ).select("weeklyTargetHours");

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { weeklyTargetHours: user.weeklyTargetHours },
        "Weekly target updated successfully"
      )
    );
});

export {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  updateTaskStatus,
  deleteTask,
  getWeeklyProgress,
  updateWeeklyTarget,
};
