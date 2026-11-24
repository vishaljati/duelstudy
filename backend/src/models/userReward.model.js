
import mongoose from "mongoose";

const userRewardSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    rewardKey: {
      type: String,
      required: true,
    },

    type: {
      type: String,
      enum: ["badge", "challenge", "rank"],
      required: true,
    },

    label: {
      type: String,
      required: true,
    },

    xp: {
      type: Number,
      required: true,
      min: 0,
    },

    unlockedAt: {
      type: Date,
      default: Date.now,
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

// A reward can only be unlocked once per user.
userRewardSchema.index(
  { userId: 1, rewardKey: 1 },
  { unique: true }
);

export const UserReward = mongoose.model(
  "UserReward",
  userRewardSchema
);
