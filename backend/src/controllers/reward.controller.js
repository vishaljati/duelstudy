
import { User } from "../models/users.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

import {
  evaluateAndUnlockRewards,
  getUserRewardSummary,
} from "../services/reward.service.js";

export const getRewards = asyncHandler(async (req, res) => {
  const userId = req.user?._id;

  if (!userId) {
    throw new ApiError(401, "Unauthorized request.");
  }

  const user = await User.findById(userId).select("goal");

  if (!user) {
    throw new ApiError(404, "User not found.");
  }

  // Evaluate before returning so newly earned rewards are included.
  const result = await evaluateAndUnlockRewards(userId, user.goal);
  const summary = await getUserRewardSummary(userId);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        ...summary,
        progress: result.progress,
        newlyUnlocked: result.newlyUnlocked,
      },
      "Rewards fetched successfully."
    )
  );
});

export const getRewardProgress = asyncHandler(async (req, res) => {
  const userId = req.user?._id;

  if (!userId) {
    throw new ApiError(401, "Unauthorized request.");
  }

  const user = await User.findById(userId).select("goal");

  if (!user) {
    throw new ApiError(404, "User not found.");
  }

  const result = await evaluateAndUnlockRewards(userId, user.goal);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        progress: result.progress,
        newlyUnlocked: result.newlyUnlocked,
      },
      "Reward progress fetched successfully."
    )
  );
});
