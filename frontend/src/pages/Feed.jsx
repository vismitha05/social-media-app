import { useEffect, useState } from "react";
import api from "../api/axios";

function Feed() {
  const [posts, setPosts] = useState([]);
  const [text, setText] = useState("");
  const [commentText, setCommentText] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [posting, setPosting] = useState(false);

  const token = localStorage.getItem("token");
  const currentUserId = token
    ? JSON.parse(atob(token.split(".")[1])).userId
    : null;

  useEffect(() => {
    fetchPosts(1);
  }, []);

  const fetchPosts = async (pageNumber) => {
    try {
      if (pageNumber === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const response = await api.get(`/posts?page=${pageNumber}&limit=5`);

      if (pageNumber === 1) {
        setPosts(response.data.posts);
      } else {
        setPosts((prev) => [...prev, ...response.data.posts]);
      }

      if (response.data.posts.length < 5) {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Error fetching posts:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchPosts(nextPage);
  };

  const handleCreatePost = async () => {
    if (!text.trim()) return;

    try {
      setPosting(true);
      const response = await api.post("/posts", { text });

      setPosts((prev) => [response.data.post, ...prev]);
      setText("");
    } catch (error) {
      console.error("Error creating post:", error);
    } finally {
      setPosting(false);
    }
  };

  const handleLike = async (postId) => {
    try {
      const response = await api.patch(`/posts/${postId}/like`);

      setPosts((prev) =>
        prev.map((post) =>
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

  const openDeleteModal = (postId) => {
    setSelectedPostId(postId);
    setShowModal(true);
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/posts/${selectedPostId}`);
      setPosts((prev) =>
        prev.filter((post) => post._id !== selectedPostId)
      );
      setShowModal(false);
      setSelectedPostId(null);
    } catch (error) {
      console.error("Error deleting post:", error);
    }
  };

  const handleAddComment = async (postId) => {
    const text = commentText[postId];
    if (!text?.trim()) return;

    try {
      await api.post(`/posts/${postId}/comment`, { text });

      const response = await api.get(`/posts?page=1&limit=${page * 5}`);
      setPosts(response.data.posts);

      setCommentText((prev) => ({ ...prev, [postId]: "" }));
    } catch (error) {
      console.error("Error adding comment:", error);
    }
  };

  return (
    <div>

      {/* Create Post */}
      <div className="mb-6 bg-white p-4 rounded-2xl shadow-md">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What's on your mind?"
          className="w-full p-3 border rounded-xl"
        />

        <button
          disabled={posting}
          onClick={handleCreatePost}
          className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition disabled:opacity-50"
        >
          {posting ? "Posting..." : "Post"}
        </button>
      </div>

      {/* Loading Indicator */}
      {loading && (
        <div className="text-center py-6 text-gray-500">
          Loading posts...
        </div>
      )}

      {/* Posts */}
      {posts.map((post) => (
        <div
          key={post._id}
          className="bg-white p-4 rounded-2xl shadow-md mb-4"
        >
          <p className="font-semibold">{post.text}</p>

          <div className="flex items-center justify-between mt-3">
            <button
              onClick={() => handleLike(post._id)}
              className={`font-semibold ${
                post.isLiked ? "text-red-500" : "text-blue-500"
              }`}
            >
              {post.isLiked ? "❤️ Liked" : "🤍 Like"}
            </button>

            <div className="text-sm text-gray-500">
              ❤️ {post.likeCount || 0} | 💬 {post.commentsCount || 0}
            </div>
          </div>

          {/* Comments */}
          <div className="mt-4">
            {post.comments?.map((comment) => (
              <div
                key={comment._id}
                className="bg-gray-100 p-2 rounded-lg text-sm mb-2"
              >
                {comment.text}
              </div>
            ))}

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
                className="px-3 py-1 bg-blue-500 text-white rounded-lg text-sm"
              >
                Post
              </button>
            </div>
          </div>

          {/* Delete */}
          {post.author === currentUserId && (
            <button
              onClick={() => openDeleteModal(post._id)}
              className="text-red-500 font-semibold mt-3"
            >
              Delete
            </button>
          )}
        </div>
      ))}

      {/* Load More */}
      {hasMore && !loading && (
        <div className="text-center mt-6">
          <button
            disabled={loadingMore}
            onClick={handleLoadMore}
            className="px-6 py-2 bg-gray-200 rounded-xl hover:bg-gray-300 transition disabled:opacity-50"
          >
            {loadingMore ? "Loading..." : "Load More"}
          </button>
        </div>
      )}

      {/* Delete Modal */}
      {showModal && (
        <div className="fixed inset-0 backdrop-blur-md bg-black/10 flex items-center justify-center">
          <div className="bg-white/90 backdrop-blur-xl p-6 rounded-3xl shadow-xl w-80 border border-gray-200">
            <h2 className="text-lg font-bold mb-4">
              Are you sure you want to delete this post?
            </h2>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-300 rounded-xl"
              >
                Cancel
              </button>

              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-500 text-white rounded-xl"
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
