import express from "express";
import authMiddleware from "../middlewares/auth.middleware.js";
import upload from "../middlewares/upload.middleware.js";
import {
  createPost,
  getAllPosts,
  deletePost,
  toggleLikePost,
  addComment,
  deleteComment,
} from "../controllers/post.controller.js";

const router = express.Router();

router.post("/", authMiddleware, upload.single("image"), createPost);

router.get("/", authMiddleware, getAllPosts);

router.delete("/:id", authMiddleware, deletePost);

router.patch("/:id/like", authMiddleware, toggleLikePost);

router.post("/:id/comments", authMiddleware, addComment);

router.delete("/:postId/comments/:commentId", authMiddleware, deleteComment);

export default router;
