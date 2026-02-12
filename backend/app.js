import express from "express";
import cors from "cors";
import dotenv from "dotenv";

// route imports
import authRoutes from "./routes/auth.routes.js";
import postRoutes from "./routes/post.routes.js";
import testRoutes from "./routes/test.routes.js";
import userRoutes from "./routes/user.routes.js";

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

export default app;
