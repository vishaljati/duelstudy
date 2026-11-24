import mongoose from "mongoose";

const dailyDuelSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    dateKey: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },

    studyMinutes: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalTasks: {
      type: Number,
      default: 0,
      min: 0,
    },

    completedTasks: {
      type: Number,
      default: 0,
      min: 0,
    },

    completionRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    finalizedAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

dailyDuelSchema.index(
  { userId: 1, dateKey: 1 },
  { unique: true }
);

dailyDuelSchema.index({ dateKey: 1 });

export const DailyDuel = mongoose.model(
  "DailyDuel",
  dailyDuelSchema
);