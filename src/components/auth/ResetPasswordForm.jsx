import { useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import PasswordInput from "./PasswordInput";

export default function ResetPasswordForm() {

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    toast.success("Password Reset Successfully");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      <PasswordInput
        id="password"
        name="password"
        placeholder="New Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />

      <PasswordInput
        id="confirmPassword"
        name="confirmPassword"
        placeholder="Confirm Password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        required
      />

      <button
        type="submit"
        className="w-full bg-blue-700 text-white py-3 rounded-xl"
      >
        Reset Password
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