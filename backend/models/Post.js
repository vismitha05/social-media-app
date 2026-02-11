import mongoose from 'mongoose';

const postSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      trim: true,
    },
    imageUrl: {
      type: String,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    likes: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
    ],

    likeCount: {
      type: Number,
      default: 0,
    },

    comments: [
        {
           user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
           },
           text: {
            type: String,
            required: true,
            trim: true,
           },
           createdAt: {
            type: Date,
            default: Date.now,
           },
        },
    ],

    commentCount: {
      type: Number,
      default: 0,
    },
    visibility: {
      type: String,
      enum: ['public'],
      default: 'public',
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const Post = mongoose.model('Post', postSchema);
export default Post;