import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";

const USER_CACHE_KEY = "current_user_cache";

function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [bio, setBio] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const hasFetchedRef = useRef(false);
  const galleryInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;

    const fetchProfile = async () => {
      try {
        const cachedUser = sessionStorage.getItem(USER_CACHE_KEY);
        if (cachedUser) {
          const parsed = JSON.parse(cachedUser);
          setUser(parsed);
          setBio(parsed.bio || "");
          setLoading(false);
          return;
        }
      } catch (cacheError) {
        sessionStorage.removeItem(USER_CACHE_KEY);
      }

      try {
        const res = await api.get("/users/me");
        setUser(res.data);
        setBio(res.data.bio || "");
        sessionStorage.setItem(USER_CACHE_KEY, JSON.stringify(res.data));
      } catch (error) {
        console.error(error);
        const status = error?.response?.status;
        if (status === 401 || status === 402) {
          localStorage.removeItem("token");
          sessionStorage.removeItem(USER_CACHE_KEY);
          navigate("/login", { replace: true });
          return;
        }
        setError("Failed to load user profile.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [navigate]);

  useEffect(() => {
    return () => {
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError("");

      const formData = new FormData();
      formData.append("bio", bio);
      if (avatarFile) {
        formData.append("avatar", avatarFile);
      }

      const res = await api.put("/users/me", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setUser(res.data);
      sessionStorage.setItem(USER_CACHE_KEY, JSON.stringify(res.data));
      setAvatarFile(null);
      setAvatarPreview("");
      setEditing(false);
    } catch (error) {
      console.error(error);
      setError("Unable to update profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarSelect = (file) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      return;
    }

    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
    }

    setError("");
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleCancel = () => {
    setEditing(false);
    setBio(user.bio || "");
    setAvatarFile(null);
    setAvatarPreview("");
    setError("");
  };

  if (loading) return <div>Loading...</div>;
  if (!user) {
    return (
      <div className="p-10 max-w-xl mx-auto">
        <div className="bg-white p-6 rounded-2xl shadow-md text-center text-red-500">
          {error || "Failed to load user profile."}
        </div>
      </div>
    );
  }

  return (
    <div className="p-10 max-w-xl mx-auto">

      <div className="bg-white p-6 rounded-2xl shadow-md">

        {/* Avatar */}
        <div className="flex justify-center mb-4">
          <img
            src={
              avatarPreview ||
              user.avatar ||
              "https://ui-avatars.com/api/?name=User"
            }
            alt="avatar"
            className="w-28 h-28 rounded-full object-cover border"
          />
        </div>

        <h1 className="text-2xl font-bold text-center mb-4">
          {user.username}
        </h1>

        {editing ? (
          <>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full p-3 border rounded-xl mb-3"
            />

            <div className="flex gap-2 mb-3">
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className="px-3 py-2 bg-gray-200 rounded-xl hover:bg-gray-300 transition text-sm"
              >
                Choose from gallery
              </button>
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="px-3 py-2 bg-gray-200 rounded-xl hover:bg-gray-300 transition text-sm"
              >
                Use camera
              </button>
            </div>

            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleAvatarSelect(e.target.files?.[0])}
              className="hidden"
            />

            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => handleAvatarSelect(e.target.files?.[0])}
              className="hidden"
            />

            {avatarFile && (
              <p className="text-sm text-gray-600 mb-3">
                Selected image: {avatarFile.name}
              </p>
            )}

            {error && (
              <p className="text-sm text-red-500 mb-3">{error}</p>
            )}

            <div className="flex gap-3 justify-center">
              <button
                disabled={saving}
                onClick={handleSave}
                className="px-4 py-2 bg-blue-500 text-white rounded-xl disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save"}
              </button>

              <button
                onClick={handleCancel}
                className="px-4 py-2 bg-gray-300 rounded-xl"
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-gray-600 text-center mb-4">
              {user.bio || "No bio yet"}
            </p>

            <div className="flex justify-center">
              <button
                onClick={() => setEditing(true)}
                className="px-4 py-2 bg-gray-200 rounded-xl hover:bg-gray-300 transition"
              >
                Edit Profile
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}

export default Profile;
