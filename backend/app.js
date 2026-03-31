import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";

// route imports
import authRoutes from "./routes/auth.routes.js";
import postRoutes from "./routes/post.routes.js";
import testRoutes from "./routes/test.routes.js";
import userRoutes from "./routes/user.routes.js";
import connectionRoutes from "./routes/connection.routes.js";

dotenv.config();

const app = express();

// middlewares
app.use(cors());
app.use(express.json());

// test root route
app.get("/", (req, res) => {
  res.send("API is running");
});

app.post("/api/posts/__probe", (req, res) => {
    res.json({ok: true});
});


// routes
app.use("/api/auth", authRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/test", testRoutes);

app.use("/api/users", userRoutes);
app.use("/api/connections", connectionRoutes);

app.use("/api", (req, res) => {
  res.status(404).json({
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ message: err.message });
  }
  if (err) {
    return res.status(500).json({ message: err.message || "Server error" });
  }
  next();
});

export default app;
