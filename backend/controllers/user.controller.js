import User from "../models/User.js";

export const updateProfile = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { bio } = req.body;
        const avatar = req.file ? req.file.path : undefined;

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            {
                bio,
                ...(avatar && {avatar}),
            },
            { new: true}
        ).select("-password");

        res.status(200).json({
            message: "profile updated successfully",
            user: updatedUser,
        });
    }catch (error) {
        res.status(500).json({
            message: "unable to update profile",
        });
    }
};

export const getUserProfile = async (req, res) => {
    try {
        const { username } = req.params;

        const user = await User.findOne({ username}).select(
            "username email bio avatar createdAt"
        );
        if(!user) {
            return res.status(404).json({
                message: "user not found",
            });
        }
        res.status(200).json({
            message: "user profile fetched successfully",
            user,
        });
    }catch (error) {
        res.status(500).json({
            message: "server error",
        });
    }
};

export const searchUsers = async (req, res) => {
    try{
        const { q } = req.query;

    if(!q) {
        return res.status(400).json({
            message: "search query is required",
        });
    }
    const users = await User.aggregate([
        {
            $search: {
                index: "default",
                text: {
                    query: q,
                    path: ["username", "email"],
                    fuzzy: {
                        maxEdits: 2,
                    },
                },
            },
        },
        {
            $project: {
                username: 1,
                email: 1,
                bio: 1,
                avatar: 1,
            },
        },
        {
            $limit: 10,
        },
    ]);

    res.status(200).json({
        message: "users fetched successfully",
        count: users.length,
        users,
    });
}catch (error) {
    res.status(500).json({
        message: "server error"
    });
}
};