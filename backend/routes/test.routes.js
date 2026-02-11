import express from "express";
import authMiddleware from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/protected", authMiddleware, (req, res) => {
    console.log("protected route hit")
    res.json({
        message: "you have access",
        user: req.user,
    });
});



export default router;