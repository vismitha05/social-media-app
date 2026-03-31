import mongoose from "mongoose";
import Connection from "../models/Connection.js";
import User from "../models/User.js";

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const getAcceptedConnectionIds = async (userId) => {
  const acceptedConnections = await Connection.find({
    status: "accepted",
    $or: [{ senderId: userId }, { receiverId: userId }],
  }).select("senderId receiverId");

  const ids = acceptedConnections.map((connection) =>
    connection.senderId.toString() === userId
      ? connection.receiverId.toString()
      : connection.senderId.toString()
  );

  return ids;
};

export const sendConnectionRequest = async (req, res) => {
  try {
    const senderId = req.user.userId;
    const { receiverId } = req.body;

    if (!receiverId || !isValidObjectId(receiverId)) {
      return res.status(400).json({ message: "Valid receiverId is required" });
    }

    if (senderId === receiverId) {
      return res.status(400).json({ message: "You cannot connect with yourself" });
    }

    const receiver = await User.findById(receiverId).select("_id");
    if (!receiver) {
      return res.status(404).json({ message: "Receiver not found" });
    }

    const existingConnection = await Connection.findOne({
      $or: [
        { senderId, receiverId },
        { senderId: receiverId, receiverId: senderId },
      ],
    });

    if (existingConnection) {
      if (existingConnection.status === "accepted") {
        return res.status(400).json({ message: "Already connected" });
      }
      if (existingConnection.status === "pending") {
        return res.status(400).json({ message: "Connection request already pending" });
      }

      existingConnection.senderId = senderId;
      existingConnection.receiverId = receiverId;
      existingConnection.status = "pending";
      await existingConnection.save();

      return res.status(200).json({
        message: "Connection request sent",
        connection: existingConnection,
      });
    }

    const connection = await Connection.create({
      senderId,
      receiverId,
      status: "pending",
    });

    return res.status(201).json({
      message: "Connection request sent",
      connection,
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
};

export const acceptConnectionRequest = async (req, res) => {
  try {
    const receiverId = req.user.userId;
    const { requestId } = req.body;

    if (!requestId || !isValidObjectId(requestId)) {
      return res.status(400).json({ message: "Valid requestId is required" });
    }

    const connection = await Connection.findOne({
      _id: requestId,
      receiverId,
      status: "pending",
    });

    if (!connection) {
      return res.status(404).json({ message: "Pending request not found" });
    }

    connection.status = "accepted";
    await connection.save();

    return res.status(200).json({
      message: "Connection request accepted",
      connection,
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
};

export const rejectConnectionRequest = async (req, res) => {
  try {
    const receiverId = req.user.userId;
    const { requestId } = req.body;

    if (!requestId || !isValidObjectId(requestId)) {
      return res.status(400).json({ message: "Valid requestId is required" });
    }

    const connection = await Connection.findOne({
      _id: requestId,
      receiverId,
      status: "pending",
    });

    if (!connection) {
      return res.status(404).json({ message: "Pending request not found" });
    }

    connection.status = "rejected";
    await connection.save();

    return res.status(200).json({
      message: "Connection request rejected",
      connection,
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
};

export const getAcceptedConnections = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { q = "" } = req.query;

    const acceptedConnections = await Connection.find({
      status: "accepted",
      $or: [{ senderId: userId }, { receiverId: userId }],
    })
      .populate("senderId", "username name avatar bio")
      .populate("receiverId", "username name avatar bio")
      .sort({ updatedAt: -1 });

    let connections = acceptedConnections.map((connection) => {
      const sender = connection.senderId;
      const receiver = connection.receiverId;
      const otherUser =
        sender?._id?.toString() === userId ? receiver : sender;

      return {
        connectionId: connection._id,
        user: otherUser,
        status: connection.status,
        connectedAt: connection.updatedAt,
      };
    });

    if (q.trim()) {
      const term = q.trim().toLowerCase();
      connections = connections.filter(({ user }) => {
        const username = user?.username?.toLowerCase() || "";
        const name = user?.name?.toLowerCase() || "";
        return username.includes(term) || name.includes(term);
      });
    }

    return res.status(200).json({
      count: connections.length,
      connections,
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
};

export const getPendingRequests = async (req, res) => {
  try {
    const receiverId = req.user.userId;

    const requests = await Connection.find({
      receiverId,
      status: "pending",
    })
      .populate("senderId", "username name avatar bio")
      .sort({ createdAt: -1 });

    const pendingRequests = requests.map((request) => ({
      requestId: request._id,
      sender: request.senderId,
      status: request.status,
      createdAt: request.createdAt,
    }));

    return res.status(200).json({
      count: pendingRequests.length,
      requests: pendingRequests,
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
};

export const getSuggestedConnections = async (req, res) => {
  try {
    const userId = req.user.userId;
    const acceptedConnectionIds = await getAcceptedConnectionIds(userId);

    const existingRelations = await Connection.find({
      $or: [{ senderId: userId }, { receiverId: userId }],
    }).select("senderId receiverId status");

    const blockedIds = new Set([userId]);
    existingRelations.forEach((relation) => {
      blockedIds.add(relation.senderId.toString());
      blockedIds.add(relation.receiverId.toString());
    });

    const suggestions = await User.find({
      _id: { $nin: Array.from(blockedIds) },
    })
      .select("username name avatar bio")
      .limit(8)
      .lean();

    const suggestionsWithMutual = await Promise.all(
      suggestions.map(async (candidate) => {
        const candidateConnections = await getAcceptedConnectionIds(
          candidate._id.toString()
        );
        const mutualCount = candidateConnections.filter((id) =>
          acceptedConnectionIds.includes(id)
        ).length;

        return {
          ...candidate,
          mutualCount,
        };
      })
    );

    return res.status(200).json({
      count: suggestionsWithMutual.length,
      users: suggestionsWithMutual,
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
};
