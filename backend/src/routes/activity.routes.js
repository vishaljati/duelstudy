
import express from "express";
import { verifyJWT } from "../middlewares/auth.middlewares.js";

import {
  logActivity,
  getTodayActivity,
  getActivityCalendar,
  getActivityStreak,
} from "../controllers/activity.controller.js";

const router = express.Router();

router.use(verifyJWT);

router.post("/log", logActivity);
router.get("/today", getTodayActivity);
router.get("/calendar", getActivityCalendar);
router.get("/streak", getActivityStreak);

export default router;
