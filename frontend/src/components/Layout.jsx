import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import api from "../api/axios";

const USER_CACHE_KEY = "current_user_cache";

function Layout({ children }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [open, setOpen] = useState(false);
  const [userError, setUserError] = useState("");
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;

    const fetchUser = async () => {
      const token = localStorage.getItem("token")?.trim();
      if (!token) {
        sessionStorage.removeItem(USER_CACHE_KEY);
        navigate("/login", { replace: true });
        return;
      }

      try {
        const cachedUser = sessionStorage.getItem(USER_CACHE_KEY);
        if (cachedUser) {
          setUser(JSON.parse(cachedUser));
          return;
        }

        // Axios baseURL already includes /api, so use /users/me here.
        const res = await api.get("/users/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setUser(res.data);
        sessionStorage.setItem(USER_CACHE_KEY, JSON.stringify(res.data));
      } catch (error) {
        console.error("User fetch error:", error);
        const status = error?.response?.status;
        if (status === 401 || status === 402 || status === 403) {
          sessionStorage.removeItem(USER_CACHE_KEY);
          localStorage.removeItem("token");
          navigate("/login", { replace: true });
          return;
        }
        setUserError("Failed to load user profile.");
      }
    };

    fetchUser();
  }, [navigate]);

  const handleLogout = () => {
    sessionStorage.removeItem(USER_CACHE_KEY);
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gray-100">

      {/* Navbar */}
      <nav className="bg-white shadow-md px-8 py-4 flex justify-between items-center">

        {/* App Name */}
        <h1
          onClick={() => navigate("/")}
          className="text-xl font-bold cursor-pointer"
        >
          SocialSphere
        </h1>

        {/* Avatar Section */}
        <div className="relative">

          {/* Avatar */}
          <div
            onClick={() => setOpen(!open)}
            className="w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center cursor-pointer"
          >
            <span className="text-sm font-semibold">
              {user?.username?.[0]?.toUpperCase() || "U"}
            </span>
          </div>

          {/* Dropdown */}
          {open && (
            <div className="absolute right-0 mt-2 w-40 bg-white shadow-xl border rounded-xl py-2 z-[9999]">

              <button
                onClick={() => navigate("/profile")}
                className="block w-full text-left px-4 py-2 hover:bg-gray-100"
              >
                Profile
              </button>

              <button
                onClick={handleLogout}
                className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-red-500"
              >
                Logout
              </button>

            </div>
          )}

        </div>

      </nav>

      {/* Page Content */}
      <div className="w-full px-4 py-6 sm:px-6">
        {userError && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            {userError}
          </div>
        )}
        {children}
      </div>

    </div>
  );
}

export default Layout;

