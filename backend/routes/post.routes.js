import express from "express";
import authMiddleware from "../middlewares/auth.middleware.js";
import { postMediaUpload } from "../middlewares/upload.middleware.js";
import {
  createPost,
  getAllPosts,
  deletePost,
  toggleLikePost,
  addComment,
  deleteComment,
} from "../controllers/post.controller.js";
import { updatePost } from "../controllers/post.controller.js";

const router = express.Router();

router.post(
  "/",
  authMiddleware,
  postMediaUpload.fields([
    { name: "media", maxCount: 1 },
    { name: "image", maxCount: 1 },
  ]),
  createPost
);

router.get("/", authMiddleware, getAllPosts);

router.delete("/:id", authMiddleware, deletePost);

router.patch("/:id/like", authMiddleware, toggleLikePost);

router.post("/:id/comments", authMiddleware, addComment);

router.delete("/:postId/comments/:commentId", authMiddleware, deleteComment);

router.put("/:id", authMiddleware, updatePost);

export default router;
