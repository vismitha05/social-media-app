import Post from "../models/Post.js";


//create post
export const createPost = async (req, res) => {
  try {
    const { text } = req.body;
    const imageUrl = req.file ? req.file.path : null;
    const userId = req.user.userId;

    if (!text && !imageUrl) {
      return res.status(400).json({
        message: "post must contain text or image",
      });
    }

    const newPost = await Post.create({
      text,
      imageUrl,
      author: userId,
    });

    res.status(201).json({
      message: "Post created successfully...hurray!!",
      post: newPost,
    });
  } catch (error) {
    res.status(500).json({
      message: "unable to create post, try after some time",
    });
  }
};


//get all posts
export const getAllPosts = async (_req, res) => {
  try {

    const userId = req.user.userId;
    //read pagination values 
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;

    //fetch posts with pagination
    const posts = await Post.find({ isDeleted: false})
    .populate("author", "username bio avatar")
    .sort({ createdAt: -1})
    .skip(skip)
    .limit(limit)
    .lean();

    const optimizedPosts = posts.map((post) => ({
      
        ...post,
        likeCount: post.likes.length,
        commentsCount: post.comments.length,
        isLiked: post.likes.some(
          (id) => id.toString() === userId
      ),
    }));

    //count total posts
    const totalPosts = await Post.countDocuments({ isDeleted: false});

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
    if(!alreadyLiked){
      const postOwnerId = post.author.toString();
      if(postOwnerId !== userId){
        global.io.to(postOwnerId).emit("newNotification", {
          type: "like",
          message: "someone liked your post",
          postId: post._id,
      });
    }

    }
    await post.save();
    res.status(200).json({
      message: alreadyLiked ? "post unliked" : "post liked",
      likesCount: post.likes.length,
    });
  }catch (error) {
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

    res.status(201).json({
      message: "Comment added successfully",
      commentsCount: post.comments.length,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
    });
  }
  const postOwnerId = post.author.toString();

if (postOwnerId !== userId) {
  global.io.to(postOwnerId).emit("notification", {
    type: "comment",
    message: "Someone commented on your post",
    postId: post._id,
  });
}

};

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

