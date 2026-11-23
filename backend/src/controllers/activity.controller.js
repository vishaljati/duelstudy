
import {Activity} from "../models/activity.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const TIME_ZONE = "Asia/Kolkata";

// Get today's date in India.
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

// Validate YYYY-MM-DD and reject impossible dates.
const isValidDateKey = (dateKey) => {
  if (typeof dateKey !== "string") return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return false;

  const date = new Date(`${dateKey}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === dateKey
  );
};

const addDays = (dateKey, amount) => {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
};

const getActivityLevel = (minutes) => {
  if (minutes === 0) return 0;
  if (minutes <= 30) return 1;
  if (minutes <= 60) return 2;
  if (minutes <= 120) return 3;
  return 4;
};

// Record a study session.
export const logActivity = asyncHandler(async (req, res) => {
  const { minutes, date } = req.body;

  const dateKey = date || getTodayKey();

  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 1440) {
    throw new ApiError(
      400,
      "Study minutes must be an integer between 1 and 1440"
    );
  }

  if (!isValidDateKey(dateKey)) {
    throw new ApiError(400, "Invalid date. Use YYYY-MM-DD");
  }

  if (dateKey > getTodayKey()) {
    throw new ApiError(400, "Future activity cannot be recorded");
  }

  const filter = {
    userId: req.user._id,
    dateKey,
  };

  let activity;

  try {
    activity = await Activity.findOneAndUpdate(
      filter,
      {
        $inc: {
          studyMinutes: minutes,
          sessionsCount: 1,
        },
        $setOnInsert: filter,
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );
  } catch (error) {
    // Handle concurrent first-time upserts for the same day.
    if (error.code !== 11000) throw error;

    activity = await Activity.findOneAndUpdate(
      filter,
      {
        $inc: {
          studyMinutes: minutes,
          sessionsCount: 1,
        },
      },
      { new: true, runValidators: true }
    );
  }

  return res.status(200).json(
    new ApiResponse(200, activity, "Study activity recorded successfully")
  );
});

// Get today's activity.
export const getTodayActivity = asyncHandler(async (req, res) => {
  const today = getTodayKey();

  const activity = await Activity.findOne({
    userId: req.user._id,
    dateKey: today,
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        date: today,
        studyMinutes: activity?.studyMinutes || 0,
        sessionsCount: activity?.sessionsCount || 0,
        isActive: Boolean(activity),
      },
      "Today's activity fetched successfully"
    )
  );
});

// Get activity calendar for a particular month.
export const getActivityCalendar = asyncHandler(async (req, res) => {
  const year = Number(req.query.year);
  const month = Number(req.query.month);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    year < 2000 ||
    year > 9999 ||
    month < 1 ||
    month > 12
  ) {
    throw new ApiError(400, "Provide a valid year and month");
  }

  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;

  const nextMonth = new Date(Date.UTC(year, month, 1));
  const endDate = nextMonth.toISOString().slice(0, 10);

  const activities = await Activity.find({
    userId: req.user._id,
    dateKey: {
      $gte: startDate,
      $lt: endDate,
    },
  }).select("dateKey studyMinutes sessionsCount -_id");

  const activityMap = new Map(
    activities.map((item) => [item.dateKey, item])
  );

  const totalDays = new Date(Date.UTC(year, month, 0)).getUTCDate();

  const days = Array.from({ length: totalDays }, (_, index) => {
    const dateKey = `${year}-${String(month).padStart(2, "0")}-${String(
      index + 1
    ).padStart(2, "0")}`;

    const activity = activityMap.get(dateKey);
    const minutes = activity?.studyMinutes || 0;

    return {
      date: dateKey,
      studyMinutes: minutes,
      sessionsCount: activity?.sessionsCount || 0,
      isActive: minutes > 0,
      level: getActivityLevel(minutes),
    };
  });

  const totalStudyMinutes = days.reduce(
    (sum, day) => sum + day.studyMinutes,
    0
  );

  const activeDays = days.filter((day) => day.isActive).length;

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        year,
        month,
        totalStudyMinutes,
        activeDays,
        days,
      },
      "Activity calendar fetched successfully"
    )
  );
});

// Get current streak and longest streak.
export const getActivityStreak = asyncHandler(async (req, res) => {
  const today = getTodayKey();

  const activities = await Activity.find({
    userId: req.user._id,
    dateKey: { $lte: today },
    studyMinutes: { $gt: 0 },
  })
    .select("dateKey -_id")
    .sort({ dateKey: 1 });

  const activeDates = [...new Set(
    activities.map((item) => item.dateKey)
  )];

  const activeSet = new Set(activeDates);

  // Current streak includes today if active.
  // Otherwise, it continues from yesterday if yesterday was active.
  let currentStreak = 0;
  let currentDate = activeSet.has(today) ? today : addDays(today, -1);

  while (activeSet.has(currentDate)) {
    currentStreak++;
    currentDate = addDays(currentDate, -1);
  }

  // Calculate longest streak across all recorded dates.
  let longestStreak = 0;
  let runningStreak = 0;
  let previousDate = null;

  for (const dateKey of activeDates) {
    if (previousDate && addDays(previousDate, 1) === dateKey) {
      runningStreak++;
    } else {
      runningStreak = 1;
    }

    longestStreak = Math.max(longestStreak, runningStreak);
    previousDate = dateKey;
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        currentStreak,
        longestStreak,
        totalActiveDays: activeDates.length,
        lastActiveDate: activeDates.at(-1) || null,
        isActiveToday: activeSet.has(today),
      },
      "Activity streak fetched successfully"
    )
  );
});
