import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail } from "lucide-react";
import toast from "react-hot-toast";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);

    await new Promise((resolve) => setTimeout(resolve, 1000));

    toast.success("Password reset link sent.");

    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      <div className="relative">
        <Mail
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          size={20}
        />

        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full border rounded-xl py-3 pl-11 pr-4"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-700 text-white py-3 rounded-xl"
      >
        {loading ? "Sending..." : "Send Reset Link"}
      </button>

      <p className="text-center text-sm">
        <Link
          to="/login"
          className="text-blue-600 font-semibold"
        >
          Back to Login
        </Link>
      </p>

    </form>
  );
}