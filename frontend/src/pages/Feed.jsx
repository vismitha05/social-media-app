import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import api from "../api/axios";

const PAGE_SIZE = 5;
const SCROLL_THRESHOLD = 220;

const LEFT_NAV_ITEMS = [
  { label: "Home", icon: HomeIcon, path: "/" },
  { label: "Explore", icon: ExploreIcon, path: "/" },
  { label: "Messages", icon: MessageIcon, path: "/" },
  { label: "Notifications", icon: BellIcon, path: "/" },
  { label: "Connections", icon: UserPlusIcon, path: "/connections" },
  { label: "Profile", icon: UserIcon, path: "/profile" },
];

const TRENDING_TOPICS = [
  "#DesignInspiration",
  "#BuildInPublic",
  "#ReactTips",
  "#TailwindCSS",
  "#WebDev",
];

function Feed() {
  const location = useLocation();
  const [posts, setPosts] = useState([]);
  const [text, setText] = useState("");
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState("");
  const [selectedMediaType, setSelectedMediaType] = useState("");
  const [postVisibility, setPostVisibility] = useState("public");
  const [commentText, setCommentText] = useState({});
  const [openComments, setOpenComments] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [editingPostId, setEditingPostId] = useState(null);
  const [editText, setEditText] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");

  const [pendingRequests, setPendingRequests] = useState([]);
  const [connectionSuggestions, setConnectionSuggestions] = useState([]);
  const [connectionLoadingMap, setConnectionLoadingMap] = useState({});
  const [actionLoadingMap, setActionLoadingMap] = useState({});

  const fetchingPagesRef = useRef(new Set());
  const hasMoreRef = useRef(true);
  const mediaInputRef = useRef(null);
  const token = localStorage.getItem("token");

  const currentUserId = useMemo(() => {
    if (!token) return null;
    try {
      return JSON.parse(atob(token.split(".")[1])).userId;
    } catch {
      return null;
    }
  }, [token]);

  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);

  useEffect(() => {
    return () => {
      if (mediaPreview) {
        URL.revokeObjectURL(mediaPreview);
      }
    };
  }, [mediaPreview]);

  const fetchConnectionPanels = useCallback(async () => {
    try {
      const [pendingRes, suggestionRes] = await Promise.all([
        api.get("/connections/requests"),
        api.get("/connections/suggestions"),
      ]);

      setPendingRequests(pendingRes.data.requests || []);
      setConnectionSuggestions(suggestionRes.data.users || []);
    } catch {
      // no-op: keep feed usable even if connection panel fails
    }
  }, []);

  const fetchPosts = useCallback(async (pageNumber, options = {}) => {
    const { replace = false } = options;

    if (fetchingPagesRef.current.has(pageNumber)) return;
    if (!replace && !hasMoreRef.current && pageNumber !== 1) return;

    fetchingPagesRef.current.add(pageNumber);

    try {
      setError("");
      if (pageNumber === 1 && replace) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const res = await api.get(`/posts?page=${pageNumber}&limit=${PAGE_SIZE}`);
      const incomingPosts = res.data.posts || [];

      if (pageNumber === 1) {
        setPosts(incomingPosts);
      } else {
        setPosts((prev) => {
          const newPosts = incomingPosts.filter(
            (newPost) => !prev.some((post) => post._id === newPost._id)
          );
          return [...prev, ...newPosts];
        });
      }

      setPage(pageNumber);
      if (typeof res.data.totalPages === "number") {
        setHasMore(pageNumber < res.data.totalPages);
      } else {
        setHasMore(incomingPosts.length === PAGE_SIZE);
      }
    } catch {
      setError("Failed to load posts. Please refresh and try again.");
    } finally {
      fetchingPagesRef.current.delete(pageNumber);
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts(1, { replace: true });
    fetchConnectionPanels();
  }, [fetchPosts, fetchConnectionPanels]);

  useEffect(() => {
    const handleScroll = () => {
      if (loading || loadingMore || !hasMore) return;

      const nearBottom =
        window.innerHeight + window.scrollY >=
        document.body.offsetHeight - SCROLL_THRESHOLD;

      if (nearBottom) {
        fetchPosts(page + 1);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [fetchPosts, hasMore, loading, loadingMore, page]);

  const handleCreatePost = async () => {
    if (!text.trim() && !mediaFile) return;

    try {
      setPosting(true);
      setError("");
      const formData = new FormData();
      formData.append("text", text);
      formData.append("caption", text);
      formData.append("visibility", postVisibility);
      if (mediaFile) {
        // Use legacy-compatible key so posting works even if backend runs older route code.
        formData.append("image", mediaFile);
      }

      const res = await api.post("/posts", formData);

      setPosts((prev) => [res.data.post, ...prev]);
      setText("");
      setPostVisibility("public");
      setMediaFile(null);
      setSelectedMediaType("");
      if (mediaPreview) {
        URL.revokeObjectURL(mediaPreview);
        setMediaPreview("");
      }
      if (mediaInputRef.current) {
        mediaInputRef.current.value = "";
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to create post.");
    } finally {
      setPosting(false);
    }
  };

  const handleMediaChange = (event) => {
    const nextFile = event.target.files?.[0];
    if (!nextFile) return;

    const isImage = nextFile.type.startsWith("image/");
    const isVideo = nextFile.type.startsWith("video/");

    if (!isImage && !isVideo) {
      setError("Please select a valid image or video file.");
      if (mediaInputRef.current) mediaInputRef.current.value = "";
      return;
    }

    setError("");
    if (mediaPreview) URL.revokeObjectURL(mediaPreview);

    setMediaFile(nextFile);
    setSelectedMediaType(isVideo ? "video" : "image");
    setMediaPreview(URL.createObjectURL(nextFile));
  };

  const handleRemoveMedia = () => {
    setMediaFile(null);
    setSelectedMediaType("");
    if (mediaPreview) {
      URL.revokeObjectURL(mediaPreview);
      setMediaPreview("");
    }
    if (mediaInputRef.current) {
      mediaInputRef.current.value = "";
    }
  };

  const handleLike = async (postId) => {
    try {
      setError("");
      const res = await api.patch(`/posts/${postId}/like`);
      setPosts((prev) =>
        prev.map((post) =>
          post._id === postId
            ? { ...post, likeCount: res.data.likesCount, isLiked: !post.isLiked }
            : post
        )
      );
    } catch {
      setError("Failed to update like.");
    }
  };

  const toggleComments = (postId) => {
    setOpenComments((prev) => ({
      ...prev,
      [postId]: !prev[postId],
    }));
  };

  const openDeleteModal = (postId) => {
    setSelectedPostId(postId);
    setShowModal(true);
  };

  const confirmDelete = async () => {
    try {
      setError("");
      await api.delete(`/posts/${selectedPostId}`);
      setPosts((prev) => prev.filter((post) => post._id !== selectedPostId));
      setShowModal(false);
    } catch {
      setError("Failed to delete post.");
    }
  };

  const handleSaveEdit = async (postId) => {
    if (!editText.trim()) return;

    try {
      setError("");
      const res = await api.put(`/posts/${postId}`, {
        text: editText,
        caption: editText,
      });
      setPosts((prev) =>
        prev.map((post) => (post._id === postId ? res.data.post : post))
      );
      setEditingPostId(null);
    } catch {
      setError("Failed to update post.");
    }
  };

  const handleAddComment = async (postId) => {
    const newCommentText = commentText[postId]?.trim();
    if (!newCommentText) return;

    const tempCommentId = `temp-${Date.now()}`;

    try {
      setError("");
      setPosts((prev) =>
        prev.map((post) =>
          post._id === postId
            ? {
                ...post,
                comments: [
                  ...(post.comments || []),
                  { _id: tempCommentId, text: newCommentText, user: currentUserId },
                ],
                commentsCount: (post.commentsCount || 0) + 1,
              }
            : post
        )
      );

      setCommentText((prev) => ({ ...prev, [postId]: "" }));
      await api.post(`/posts/${postId}/comments`, { text: newCommentText });
    } catch {
      setError("Failed to add comment.");
      setPosts((prev) =>
        prev.map((post) =>
          post._id === postId
            ? {
                ...post,
                comments: (post.comments || []).filter(
                  (comment) => comment._id !== tempCommentId
                ),
                commentsCount: Math.max((post.commentsCount || 1) - 1, 0),
              }
            : post
        )
      );
    }
  };

  const handleDeleteComment = async (postId, commentId) => {
    let removedComment = null;

    try {
      setError("");
      setPosts((prev) =>
        prev.map((post) => {
          if (post._id !== postId) return post;

          removedComment = (post.comments || []).find(
            (comment) => comment._id === commentId
          );

          return {
            ...post,
            comments: (post.comments || []).filter(
              (comment) => comment._id !== commentId
            ),
            commentsCount: Math.max((post.commentsCount || 1) - 1, 0),
          };
        })
      );

      await api.delete(`/posts/${postId}/comments/${commentId}`);
    } catch {
      setError("Failed to delete comment.");
      if (removedComment) {
        setPosts((prev) =>
          prev.map((post) =>
            post._id === postId
              ? {
                  ...post,
                  comments: [...(post.comments || []), removedComment],
                  commentsCount: (post.commentsCount || 0) + 1,
                }
              : post
          )
        );
      }
    }
  };

  const handleSendRequest = async (receiverId) => {
    try {
      setConnectionLoadingMap((prev) => ({ ...prev, [receiverId]: true }));
      await api.post("/connections/request", { receiverId });
      setConnectionSuggestions((prev) =>
        prev.map((user) =>
          user._id === receiverId
            ? { ...user, connectionStatus: "pending_outgoing" }
            : user
        )
      );
    } catch {
      setError("Failed to send connection request.");
    } finally {
      setConnectionLoadingMap((prev) => ({ ...prev, [receiverId]: false }));
    }
  };

  const handleAcceptRequest = async (requestId) => {
    try {
      setActionLoadingMap((prev) => ({ ...prev, [requestId]: true }));
      const target = pendingRequests.find((item) => item.requestId === requestId);
      await api.post("/connections/accept", { requestId });
      setPendingRequests((prev) => prev.filter((item) => item.requestId !== requestId));

      if (target?.sender?._id) {
        setConnectionSuggestions((prev) =>
          prev.map((user) =>
            user._id === target.sender._id
              ? { ...user, connectionStatus: "connected" }
              : user
          )
        );
      }

      fetchPosts(1, { replace: true });
    } catch {
      setError("Failed to accept request.");
    } finally {
      setActionLoadingMap((prev) => ({ ...prev, [requestId]: false }));
    }
  };

  const handleRejectRequest = async (requestId) => {
    try {
      setActionLoadingMap((prev) => ({ ...prev, [requestId]: true }));
      await api.post("/connections/reject", { requestId });
      setPendingRequests((prev) => prev.filter((item) => item.requestId !== requestId));
    } catch {
      setError("Failed to reject request.");
    } finally {
      setActionLoadingMap((prev) => ({ ...prev, [requestId]: false }));
    }
  };

  const formatPostDate = (dateValue) => {
    if (!dateValue) return "";
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return "";

    const diffMs = Date.now() - date.getTime();
    if (diffMs >= 0 && diffMs < 24 * 60 * 60 * 1000) {
      const minutes = Math.floor(diffMs / (60 * 1000));
      if (minutes < 1) return "Just now";
      if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;

      const hours = Math.floor(diffMs / (60 * 60 * 1000));
      return `${hours} hour${hours === 1 ? "" : "s"} ago`;
    }

    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-fuchsia-50">
      <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-[250px_minmax(0,1fr)_300px] lg:px-6">
        <aside className="hidden lg:block">
          <div className="sticky top-6 rounded-2xl border border-white/70 bg-white/75 p-4 shadow-lg backdrop-blur">
            <div className="mb-6 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-fuchsia-500 to-sky-500" />
              <div>
                <p className="text-lg font-bold text-slate-800">SocialSphere</p>
                <p className="text-xs text-slate-500">Connect beautifully</p>
              </div>
            </div>

            <nav className="space-y-1">
              {LEFT_NAV_ITEMS.map((item) => (
                <SidebarItem
                  key={item.label}
                  item={item}
                  active={item.path === location.pathname}
                />
              ))}
            </nav>
          </div>
        </aside>

        <main className="mx-auto w-full max-w-2xl space-y-5">
          <section className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-lg backdrop-blur">
            <div className="mb-3 flex items-start gap-3">
              <Avatar name="You" />
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Share something... add #hashtags and @mentions, plus media if you like."
                className="min-h-[90px] w-full resize-none rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700 outline-none focus:border-sky-400"
              />
            </div>

            <div className="mb-3 flex items-center justify-between gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
                <MediaIcon />
                Add Photo/Video
                <input
                  ref={mediaInputRef}
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleMediaChange}
                  className="hidden"
                />
              </label>

              {mediaFile && (
                <button
                  type="button"
                  onClick={handleRemoveMedia}
                  className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-200"
                >
                  Remove Media
                </button>
              )}
            </div>

            {mediaPreview && (
              <div className="mb-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                {selectedMediaType === "video" ? (
                  <video src={mediaPreview} controls className="max-h-[340px] w-full object-cover" />
                ) : (
                  <img src={mediaPreview} alt="media preview" className="max-h-[340px] w-full object-cover" />
                )}
              </div>
            )}

            <div className="flex items-center justify-between gap-3">
              <select
                value={postVisibility}
                onChange={(e) => setPostVisibility(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-sky-400"
              >
                <option value="public">Share Publicly</option>
                <option value="connections">Share with Connections</option>
              </select>

              <button
                disabled={posting}
                onClick={handleCreatePost}
                className="rounded-xl bg-gradient-to-r from-fuchsia-500 to-sky-500 px-5 py-2 text-sm font-semibold text-white shadow-md transition hover:shadow-lg disabled:opacity-50"
              >
                {posting ? "Posting..." : "Post"}
              </button>
            </div>
          </section>

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
              {error}
            </div>
          )}

          {loading && (
            <div className="space-y-4">
              {[1, 2, 3].map((idx) => (
                <SkeletonPost key={idx} />
              ))}
            </div>
          )}

          {!loading &&
            posts.map((post) => (
              <article
                key={post._id}
                className="rounded-2xl border border-white/70 bg-white/85 p-4 shadow-md transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar name={post.author?.username} src={post.author?.avatar} />
                    <div>
                      <p className="font-semibold text-slate-800">{post.author?.username}</p>
                      <p className="text-xs text-slate-500">{formatPostDate(post.createdAt)}</p>
                    </div>
                  </div>

                  {post.visibility === "connections" && (
                    <span className="rounded-full bg-sky-50 px-2 py-1 text-[11px] font-medium text-sky-600">
                      Connections
                    </span>
                  )}
                </div>

                {editingPostId === post._id ? (
                  <div className="space-y-2">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 p-2 text-sm outline-none focus:border-sky-400"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveEdit(post._id)}
                        className="rounded-lg bg-sky-500 px-3 py-1 text-sm text-white"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingPostId(null)}
                        className="rounded-lg bg-slate-200 px-3 py-1 text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="mb-3 text-slate-700">
                    <RichText text={post.caption || post.text} />
                  </p>
                )}

                {(post.mediaUrl || post.imageUrl) &&
                  (post.mediaType === "video" ? (
                    <video
                      src={post.mediaUrl}
                      controls
                      className="mb-3 max-h-[420px] w-full rounded-xl object-cover"
                    />
                  ) : (
                    <img
                      src={post.mediaUrl || post.imageUrl}
                      alt="post"
                      className="mb-3 max-h-[420px] w-full rounded-xl object-cover"
                    />
                  ))}

                <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleLike(post._id)}
                      className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition hover:scale-105 ${
                        post.isLiked
                          ? "bg-rose-50 text-rose-600"
                          : "bg-sky-50 text-sky-600"
                      }`}
                    >
                      {post.isLiked
                        ? `${post.likeCount || 0} ❤️ Liked`
                        : `${post.likeCount || 0} 🤍 Like`}
                    </button>

                    <button
                      onClick={() => toggleComments(post._id)}
                      className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-200"
                    >
                      {openComments[post._id] ? "Hide" : "Comment"} ({post.commentsCount || 0})
                    </button>

                    <button
                      onClick={() => {
                        const url = `${window.location.origin}/post/${post._id}`;
                        navigator.clipboard?.writeText(url);
                      }}
                      className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-200"
                    >
                      Share
                    </button>
                  </div>
                </div>

                {post.author?._id === currentUserId && (
                  <div className="mt-2 flex gap-3">
                    <button
                      onClick={() => {
                        setEditingPostId(post._id);
                        setEditText(post.caption || post.text || "");
                      }}
                      className="text-xs font-medium text-sky-600"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => openDeleteModal(post._id)}
                      className="text-xs font-medium text-rose-600"
                    >
                      Delete
                    </button>
                  </div>
                )}

                {openComments[post._id] && (
                  <div className="mt-4 space-y-2 rounded-xl bg-slate-50 p-3">
                    {post.comments?.length ? (
                      post.comments.map((comment) => (
                        <div
                          key={comment._id}
                          className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm"
                        >
                          <span className="text-slate-700">{comment.text}</span>
                          {comment.user === currentUserId && (
                            <button
                              onClick={() => handleDeleteComment(post._id, comment._id)}
                              className="text-xs text-rose-500"
                            >
                              delete
                            </button>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500">No comments yet.</p>
                    )}

                    <div className="flex gap-2 pt-1">
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
                        className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
                      />
                      <button
                        onClick={() => handleAddComment(post._id)}
                        className="rounded-lg bg-gradient-to-r from-fuchsia-500 to-sky-500 px-3 py-2 text-sm font-semibold text-white"
                      >
                        Post
                      </button>
                    </div>
                  </div>
                )}
              </article>
            ))}

          {!loading && posts.length === 0 && !error && (
            <div className="rounded-xl bg-white/80 p-8 text-center text-slate-500 shadow-md">
              No posts yet. Be the first one to post.
            </div>
          )}

          {loadingMore && (
            <div className="py-2 text-center text-sm text-slate-500">Loading more posts...</div>
          )}
        </main>

        <aside className="hidden lg:block">
          <div className="sticky top-6 space-y-4">
            <section className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-md">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-800">Connection Requests</p>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                  {pendingRequests.length}
                </span>
              </div>

              <div className="space-y-3">
                {pendingRequests.length ? (
                  pendingRequests.slice(0, 4).map((request) => (
                    <div key={request.requestId} className="rounded-xl border border-slate-100 p-2">
                      <div className="mb-2 flex items-center gap-2">
                        <Avatar
                          name={request.sender?.username}
                          src={request.sender?.avatar}
                          size="small"
                        />
                        <div>
                          <p className="text-sm font-medium text-slate-700">
                            {request.sender?.username}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAcceptRequest(request.requestId)}
                          disabled={actionLoadingMap[request.requestId]}
                          className="flex-1 rounded-lg bg-sky-500 px-2 py-1 text-xs font-medium text-white disabled:opacity-60"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleRejectRequest(request.requestId)}
                          disabled={actionLoadingMap[request.requestId]}
                          className="flex-1 rounded-lg bg-slate-200 px-2 py-1 text-xs font-medium text-slate-700 disabled:opacity-60"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">No pending requests.</p>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-md">
              <p className="mb-3 text-sm font-semibold text-slate-800">People You May Know</p>
              <div className="space-y-3">
                {connectionSuggestions.length > 0 ? (
                  connectionSuggestions.slice(0, 5).map((user) => (
                    <div key={user._id} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Avatar name={user.username} src={user.avatar} size="small" />
                        <div>
                          <p className="text-sm text-slate-700">{user.username}</p>
                          <p className="text-[11px] text-slate-500">
                            {user.mutualCount || 0} mutual connections
                          </p>
                        </div>
                      </div>

                      {user.connectionStatus === "pending_outgoing" ? (
                        <span className="rounded-lg bg-amber-50 px-2 py-1 text-xs text-amber-700">
                          Pending
                        </span>
                      ) : user.connectionStatus === "connected" ? (
                        <span className="rounded-lg bg-emerald-50 px-2 py-1 text-xs text-emerald-700">
                          Connected
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSendRequest(user._id)}
                          disabled={connectionLoadingMap[user._id]}
                          className="rounded-lg bg-sky-50 px-2 py-1 text-xs font-medium text-sky-600 disabled:opacity-60"
                        >
                          Connect
                        </button>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">Suggestions will appear here.</p>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-md">
              <p className="mb-3 text-sm font-semibold text-slate-800">Trending Topics</p>
              <div className="space-y-2">
                {TRENDING_TOPICS.map((topic) => (
                  <button
                    key={topic}
                    className="block w-full rounded-lg bg-slate-50 px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100"
                  >
                    {topic}
                  </button>
                ))}
              </div>
            </section>
          </div>
        </aside>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="w-80 rounded-2xl bg-white p-5 shadow-xl">
            <h2 className="mb-4 text-lg font-bold text-slate-800">Delete this post?</h2>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="rounded-xl bg-slate-200 px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="rounded-xl bg-rose-500 px-4 py-2 text-sm text-white"
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

function SidebarItem({ item, active }) {
  const Icon = item.icon;
  return (
    <Link
      to={item.path}
      className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition ${
        active
          ? "bg-sky-100 text-sky-700"
          : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
      }`}
    >
      <span
        className={`rounded-lg p-2 transition ${
          active
            ? "bg-sky-200 text-sky-700"
            : "bg-slate-100 text-slate-600 group-hover:bg-sky-100 group-hover:text-sky-600"
        }`}
      >
        <Icon />
      </span>
      <span className="text-sm font-medium">{item.label}</span>
    </Link>
  );
}

function Avatar({ name, src, size = "normal", ring = "default" }) {
  const sizeClasses = size === "small" ? "h-8 w-8 text-xs" : "h-11 w-11 text-sm";
  const ringClass = ring === "light" ? "ring-white/60" : "ring-fuchsia-200/70";

  if (src) {
    return (
      <img
        src={src}
        alt={name || "avatar"}
        className={`${sizeClasses} rounded-full object-cover ring-2 ${ringClass}`}
      />
    );
  }

  const initial = (name || "U").charAt(0).toUpperCase();
  return (
    <div
      className={`${sizeClasses} flex items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-500 to-sky-500 font-semibold text-white ring-2 ${ringClass}`}
    >
      {initial}
    </div>
  );
}

function RichText({ text }) {
  const value = text || "";
  const parts = value.split(/(\s+|@[a-zA-Z0-9_.]+|#[a-zA-Z0-9_]+)/g);

  return (
    <>
      {parts.map((part, idx) => {
        if (!part) return null;

        if (/^@[a-zA-Z0-9_.]+$/.test(part)) {
          return (
            <span key={`${part}-${idx}`} className="font-semibold text-sky-700">
              {part}
            </span>
          );
        }

        if (/^#[a-zA-Z0-9_]+$/.test(part)) {
          return (
            <span key={`${part}-${idx}`} className="font-semibold text-fuchsia-600">
              {part}
            </span>
          );
        }

        return <span key={`${part}-${idx}`}>{part}</span>;
      })}
    </>
  );
}

function SkeletonPost() {
  return (
    <div className="rounded-2xl border border-white/70 bg-white/85 p-4 shadow-md">
      <div className="mb-4 flex items-center gap-3">
        <div className="h-11 w-11 animate-pulse rounded-full bg-slate-200" />
        <div className="space-y-2">
          <div className="h-3 w-24 animate-pulse rounded bg-slate-200" />
          <div className="h-3 w-16 animate-pulse rounded bg-slate-200" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 w-full animate-pulse rounded bg-slate-200" />
        <div className="h-3 w-11/12 animate-pulse rounded bg-slate-200" />
        <div className="h-3 w-8/12 animate-pulse rounded bg-slate-200" />
      </div>
      <div className="mt-4 h-36 animate-pulse rounded-xl bg-slate-200" />
    </div>
  );
}

function MediaIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="m21 15-5-5L5 21" />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 9.5 12 3l9 6.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V9.5Z" />
    </svg>
  );
}

function ExploreIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m14.5 9.5-4 4" />
      <path d="M12 22a10 10 0 1 1 10-10 10 10 0 0 1-10 10Z" />
      <path d="m16 8-2.5 6.5L7 17l2.5-6.5L16 8Z" />
    </svg>
  );
}

function MessageIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10 21a2 2 0 0 0 4 0" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20a8 8 0 0 1 16 0" />
    </svg>
  );
}

function UserPlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <path d="M20 8v6" />
      <path d="M23 11h-6" />
    </svg>
  );
}

export default Feed;
