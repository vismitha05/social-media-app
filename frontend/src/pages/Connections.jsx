import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";

function Connections() {
  const navigate = useNavigate();
  const [connections, setConnections] = useState([]);
  const [requests, setRequests] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState({});
  const [error, setError] = useState("");

  const loadData = async (search = "") => {
    try {
      setLoading(true);
      setError("");
      const [connectionsRes, requestsRes, suggestionsRes] = await Promise.all([
        api.get(`/connections?q=${encodeURIComponent(search)}`),
        api.get("/connections/requests"),
        api.get("/connections/suggestions"),
      ]);

      setConnections(connectionsRes.data.connections || []);
      setRequests(requestsRes.data.requests || []);
      setSuggestions(suggestionsRes.data.users || []);
    } catch {
      setError("Failed to load connections data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    loadData(query);
  };

  const handleAccept = async (requestId) => {
    try {
      setActionLoading((prev) => ({ ...prev, [requestId]: true }));
      await api.post("/connections/accept", { requestId });
      await loadData(query);
    } catch {
      setError("Failed to accept request.");
    } finally {
      setActionLoading((prev) => ({ ...prev, [requestId]: false }));
    }
  };

  const handleReject = async (requestId) => {
    try {
      setActionLoading((prev) => ({ ...prev, [requestId]: true }));
      await api.post("/connections/reject", { requestId });
      await loadData(query);
    } catch {
      setError("Failed to reject request.");
    } finally {
      setActionLoading((prev) => ({ ...prev, [requestId]: false }));
    }
  };

  const handleConnect = async (receiverId) => {
    try {
      setActionLoading((prev) => ({ ...prev, [receiverId]: true }));
      await api.post("/connections/request", { receiverId });
      await loadData(query);
    } catch {
      setError("Failed to send connection request.");
    } finally {
      setActionLoading((prev) => ({ ...prev, [receiverId]: false }));
    }
  };

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-white/70 bg-white/85 p-4 shadow-md">
        <div className="mb-2 flex items-center justify-between gap-3">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <BackIcon />
            Back
          </button>

          <button
            onClick={() => navigate("/")}
            aria-label="Exit connections"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
          >
            <CloseIcon />
          </button>
        </div>

        <h1 className="text-2xl font-bold text-slate-800">Connections</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage your network, pending requests, and suggestions.
        </p>

        <form onSubmit={handleSearch} className="mt-4 flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search connections..."
            className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400"
          />
          <button
            type="submit"
            className="rounded-xl bg-gradient-to-r from-fuchsia-500 to-sky-500 px-4 py-2 text-sm font-semibold text-white"
          >
            Search
          </button>
        </form>

        {error && (
          <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">
            {error}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-white/70 bg-white/85 p-4 shadow-md">
        <h2 className="mb-3 text-lg font-semibold text-slate-800">
          Pending Requests ({requests.length})
        </h2>
        {loading ? (
          <p className="text-sm text-slate-500">Loading...</p>
        ) : requests.length === 0 ? (
          <p className="text-sm text-slate-500">No pending requests.</p>
        ) : (
          <div className="space-y-3">
            {requests.map((request) => (
              <div
                key={request.requestId}
                className="flex items-center justify-between rounded-xl border border-slate-100 p-3"
              >
                <div className="flex items-center gap-3">
                  <Avatar name={request.sender?.username} src={request.sender?.avatar} />
                  <div>
                    <p className="text-sm font-medium text-slate-800">{request.sender?.username}</p>
                    <p className="text-xs text-slate-500">{request.sender?.bio || "No bio"}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleAccept(request.requestId)}
                    disabled={actionLoading[request.requestId]}
                    className="rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => handleReject(request.requestId)}
                    disabled={actionLoading[request.requestId]}
                    className="rounded-lg bg-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 disabled:opacity-60"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-white/70 bg-white/85 p-4 shadow-md">
        <h2 className="mb-3 text-lg font-semibold text-slate-800">
          My Connections ({connections.length})
        </h2>
        {loading ? (
          <p className="text-sm text-slate-500">Loading...</p>
        ) : connections.length === 0 ? (
          <p className="text-sm text-slate-500">No connections found.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {connections.map((connection) => (
              <div
                key={connection.connectionId}
                className="rounded-xl border border-slate-100 p-3 transition hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <Avatar name={connection.user?.username} src={connection.user?.avatar} />
                  <div>
                    <p className="text-sm font-medium text-slate-800">{connection.user?.username}</p>
                    <p className="text-xs text-slate-500">{connection.user?.bio || "No bio"}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-white/70 bg-white/85 p-4 shadow-md">
        <h2 className="mb-3 text-lg font-semibold text-slate-800">People You May Know</h2>
        {loading ? (
          <p className="text-sm text-slate-500">Loading...</p>
        ) : suggestions.length === 0 ? (
          <p className="text-sm text-slate-500">No suggestions available.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {suggestions.map((user) => (
              <div key={user._id} className="rounded-xl border border-slate-100 p-3">
                <div className="mb-2 flex items-center gap-3">
                  <Avatar name={user.username} src={user.avatar} />
                  <div>
                    <p className="text-sm font-medium text-slate-800">{user.username}</p>
                    <p className="text-xs text-slate-500">{user.mutualCount || 0} mutual</p>
                  </div>
                </div>
                <button
                  onClick={() => handleConnect(user._id)}
                  disabled={actionLoading[user._id]}
                  className="rounded-lg bg-gradient-to-r from-fuchsia-500 to-sky-500 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                >
                  Connect
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function BackIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function Avatar({ name, src }) {
  if (src) {
    return (
      <img
        src={src}
        alt={name || "avatar"}
        className="h-10 w-10 rounded-full object-cover ring-2 ring-fuchsia-100"
      />
    );
  }

  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-500 to-sky-500 text-sm font-semibold text-white">
      {(name || "U").charAt(0).toUpperCase()}
    </div>
  );
}

export default Connections;
