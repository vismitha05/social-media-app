import jwt from "jsonwebtoken";

const authMiddleware = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if(!authHeader || !authHeader.startsWith("Bearer ")){
            return res.status(401).json({
                message: "Authorization token missing",
            });
        }

        const token = authHeader.split(" ")[1];
        console.log("JWT secret:", process.env.JWT_SECRET);
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.user = decoded;

        next();
    } catch (error) {
        return res.status(402).json({
            message: "Invalid or expaired token",
        });
    }
};

export default authMiddleware;
