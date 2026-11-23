
import express from "express";
import { verifyJWT } from "../middlewares/auth.middlewares.js";

import {
  getWeeklyLeaderboard,
  getMyBadges,
} from "../controllers/competition.controller.js";

import {
  createChallenge,
  joinChallenge,
  getChallenges,
  getChallengeById,
} from "../controllers/challenge.controller.js";

const router = express.Router();

router.use(verifyJWT);

// Leaderboard and achievements
router.get("/leaderboard/weekly", getWeeklyLeaderboard);
router.get("/badges", getMyBadges);

// Study challenges
router.post("/challenges", createChallenge);
router.get("/challenges", getChallenges);
router.get("/challenges/:id", getChallengeById);
router.post("/challenges/:id/join", joinChallenge);

export default router;
