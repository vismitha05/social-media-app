import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/axios";
import AuthLayout from "../components/AuthLayout";


function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await api.post("/auth/login", {
        email,
        password,
      });

      const { token } = response.data;

      localStorage.setItem("token", token);

      navigate("/");
    } catch (err) {
      setError("Invalid email or password");
    }
  };
return (
  <AuthLayout>
    <h2 className="text-2xl font-bold text-center mb-2">
      Welcome Back
    </h2>

    <p className="text-gray-500 text-center mb-6">
      Login to your account
    </p>

    {error && (
      <p className="text-red-500 text-sm text-center mb-4">
        {error}
      </p>
    )}

    <form onSubmit={handleSubmit} className="space-y-4">

      <input
        type="email"
        placeholder="Email"
        className="w-full p-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        type="password"
        placeholder="Password"
        className="w-full p-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <button
        type="submit"
        className="w-full py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition"
      >
        Login
      </button>

    </form>

    <p className="text-center text-sm text-gray-600 mt-6">
      Don't have an account?{" "}
      <Link to="/register" className="text-blue-500 hover:underline">
        Register
      </Link>
    </p>
  </AuthLayout>
);

  
}

export default Login;
