import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User, Mail, Phone } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import toast from "react-hot-toast";

import PasswordInput from "./PasswordInput";
import { Button } from "../ui/button";
import { useAuth } from "@/contexts/AuthContext";

export default function RegisterForm() {
  const navigate = useNavigate();
  const { register, googleLogin } = useAuth();

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone_number: "",
    password: "",
    role: "patient",
  });

  const [loading, setLoading] = useState(false);

  const getStrength = (password) => {
    if (password.length < 6)
      return { text: "Weak", width: "33%", color: "bg-red-500" };

    if (
      password.length >= 8 &&
      /[A-Z]/.test(password) &&
      /\d/.test(password)
    ) {
      return {
        text: "Strong",
        width: "100%",
        color: "bg-emerald-500",
      };
    }

    return {
      text: "Medium",
      width: "66%",
      color: "bg-amber-500",
    };
  };

  const strength = getStrength(formData.password);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await register({
        full_name: formData.full_name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
      });

      toast.success("Account Created Successfully!");
      navigate("/home");
    } catch (err) {
      toast.error(err.message || "Registration Failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    setLoading(true);
    try {
      await googleLogin();
      toast.success("Account created via Google!");
      navigate("/home");
    } catch (err) {
      toast.error("Google sign-up failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Button
        type="button"
        variant="outline"
        onClick={handleGoogleRegister}
        disabled={loading}
        className="w-full flex items-center justify-center gap-3 border-slate-300 hover:bg-slate-50"
      >
        <FcGoogle size={22} />
        Continue with Google
      </Button>

      <div className="relative my-3">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-slate-200" />
        </div>

        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-2 text-slate-400">
            Or continue with email
          </span>
        </div>
      </div>

      <div className="relative">
        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          type="text"
          name="full_name"
          placeholder="Full Name"
          value={formData.full_name}
          onChange={handleChange}
          required
          className="w-full border border-slate-300 rounded-xl py-2.5 pl-10 pr-4 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200 text-sm"
        />
      </div>

      <div className="relative">
        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          type="email"
          name="email"
          placeholder="Email Address"
          value={formData.email}
          onChange={handleChange}
          required
          className="w-full border border-slate-300 rounded-xl py-2.5 pl-10 pr-4 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200 text-sm"
        />
      </div>

      <div className="relative">
        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          type="text"
          name="phone_number"
          placeholder="Phone Number"
          value={formData.phone_number}
          onChange={handleChange}
          required
          className="w-full border border-slate-300 rounded-xl py-2.5 pl-10 pr-4 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200 text-sm"
        />
      </div>

      <PasswordInput
        id="password"
        name="password"
        placeholder="Password"
        value={formData.password}
        onChange={handleChange}
        required
      />

      {formData.password && (
        <div>
          <div className="h-1.5 w-full rounded bg-slate-200">
            <div
              className={`h-1.5 rounded transition-all duration-300 ${strength.color}`}
              style={{ width: strength.width }}
            />
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Strength: <span className="font-semibold">{strength.text}</span>
          </p>
        </div>
      )}

      <select
        name="role"
        value={formData.role}
        onChange={handleChange}
        className="w-full border border-slate-300 rounded-xl py-2.5 px-3 outline-none focus:border-emerald-600 text-sm bg-white"
      >
        <option value="patient">Patient</option>
        <option value="healthcare_worker">Healthcare Worker</option>
      </select>

      <Button
        type="submit"
        disabled={loading}
        className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-semibold py-2.5"
      >
        {loading ? "Creating Account..." : "Create Account"}
      </Button>

      <p className="text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link to="/login" className="text-emerald-700 font-semibold hover:underline">
          Login
        </Link>
      </p>
    </form>
  );
}