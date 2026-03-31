import Post from "../models/Post.js";
import Connection from "../models/Connection.js";
import User from "../models/User.js";

const MENTION_REGEX = /(^|\s)@([a-zA-Z0-9_.]+)/g;
const HASHTAG_REGEX = /(^|\s)#([a-zA-Z0-9_]+)/g;

const extractUniqueTokens = (value = "", regex) => {
  const matches = [...value.matchAll(regex)];
  return [...new Set(matches.map((match) => match[2].toLowerCase()))];
};

const buildOptimizedPost = (post, userId) => {
  const mediaUrl = post.mediaUrl || post.imageUrl || null;
  const mediaType = post.mediaType || (post.imageUrl ? "image" : null);
  const captionText = post.caption || post.text || "";

  return {
    _id: post._id,
    text: post.text || captionText,
    caption: captionText,
    imageUrl: post.imageUrl || (mediaType === "image" ? mediaUrl : null),
    mediaUrl,
    mediaType,
    hashtags: post.hashtags || [],
    mentions: (post.mentions || []).map((id) => id.toString()),
    mentionUsernames: post.mentionUsernames || [],
    createdAt: post.createdAt,
    visibility: post.visibility,
    author: post.author,
    comments: (post.comments || []).map((comment) => ({
      _id: comment._id,
      text: comment.text,
      user: comment.user?.toString(),
    })),
    likeCount: post.likes?.length || 0,
    commentsCount: post.comments?.length || 0,
    isLiked: (post.likes || []).some((id) => id.toString() === userId),
  };
};


//create post
export const createPost = async (req, res) => {
  try {
    const { text = "", caption = "", visibility } = req.body;
    const uploadedFile =
      req.file || req.files?.media?.[0] || req.files?.image?.[0] || null;
    const mediaUrl = uploadedFile ? (uploadedFile.path || uploadedFile.secure_url) : null;
    const mimeType = uploadedFile?.mimetype || "";
    const resourceType = uploadedFile?.resource_type || "";
    const mediaType = mediaUrl
      ? resourceType === "video" || mimeType.startsWith("video")
        ? "video"
        : "image"
      : null;
    const imageUrl = mediaType === "image" ? mediaUrl : null;
    const userId = req.user.userId;
    const validVisibility =
      visibility === "connections" ? "connections" : "public";
    const normalizedText = text.trim();
    const normalizedCaption = caption.trim() || normalizedText;

    if (!normalizedText && !normalizedCaption && !mediaUrl) {
      return res.status(400).json({
        message: "post must contain text/caption or media",
      });
    }
    const mentionCandidates = extractUniqueTokens(normalizedCaption, MENTION_REGEX);
    const hashtags = extractUniqueTokens(normalizedCaption, HASHTAG_REGEX);

    const mentionedUsers = mentionCandidates.length
      ? await User.find({
          username: { $in: mentionCandidates },
        })
          .select("_id username")
          .lean()
      : [];

    const newPost = await Post.create({
      text: normalizedText || normalizedCaption,
      caption: normalizedCaption,
      imageUrl,
      mediaUrl,
      mediaType,
      hashtags,
      mentions: mentionedUsers.map((user) => user._id),
      mentionUsernames: mentionedUsers.map((user) => user.username),
      author: userId,
      visibility: validVisibility,
    });

    const populatedPost = await Post.findById(newPost._id)
      .select(
        "text caption imageUrl mediaUrl mediaType hashtags mentions mentionUsernames author likes comments createdAt visibility"
      )
      .populate("author", "username avatar")
      .lean();

    res.status(201).json({
      message: "Post created successfully...hurray!!",
      post: buildOptimizedPost(populatedPost, userId),
    });
  } catch (error) {
    console.log("CREATE POST ERROR:", error);
    res.status(500).json({
      message: error?.message || "unable to create post, try after some time",
    });
  }
};


//get all posts
export const getAllPosts = async (req, res) => {
  try {

    const userId = req.user.userId;
    const acceptedConnections = await Connection.find({
      status: "accepted",
      $or: [{ senderId: userId }, { receiverId: userId }],
    }).select("senderId receiverId");

    const connectionIds = acceptedConnections.map((connection) =>
      connection.senderId.toString() === userId
        ? connection.receiverId
        : connection.senderId
    );
    //read pagination values 
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;

    //fetch posts with pagination
    const posts = await Post.find({
      isDeleted: false,
      $or: [
        { author: userId },
        { visibility: "public" },
        { visibility: "connections", author: { $in: connectionIds } },
      ],
    })
    .select(
      "text caption imageUrl mediaUrl mediaType hashtags mentions mentionUsernames author likes comments createdAt visibility"
    )
    .populate("author", "username avatar")
    .sort({ createdAt: -1})
    .skip(skip)
    .limit(limit)
    .lean();

    const optimizedPosts = posts.map((post) => buildOptimizedPost(post, userId));

    //count total posts
    const totalPosts = await Post.countDocuments({
      isDeleted: false,
      $or: [
        { author: userId },
        { visibility: "public" },
        { visibility: "connections", author: { $in: connectionIds } },
      ],
    });

    res.status(200).json({
      message: "Posts fetched successfully",
      currentPage: page,
      totalPages: Math.ceil(totalPosts / limit),
      totalPosts,
      posts: optimizedPosts,
    });
  }catch (error)
{
  res.status(500).json({
    message: "server error",
  });
}
};


