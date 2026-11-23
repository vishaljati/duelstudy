
import Timetable from "../models/timetable.model.js";

import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

// Validate timetable input.
const validateSlot = (data) => {
  const { title, day, startTime, endTime } = data;

  if (!title || !day || !startTime || !endTime) {
    throw new ApiError(
      400,
      "Title, day, start time and end time are required"
    );
  }

  if (typeof title !== "string" || title.trim().length < 2) {
    throw new ApiError(400, "Title must contain at least 2 characters");
  }

  if (!DAYS.includes(day)) {
    throw new ApiError(400, "Invalid timetable day");
  }

  if (
    !TIME_REGEX.test(startTime) ||
    !TIME_REGEX.test(endTime)
  ) {
    throw new ApiError(
      400,
      "Time must be in HH:mm 24-hour format"
    );
  }

  // HH:mm strings can be compared lexicographically.
  if (startTime >= endTime) {
    throw new ApiError(
      400,
      "End time must be later than start time"
    );
  }
};

// Check whether another slot overlaps on the same day.
const checkOverlap = async ({
  userId,
  day,
  startTime,
  endTime,
  excludeId,
}) => {
  const filter = {
    userId,
    day,
    startTime: { $lt: endTime },
    endTime: { $gt: startTime },
  };

  if (excludeId) {
    filter._id = { $ne: excludeId };
  }

  const overlappingSlot = await Timetable.findOne(filter);

  if (overlappingSlot) {
    throw new ApiError(
      409,
      `This time slot overlaps with "${overlappingSlot.title}"`
    );
  }
};

// 1. Create a new timetable slot.
const createTimetable = asyncHandler(async (req, res) => {
  const {
    title,
    subject,
    day,
    startTime,
    endTime,
    description,
  } = req.body;

  validateSlot({ title, day, startTime, endTime });

  await checkOverlap({
    userId: req.user._id,
    day,
    startTime,
    endTime,
  });

  const slot = await Timetable.create({
    userId: req.user._id,
    title: title.trim(),
    subject,
    day,
    startTime,
    endTime,
    description,
  });

  return res
    .status(201)
    .json(
      new ApiResponse(201, slot, "Timetable slot created successfully")
    );
});

// 2. Get the complete weekly timetable.
const getTimetable = asyncHandler(async (req, res) => {
  const slots = await Timetable.find({
    userId: req.user._id,
  }).sort({
    day: 1,
    startTime: 1,
  });

  return res
    .status(200)
    .json(
      new ApiResponse(200, slots, "Timetable fetched successfully")
    );
});

// 3. Get a specific timetable slot.
const getTimetableById = asyncHandler(async (req, res) => {
  const slot = await Timetable.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });

  if (!slot) {
    throw new ApiError(404, "Timetable slot not found");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, slot, "Timetable slot fetched successfully")
    );
});

// 4. Update an existing timetable slot.
const updateTimetable = asyncHandler(async (req, res) => {
  const allowedFields = [
    "title",
    "subject",
    "day",
    "startTime",
    "endTime",
    "description",
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

  const slot = await Timetable.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });

  if (!slot) {
    throw new ApiError(404, "Timetable slot not found");
  }

  const nextSlot = {
    title: updates.title ?? slot.title,
    day: updates.day ?? slot.day,
    startTime: updates.startTime ?? slot.startTime,
    endTime: updates.endTime ?? slot.endTime,
  };

  validateSlot(nextSlot);

  await checkOverlap({
    userId: req.user._id,
    day: nextSlot.day,
    startTime: nextSlot.startTime,
    endTime: nextSlot.endTime,
    excludeId: slot._id,
  });

  Object.assign(slot, updates);

  await slot.save();

  return res
    .status(200)
    .json(
      new ApiResponse(200, slot, "Timetable slot updated successfully")
    );
});

// 5. Delete a specific timetable slot.
const deleteTimetable = asyncHandler(async (req, res) => {
  const slot = await Timetable.findOneAndDelete({
    _id: req.params.id,
    userId: req.user._id,
  });

  if (!slot) {
    throw new ApiError(404, "Timetable slot not found");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, slot, "Timetable slot deleted successfully")
    );
});

// 6. Reset the complete weekly timetable.
const resetTimetable = asyncHandler(async (req, res) => {
  const result = await Timetable.deleteMany({
    userId: req.user._id,
  });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {
          deletedCount: result.deletedCount,
        },
        "Timetable reset successfully"
      )
    );
});

export {
  createTimetable,
  getTimetable,
  getTimetableById,
  updateTimetable,
  deleteTimetable,
  resetTimetable,
};
