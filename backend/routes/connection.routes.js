import express from "express";
import authMiddleware from "../middlewares/auth.middleware.js";
import {
  sendConnectionRequest,
  acceptConnectionRequest,
  rejectConnectionRequest,
  getAcceptedConnections,
  getPendingRequests,
  getSuggestedConnections,
} from "../controllers/connection.controller.js";

const router = express.Router();

router.post("/request", authMiddleware, sendConnectionRequest);
router.post("/accept", authMiddleware, acceptConnectionRequest);
router.post("/reject", authMiddleware, rejectConnectionRequest);
router.get("/", authMiddleware, getAcceptedConnections);
router.get("/requests", authMiddleware, getPendingRequests);
router.get("/suggestions", authMiddleware, getSuggestedConnections);

export default router;
