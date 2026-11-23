import express from "express";

import { verifyJWT } from "../middlewares/auth.middlewares.js";

import {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  updateTaskStatus,
  deleteTask,
  getWeeklyProgress,
  updateWeeklyTarget,
} from "../controllers/planner.controller.js";

const router = express.Router();

// All routes require authentication.
router.use(verifyJWT);

// Weekly target and progress
router.get("/weekly-progress", getWeeklyProgress);
router.patch("/weekly-target", updateWeeklyTarget);

// Tasks CRUD
router.post("/tasks", createTask);
router.get("/tasks", getTasks);
router.get("/tasks/:id", getTaskById);
router.patch("/tasks/:id", updateTask);
router.patch("/tasks/:id/status", updateTaskStatus);
router.delete("/tasks/:id", deleteTask);

export default router;
