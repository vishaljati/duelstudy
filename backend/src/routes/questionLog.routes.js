
import express from "express";
import { verifyJWT } from "../middlewares/auth.middlewares.js";

import {
  createQuestionLog,
  getQuestionLogs,
  getQuestionLogById,
  deleteQuestionLog,
  getDailySummary,
  getWeeklySummary,
  getTrackerConfig,
} from "../controllers/questionLog.controller.js";

const router = express.Router();

router.use(verifyJWT);

// Goal-specific tracker configuration.
router.get("/config", getTrackerConfig);

// Daily and weekly summaries.
router.get("/daily-summary", getDailySummary);
router.get("/weekly-summary", getWeeklySummary);

// Daily logs.
router.post("/logs", createQuestionLog);
router.get("/logs", getQuestionLogs);
router.get("/logs/:id", getQuestionLogById);
router.delete("/logs/:id", deleteQuestionLog);

export default router;
