
import express from "express";

import { verifyJWT } from "../middlewares/auth.middlewares.js";

import {
  sendFriendRequest,
  searchUsers,
  getIncomingRequests,
  getOutgoingRequests,
  acceptFriendRequest,
  rejectFriendRequest,
  cancelFriendRequest,
  getFriends,
  removeFriend,
  compareFriend,
  getDailyDuel
} from "../controllers/friend.controller.js";

const router = express.Router();

// Protect all friend routes.
router.use(verifyJWT);

// User discovery
router.get("/search", searchUsers);

// Friend requests
router.post("/invite", sendFriendRequest);

router.get("/requests/incoming", getIncomingRequests);
router.get("/requests/outgoing", getOutgoingRequests);

router.patch("/requests/:id/accept", acceptFriendRequest);
router.patch("/requests/:id/reject", rejectFriendRequest);

router.delete("/requests/:id", cancelFriendRequest);

// Friends management
router.get("/", getFriends);
router.delete("/:friendId", removeFriend);

// Study comparison
router.get("/:friendId/compare", compareFriend);
router.get("/:friendId/daily-duel", getDailyDuel);

export default router;
