import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export default function PasswordInput({
  id,
  name,
  placeholder,
  value,
  onChange,
  required,
}) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="relative">
      <input
        id={id}
        name={name}
        type={showPassword ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
        className="
          w-full
          border
          border-slate-300
          rounded-xl
          py-3
          pl-4
          pr-12
          focus:ring-2
          focus:ring-blue-400
          outline-none
        "
      />

      <button
        type="button"
        onClick={() => setShowPassword(!showPassword)}
        className="
          absolute
          right-3
          top-1/2
          -translate-y-1/2
          text-slate-500
          hover:text-primary
        "
      >
        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
      </button>
    </div>
  );
}