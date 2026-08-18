import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import toast from "react-hot-toast";

import PasswordInput from "./PasswordInput";
import Loader from "../common/Loader";
import { Button } from "../ui/button";
import { useAuth } from "@/contexts/AuthContext";

export default function LoginForm() {
  const navigate = useNavigate();
  const { login, googleLogin } = useAuth();

  const [formData, setFormData] = useState({
    email: "demo@healthcare.ai",
    password: "Demo@123",
  });

  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const savedEmail = localStorage.getItem("rememberEmail");
    if (savedEmail) {
      setFormData({
        email: savedEmail,
        password: "Demo@123",
      });
      setRememberMe(true);
    }
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);
    setError("");

    try {
      const res = await login({
        email: formData.email,
        password: formData.password,
      });

      if (rememberMe) {
        localStorage.setItem("rememberEmail", formData.email);
      } else {
        localStorage.removeItem("rememberEmail");
      }

      toast.success("Welcome back! Login Successful.");
      navigate("/home");
    } catch (err) {
      console.error("Login Error:", err);
      const message = err.message || "Invalid email or password.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await googleLogin();
      toast.success("Signed in with Google!");
      navigate("/home");
    } catch (err) {
      toast.error("Google sign-in failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-lg bg-red-100 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div>
        <label className="mb-2 block font-medium text-slate-700">
          Email
        </label>

        <div className="relative">
          <Mail
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            size={20}
          />

          <input
            type="email"
            name="email"
            placeholder="Enter your email"
            value={formData.email}
            onChange={handleChange}
            required
            className="w-full rounded-xl border border-slate-300 py-3 pl-11 pr-4 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200"
          />
        </div>
      </div>

      <div>
        <label className="mb-2 block font-medium text-slate-700">
          Password
        </label>

        <PasswordInput
          id="password"
          name="password"
          placeholder="Enter your password"
          value={formData.password}
          onChange={handleChange}
          required
        />
      </div>

      <div className="flex items-center justify-between text-sm">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
          />
          Remember Me
        </label>

        <Link
          to="/forgot-password"
          className="text-emerald-700 font-semibold hover:underline"
        >
          Forgot Password?
        </Link>
      </div>

      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-center text-sm text-emerald-800">
        Demo credentials pre-filled. Click <strong>Sign In</strong> to test instantly.
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={handleGoogleLogin}
        disabled={loading}
        className="flex w-full items-center justify-center gap-3 border-slate-300 hover:bg-slate-50"
      >
        <FcGoogle size={22} />
        Continue with Google
      </Button>

      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-slate-200" />
        </div>

        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-2 text-slate-400">
            Or continue with email
          </span>
        </div>
      </div>

      <Button
        type="submit"
        disabled={loading}
        className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-semibold py-3"
      >
        {loading ? <Loader text="Signing In..." /> : "Sign In"}
      </Button>

      <p className="text-center text-sm text-slate-500">
        Don't have an account?{" "}
        <Link
          to="/register"
          className="font-medium text-emerald-700 hover:underline"
        >
          Register
        </Link>
      </p>
    </form>
  );
}