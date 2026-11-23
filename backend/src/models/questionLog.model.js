
import mongoose from "mongoose";

const questionLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    goal: {
      type: String,
      enum: ["NEET", "CSE"],
      required: true,
      immutable: true,
    },

    date: {
      type: Date,
      required: true,
    },

    metrics: {
      type: Map,
      of: {
        type: Number,
        min: 0,
        default: 0,
      },
      default: {},
    },
  },
  { timestamps: true }
);

// One daily record per user.
questionLogSchema.index(
  { userId: 1, date: 1 },
  { unique: true }
);

export const QuestionLog = mongoose.model(
  "QuestionLog",
  questionLogSchema
);


