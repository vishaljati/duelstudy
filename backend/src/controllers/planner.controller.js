
import { Task } from "../models/tasks.model.js";
import { User } from "../models/users.model.js";

import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { evaluateRewardsForUser } from "../services/reward.service.js";

const TIME_ZONE = "Asia/Kolkata";

// Safely evaluate rewards without failing an already successful task operation.
const safelyEvaluateRewards = async (userId) => {
  try {
    await evaluateRewardsForUser(userId);
  } catch (error) {
    console.error("Reward evaluation failed:", {
      userId: userId.toString(),
      message: error.message,
    });
  }
};

const getTodayKey = () => {
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

const isValidDate = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
};

// scheduledDate is stored as UTC midnight, so ISO conversion is intentional.
const getTaskDateKey = (scheduledDate) => {
  return scheduledDate.toISOString().slice(0, 10);
};

const getWeekRange = (weekStart) => {
  const anchor = new Date(`${weekStart}T00:00:00.000Z`);

  const start = new Date(anchor);
  const daysSinceMonday = (start.getUTCDay() + 6) % 7;

  start.setUTCDate(start.getUTCDate() - daysSinceMonday);

  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 7);

  return { start, end };
};

// 1. CREATE TASK
const createTask = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    subject,
    scheduledDate,
    scheduledTime,
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

  if (scheduledDate < getTodayKey()) {
    throw new ApiError(400, "Tasks cannot be scheduled in the past");
  }

  const task = await Task.create({
    userId: req.user._id,
    title,
    description,
    subject,
    scheduledDate: new Date(`${scheduledDate}T00:00:00.000Z`),
    scheduledTime: scheduledTime || null,
    durationMinutes,
    priority,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, task, "Task created successfully"));
});

// 2. GET TASKS
const getTasks = asyncHandler(async (req, res) => {
  const filter = {
    userId: req.user._id,
  };

  const { date, startDate, endDate, status } = req.query;

  if (date && (startDate || endDate)) {
    throw new ApiError(
      400,
      "Use either date or startDate/endDate filters, not both"
    );
  }

  if (date) {
    if (!isValidDate(date)) {
      throw new ApiError(400, "Invalid date filter");
    }

    const start = new Date(`${date}T00:00:00.000Z`);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);

    filter.scheduledDate = { $gte: start, $lt: end };
  }

  if (startDate || endDate) {
    if (!startDate || !endDate) {
      throw new ApiError(
        400,
        "Both startDate and endDate are required"
      );
    }

    if (!isValidDate(startDate) || !isValidDate(endDate)) {
      throw new ApiError(400, "Invalid date range");
    }

    const start = new Date(`${startDate}T00:00:00.000Z`);
    const end = new Date(`${endDate}T00:00:00.000Z`);

    if (start >= end) {
      throw new ApiError(400, "endDate must be after startDate");
    }

    filter.scheduledDate = { $gte: start, $lt: end };
  }

  if (status) {
    if (!["planned", "completed"].includes(status)) {
      throw new ApiError(400, "Invalid task status");
    }

    filter.status = status;
  }

  const tasks = await Task.find(filter).sort({
    scheduledDate: 1,
    scheduledTime: 1,
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
    "scheduledTime",
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

  const existingTask = await Task.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });

  if (!existingTask) {
    throw new ApiError(404, "Task not found");
  }

  const today = getTodayKey();
  const existingDateKey = getTaskDateKey(existingTask.scheduledDate);

  if (existingDateKey < today) {
    throw new ApiError(400, "Past tasks cannot be modified");
  }

  if (updates.scheduledDate !== undefined) {
    if (!isValidDate(updates.scheduledDate)) {
      throw new ApiError(400, "Invalid scheduled date");
    }

    if (updates.scheduledDate < today) {
      throw new ApiError(400, "Tasks cannot be moved to a past date");
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
    { $set: updates },
    {
      new: true,
      runValidators: true,
    }
  );

  if (!task) {
    throw new ApiError(404, "Task not found");
  }

  // Re-evaluate if a completed task's details were changed.
  if (task.status === "completed") {
    await safelyEvaluateRewards(req.user._id);
  }

  return res
    .status(200)
    .json(new ApiResponse(200, task, "Task updated successfully"));
});

// 5. UPDATE TASK STATUS
const updateTaskStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  if (!["planned", "completed"].includes(status)) {
    throw new ApiError(400, "Status must be planned or completed");
  }

  const existingTask = await Task.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });

  if (!existingTask) {
    throw new ApiError(404, "Task not found");
  }

  const today = getTodayKey();
  const taskDateKey = getTaskDateKey(existingTask.scheduledDate);

  if (taskDateKey < today) {
    throw new ApiError(400, "Past tasks cannot be modified");
  }

  if (status === "completed" && taskDateKey !== today) {
    throw new ApiError(
      400,
      "A task can only be completed on its scheduled date"
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

  // Award newly earned rewards after successful task completion.
  if (status === "completed") {
    await safelyEvaluateRewards(req.user._id);
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
  const existingTask = await Task.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });

  if (!existingTask) {
    throw new ApiError(404, "Task not found");
  }

  const taskDateKey = getTaskDateKey(existingTask.scheduledDate);

  if (taskDateKey < getTodayKey()) {
    throw new ApiError(400, "Past tasks cannot be deleted");
  }

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

  const requestedWeek = req.query.weekStart || getTodayKey();

  if (!isValidDate(requestedWeek)) {
    throw new ApiError(400, "Invalid weekStart date");
  }

  const { start, end } = getWeekRange(requestedWeek);

  const [plannedResult, completedResult] = await Promise.all([
    Task.aggregate([
      {
        $match: {
          userId: user._id,
          scheduledDate: { $gte: start, $lt: end },
        },
      },
      {
        $group: {
          _id: null,
          plannedMinutes: { $sum: "$durationMinutes" },
        },
      },
    ]),
    Task.aggregate([
      {
        $match: {
          userId: user._id,
          status: "completed",
          completedAt: { $gte: start, $lt: end },
        },
      },
      {
        $group: {
          _id: null,
          completedMinutes: { $sum: "$durationMinutes" },
          completedTasks: { $sum: 1 },
        },
      },
    ]),
  ]);

  const plannedMinutes = plannedResult[0]?.plannedMinutes || 0;
  const completedMinutes = completedResult[0]?.completedMinutes || 0;
  const completedTasks = completedResult[0]?.completedTasks || 0;

  const weeklyTargetHours = user.weeklyTargetHours;
  const targetMinutes = weeklyTargetHours * 60;

  const progress = {
    weeklyTargetHours,
    targetMinutes,
    plannedMinutes,
    completedMinutes,
    completedHours: Number((completedMinutes / 60).toFixed(2)),
    completedTasks,
    remainingMinutes: Math.max(targetMinutes - completedMinutes, 0),
    progressPercentage: Math.min(
      Math.round((completedMinutes / targetMinutes) * 100),
      100
    ),
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
    { $set: { weeklyTargetHours } },
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
