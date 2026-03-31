import multer from "multer";
import CloudinaryStorage from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";

const avatarStorage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: "avatars",
        allowed_formats: ["jpg","png","jpeg"],
    },
});

const postMediaStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "posts",
    resource_type: "auto",
    allowed_formats: ["jpg", "png", "jpeg", "webp", "gif", "mp4", "mov", "webm"],
  },
});

const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

const postMediaUpload = multer({
  storage: postMediaStorage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit for videos
});

export { avatarUpload, postMediaUpload };
