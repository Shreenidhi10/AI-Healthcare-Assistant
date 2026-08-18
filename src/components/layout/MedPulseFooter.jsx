import React from "react";
import { Link } from "react-router-dom";

export default function MedPulseFooter() {
  return (
    <footer className="bg-surface-container-lowest text-primary border-t border-outline-variant mt-auto z-30">
      <div className="flex flex-col md:flex-row justify-between items-center w-full px-6 lg:px-8 py-5 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-primary text-white flex items-center justify-center font-bold text-xs font-manrope">
            HB
          </div>
          <span className="font-manrope text-base font-bold text-primary">HEALTHBUDDY Systems</span>
        </div>

        <div className="text-on-surface-variant text-xs text-center md:text-left">
          © 2024-2026 HEALTHBUDDY AI Systems. Grounded clinical insights for rural and community health.
        </div>

        <nav className="flex flex-wrap gap-4 text-xs font-semibold text-on-surface-variant">
          <Link to="/profile" className="hover:text-primary transition-colors">Privacy Policy</Link>
          <Link to="/profile" className="hover:text-primary transition-colors">Terms of Service</Link>
          <Link to="/assistant" className="hover:text-primary transition-colors">Help Center</Link>
          <Link to="/profile" className="hover:text-primary transition-colors">Contact Support</Link>
        </nav>
      </div>
    </footer>
  );
}
