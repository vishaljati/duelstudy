
import mongoose from "mongoose";

const friendSchema = new mongoose.Schema(
  {
    userA: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    userB: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
    respondedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Store each pair only once.
friendSchema.index({ userA: 1, userB: 1 }, { unique: true });

// Efficiently find a user's relationships.
friendSchema.index({ userA: 1, status: 1 });
friendSchema.index({ userB: 1, status: 1 });

export const Friend = mongoose.model("Friend", friendSchema);


