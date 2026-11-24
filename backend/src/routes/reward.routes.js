
import { Router } from "express";

import {
  getRewards,
  getRewardProgress,
} from "../controllers/reward.controller.js";

import { verifyJWT } from "../middlewares/auth.middlewares.js";

const router = Router();

router.use(verifyJWT);

router.get("/", getRewards);
router.get("/progress", getRewardProgress);

export default router;
