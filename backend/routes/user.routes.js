import express from "express";
import authMiddleware from "../middlewares/auth.middleware.js";
import upload from "../middlewares/upload.middleware.js";
import { updateProfile, getUserProfile, searchUsers } from "../controllers/user.controller.js";
import { getCurrentUser } from "../controllers/user.controller.js";

const router = express.Router();

router.put("/profile", authMiddleware, upload.single("avatar"), updateProfile);
router.get("/search", authMiddleware, searchUsers);
router.get("/:username", authMiddleware, getUserProfile);
router.get("/me", authMiddleware, getCurrentUser);

export default router;