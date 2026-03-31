import express from "express";
import authMiddleware from "../middlewares/auth.middleware.js";
import { avatarUpload } from "../middlewares/upload.middleware.js";
import {
  updateProfile,
  getUserProfile,
  searchUsers,
  getCurrentUser,
} from "../controllers/user.controller.js";

const router = express.Router();

// current-user routes
router.get("/me", authMiddleware, getCurrentUser);
router.put("/me", authMiddleware, avatarUpload.single("avatar"), updateProfile);
router.get("/profile", authMiddleware, getCurrentUser);

// backward-compatible alias
router.put("/profile", authMiddleware, avatarUpload.single("avatar"), updateProfile);

// utility routes
router.get("/search", authMiddleware, searchUsers);

// keep dynamic username route last to avoid conflicts
router.get("/:username", authMiddleware, getUserProfile);

export default router;
