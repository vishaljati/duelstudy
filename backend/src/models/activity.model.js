
import mongoose from "mongoose";

const activitySchema = new mongoose.Schema(
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
    sessionsCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

activitySchema.index({ userId: 1, dateKey: 1 }, { unique: true });

const Activity = mongoose.model("Activity", activitySchema);

export default Activity;
