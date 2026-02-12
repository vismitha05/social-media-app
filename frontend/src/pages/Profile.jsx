import { useEffect, useState } from "react";
import api from "../api/axios";

function Profile() {
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const userRes = await api.get("/users/me");
        setUser(userRes.data);

        const postRes = await api.get("/posts");
        const myPosts = postRes.data.posts.filter(
          (post) => post.author === userRes.data._id
        );

        setPosts(myPosts);
      } catch (error) {
        console.error("Error loading profile:", error);
      }
    };

    fetchProfile();
  }, []);

  return (
    <div className="p-10">
      {user && (
        <div className="mb-8 bg-white p-6 rounded-2xl shadow-md">
          <h1 className="text-2xl font-bold">{user.username}</h1>
          <p className="text-gray-500 mt-2">{user.bio || "No bio yet"}</p>
        </div>
      )}

      <h2 className="text-xl font-semibold mb-4">My Posts</h2>

      {posts.length === 0 ? (
        <p>No posts yet</p>
      ) : (
        posts.map((post) => (
          <div
            key={post._id}
            className="bg-white p-4 rounded-2xl shadow-md mb-4"
          >
            <p>{post.text}</p>
          </div>
        ))
      )}
    </div>
  );
}

export default Profile;
