import mongoose from "mongoose";

const taskSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: [true, "Task title is required"],
      trim: true,
      minlength: 2,
      maxlength: 100,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },

    subject: {
      type: String,
      trim: true,
      default: "",
      maxlength: 50,
    },

    scheduledDate: {
      type: Date,
      required: true,
    },

    scheduledTime: {
      type: String,
      default: null,
      validate: {
        validator: (value) =>
          value === null || /^([01]\d|2[0-3]):([0-5]\d)$/.test(value),
        message: "Scheduled time must use HH:mm format",
      },
    },

    durationMinutes: {
      type: Number,
      required: true,
      min: 5,
      max: 1440,
    },

    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },

    status: {
      type: String,
      enum: ["planned", "completed"],
      default: "planned",
    },

    completedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

taskSchema.index({ userId: 1, scheduledDate: 1 });
taskSchema.index({ userId: 1, scheduledDate: 1, status: 1 });
taskSchema.index({ userId: 1, status: 1, completedAt: 1 });

export const Task = mongoose.model("Task", taskSchema);


