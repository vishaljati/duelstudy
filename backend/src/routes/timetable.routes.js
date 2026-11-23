
import express from "express";

import { verifyJWT } from "../middlewares/auth.middlewares.js";

import {
  createTimetable,
  getTimetable,
  getTimetableById,
  updateTimetable,
  deleteTimetable,
  resetTimetable,
} from "../controllers/timetable.controller.js";

const router = express.Router();

// All timetable routes require authentication.
router.use(verifyJWT);

// Reset complete timetable.
router.delete("/reset", resetTimetable);

// Timetable CRUD.
router.post("/", createTimetable);
router.get("/", getTimetable);
router.get("/:id", getTimetableById);
router.patch("/:id", updateTimetable);
router.delete("/:id", deleteTimetable);

export default router;