//delete post
export const deletePost = async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.userId;

    //find post
    const post = await Post.findById(postId);

    if(!post || post.isDeleted) {
      return res.status(404).json({
        message: "post not found",
      });
    }

    //check ownership
    if(post.author.toString() !== userId){
      return res.status(403).json({
        message: "you are not allowed to delete this post",
      });
    }

    //soft delete
    post.isDeleted = true;
    await post.save();

    res.status(200).json({
      message: "post deleted successfully",
    });
  }catch (error){
    res.status(500).json({
      message: "server error",
    });
  }
};

//likes on post
export const toggleLikePost = async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.userId;

    const post = await Post.findById(postId);
    if(!post || post.isDeleted){
      return res.status(404).json({
        message: "post not found",
      });
    }
    const alreadyLiked = post.likes.includes(userId);

    if(alreadyLiked){
      post.likes = post.likes.filter(
        (id) => id.toString() !== userId
      );
    } else {
      post.likes.push(userId);
    }
    // if(!alreadyLiked){
    //   const postOwnerId = post.author.toString();
    //   if(postOwnerId !== userId){
    //     global.io.to(postOwnerId).emit("newNotification", {
    //       type: "like",
    //       message: "someone liked your post",
    //       postId: post._id,
    //   });
   // }

    //}
    await post.save();
    res.status(200).json({
      message: alreadyLiked ? "post unliked" : "post liked",
      likesCount: post.likes.length,
    });
  }catch (error) {
    console.log("like error:", error);
    res.status(500).json({
      message: "server error",
    });
  }
};

//comments on post
export const addComment = async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.userId;
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({
        message: "Comment text is required",
      });
    }

    const post = await Post.findById(postId);

    if (!post || post.isDeleted) {
      return res.status(404).json({
        message: "Post not found",
      });
    }

    post.comments.push({
      user: userId,
      text,
    });

    await post.save();

    const postOwnerId = post.author.toString();
    if (postOwnerId !== userId && global.io) {
      global.io.to(postOwnerId).emit("notification", {
        type: "comment",
        message: "Someone commented on your post",
        postId: post._id,
      });
    }

    res.status(201).json({
      message: "Comment added successfully",
      commentsCount: post.comments.length,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
    });
  }
};

//delete comment 
export const deleteComment = async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const userId = req.user.userId;

    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({
        message: "Post not found",
      });
    }

    const comment = post.comments.id(commentId);

    if (!comment) {
      return res.status(404).json({
        message: "Comment not found",
      });
    }

    if (comment.user.toString() !== userId) {
      return res.status(403).json({
        message: "You can delete only your comment",
      });
    }

    comment.deleteOne();
    await post.save();

    res.status(200).json({
      message: "Comment deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
    });
  }
};

//update post
export const updatePost = async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.userId;
    const { text = "", caption = "" } = req.body;
    const normalizedText = text.trim();
    const normalizedCaption = caption.trim() || normalizedText;

    const post = await Post.findById(postId);

    if (!post || post.isDeleted) {
      return res.status(404).json({ message: "Post not found" });
    }

    if (post.author.toString() !== userId) {
      return res.status(403).json({ message: "Not allowed" });
    }

    post.text = normalizedText || normalizedCaption;
    post.caption = normalizedCaption;

    const mentionCandidates = extractUniqueTokens(normalizedCaption, MENTION_REGEX);
    const hashtags = extractUniqueTokens(normalizedCaption, HASHTAG_REGEX);

    const mentionedUsers = mentionCandidates.length
      ? await User.find({
          username: { $in: mentionCandidates },
        })
          .select("_id username")
          .lean()
      : [];

    post.hashtags = hashtags;
    post.mentions = mentionedUsers.map((user) => user._id);
    post.mentionUsernames = mentionedUsers.map((user) => user.username);

    await post.save();

    res.status(200).json({
      message: "Post updated",
      post: buildOptimizedPost(
        await Post.findById(post._id)
          .select(
            "text caption imageUrl mediaUrl mediaType hashtags mentions mentionUsernames author likes comments createdAt visibility"
          )
          .populate("author", "username avatar")
          .lean(),
        userId
      ),
    });

  } catch (error) {
    console.log("UPDATE POST ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};

