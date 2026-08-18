import React from "react";

export const LandingInput = React.forwardRef(({ className = "", ...props }, ref) => (
  <input
    ref={ref}
    className={`flex h-11 w-full rounded-md border border-[#1F2933]/15 bg-white px-3 py-2 text-sm text-[#1F2933] placeholder:text-[#9CA3AF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F6F5E]/40 ${className}`}
    {...props}
  />
));
LandingInput.displayName = "LandingInput";