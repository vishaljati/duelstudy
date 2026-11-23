
import mongoose from "mongoose";

const challengeSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 80,
    },
    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: 300,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    metric: {
      type: String,
      enum: ["studyMinutes", "activeDays"],
      required: true,
    },
    target: {
      type: Number,
      required: true,
      min: 1,
    },
    startDate: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
    endDate: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true }
);

challengeSchema.index({ createdBy: 1, endDate: 1 });
challengeSchema.index({ participants: 1, endDate: 1 });

export const Challenge = mongoose.model("Challenge", challengeSchema);


