
import express from "express";
import { verifyJWT } from "../middlewares/auth.middlewares.js";

import {
  sendFriendRequest,
  getIncomingRequests,
  getOutgoingRequests,
  acceptFriendRequest,
  rejectFriendRequest,
  cancelFriendRequest,
  getFriends,
  removeFriend,
  compareFriend,
} from "../controllers/friend.controller.js";

const router = express.Router();

router.use(verifyJWT);

// Friend requests
router.post("/invite", sendFriendRequest);

router.get("/requests/incoming", getIncomingRequests);
router.get("/requests/outgoing", getOutgoingRequests);

router.patch("/requests/:id/accept", acceptFriendRequest);
router.patch("/requests/:id/reject", rejectFriendRequest);
router.delete("/requests/:id", cancelFriendRequest);

// Friends
router.get("/", getFriends);
router.delete("/:friendId", removeFriend);

// Study comparison
router.get("/:friendId/compare", compareFriend);

export default router;
