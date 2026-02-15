import { useEffect, useState } from "react";
import api from "../api/axios";

function Profile() {
  const [user, setUser] = useState(null);
  const [bio, setBio] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get("/users/me");
        setUser(res.data);
        setBio(res.data.bio || "");
      } catch (error) {
        console.error("Error loading profile:", error);
      }
    };

    fetchProfile();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await api.put("/users/me", { bio });
      setUser(res.data);
      setEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
    } finally {
      setSaving(false);
    }
  };

  if (!user) return <div>Loading profile...</div>;

  return (
    <div className="p-10 max-w-xl mx-auto">

      <div className="bg-white p-6 rounded-2xl shadow-md">
        <h1 className="text-2xl font-bold mb-4">{user.username}</h1>

        {editing ? (
          <>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full p-3 border rounded-xl mb-3"
            />

            <div className="flex gap-3">
              <button
                disabled={saving}
                onClick={handleSave}
                className="px-4 py-2 bg-blue-500 text-white rounded-xl disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save"}
              </button>

              <button
                onClick={() => setEditing(false)}
                className="px-4 py-2 bg-gray-300 rounded-xl"
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-gray-600 mb-4">
              {user.bio || "No bio added yet"}
            </p>

            <button
              onClick={() => setEditing(true)}
              className="px-4 py-2 bg-gray-200 rounded-xl hover:bg-gray-300 transition"
            >
              Edit Profile
            </button>
          </>
        )}
      </div>

    </div>
  );
}

export default Profile;
