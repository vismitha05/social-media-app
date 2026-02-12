import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";

function Feed() {
  const [posts, setPosts] = useState([]);
  const [text, setText] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [commentText, setCommentText] = useState({});


  const navigate = useNavigate();

  // Decode userId from token
  const token = localStorage.getItem("token");
  const currentUserId = token
    ? JSON.parse(atob(token.split(".")[1])).userId
    : null;

  // Fetch posts
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const response = await api.get("/posts");
        setPosts(response.data.posts);
      } catch (error) {
        console.error("Error fetching posts:", error);
      }
    };

    fetchPosts();
  }, []);

  // Create Post
  const handleCreatePost = async () => {
    if (!text.trim()) return;

    try {
      const response = await api.post("/posts", { text });

      setPosts((prevPosts) => [response.data.post, ...prevPosts]);
      setText("");
    } catch (error) {
      console.error("Error creating post:", error);
    }
  };

  // Like / Unlike
  const handleLike = async (postId) => {
    try {
      const response = await api.patch(`/posts/${postId}/like`);

      setPosts((prevPosts) =>
        prevPosts.map((post) =>
          post._id === postId
            ? {
                ...post,
                likeCount: response.data.likesCount,
                isLiked: !post.isLiked,
              }
            : post
        )
      );
    } catch (error) {
      console.error("Error liking post:", error);
    }
  };

  // Open Delete Modal
  const openDeleteModal = (postId) => {
    setSelectedPostId(postId);
    setShowModal(true);
  };

  // Confirm Delete
  const confirmDelete = async () => {
    try {
      await api.delete(`/posts/${selectedPostId}`);

      setPosts((prevPosts) =>
        prevPosts.filter((post) => post._id !== selectedPostId)
      );

      setShowModal(false);
      setSelectedPostId(null);
    } catch (error) {
      console.error("Error deleting post:", error);
    }
  };

  //comment on post
  const handleAddComment = async (postId) => {
  const text = commentText[postId];

  if (!text || text.trim() === "") {
    console.log("Comment empty");
    return;
  }

  try {
    await api.post(`/posts/${postId}/comment`, { text });

    // refresh posts
    const response = await api.get("/posts");
    setPosts(response.data.posts);

    // clear input
    setCommentText((prev) => ({
      ...prev,
      [postId]: "",
    }));

  } catch (error) {
    console.error("Error adding comment:", error);
  }
};


  // Logout
  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };


  return (
    <div className="p-10">

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Feed</h1>

        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition"
        >
          Logout
        </button>
      </div>

      {/* Create Post */}
      <div className="mb-6 bg-white p-4 rounded-2xl shadow-md">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What's on your mind?"
          className="w-full p-3 border rounded-xl"
        />

        <button
          onClick={handleCreatePost}
          className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition"
        >
          Post
        </button>
      </div>

      {/* Posts */}
      {posts.length === 0 ? (
        <p>No posts available</p>
      ) : (
        posts.map((post) => (
          <div
            key={post._id}
            className="bg-white p-4 rounded-2xl shadow-md mb-4"
          >
            <p className="font-semibold">{post.text}</p>

            <div className="flex items-center justify-between mt-3">

              {/* Like Button */}
              <button
                onClick={() => handleLike(post._id)}
                className={`font-semibold ${
                  post.isLiked ? "text-red-500" : "text-blue-500"
                }`}
              >
                {post.isLiked ? "❤️ Liked" : "🤍 Like"}
              </button>

              <div className="text-sm text-gray-500">
                ❤️ {post.likeCount || 0} Likes | 💬 {post.commentsCount || 0} Comments
              </div>
            </div>

            {/* Comments Section */}
<div className="mt-4">

  {post.comments && post.comments.length > 0 && (
    <div className="space-y-2 mb-3">
      {post.comments.map((comment) => (
        <div
          key={comment._id}
          className="bg-gray-100 p-2 rounded-lg text-sm"
        >
          {comment.text}
        </div>
      ))}
    </div>
  )}

  {/* Comment Input */}
  <div className="flex gap-2">
    <input
      type="text"
      value={commentText[post._id] || ""}
      onChange={(e) =>
        setCommentText((prev) => ({
          ...prev,
          [post._id]: e.target.value,
        }))
      }
      placeholder="Write a comment..."
      className="flex-1 p-2 border rounded-lg text-sm"
    />

    <button
      onClick={() => handleAddComment(post._id)}
      className="px-3 py-1 bg-green-500 text-white rounded-lg text-sm"
    >
      Add
    </button>
  </div>

</div>


            {/* Delete Button (Only Author) */}
            {post.author === currentUserId && (
              <button
                onClick={() => openDeleteModal(post._id)}
                className="text-red-500 font-semibold mt-2"
              >
                Delete
              </button>
            )}
          </div>
        ))
      )}

      {/* Delete Confirmation Modal */}
      {showModal && (
        <div className="fixed inset-0 backdrop-blur-md bg-black/10 flex items-center justify-center transition-all duration-300">
          <div className="bg-white/90 backdrop-blur-xl p-6 rounded-3xl shadow-xl w-80 border border-gray-200">

            <h2 className="text-lg font-bold mb-4">
              Are you sure you want to delete this post?
            </h2>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-300 rounded-xl hover:bg-gray-400 transition"
              >
                Cancel
              </button>

              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition"
              >
                Delete
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

export default Feed;
