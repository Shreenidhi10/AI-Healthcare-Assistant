import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { LanguageSwitcher } from "./LanguageSwitcher";
import toast from "react-hot-toast";

export default function MedPulseHeader({ onOpenBookAppointment, onOpenNotifications, onOpenSearch, onToggleMobileSidebar }) {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    if (onOpenSearch) {
      onOpenSearch(searchQuery);
    } else {
      navigate(`/history?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleLogout = async () => {
    await logout();
    setProfileMenuOpen(false);
    toast.success("Signed out of HealthBuddy");
    navigate("/login");
  };

  const userName = user?.name || user?.full_name || user?.username || "Alex";
  const userAvatar = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80";

  return (
    <header className="bg-surface-container-lowest text-primary fixed top-0 left-0 right-0 h-16 md:h-20 border-b border-outline-variant z-50 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
      <div className="flex justify-between items-center w-full px-3 sm:px-6 lg:px-8 h-full">
        
        {/* Brand & Mobile Hamburger */}
        <div className="flex items-center gap-2 sm:gap-6 min-w-0">
          {/* Mobile Drawer Button */}
          <button
            onClick={onToggleMobileSidebar}
            className="md:hidden text-on-surface-variant hover:bg-surface-container-low active:opacity-80 transition-opacity p-1.5 rounded-full flex items-center justify-center flex-shrink-0"
            title="Open Menu"
          >
            <span className="material-symbols-outlined text-2xl">menu</span>
          </button>

          <Link to="/home" className="flex items-center gap-1.5 sm:gap-2 text-primary group min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-primary text-white flex items-center justify-center shadow-sm group-hover:bg-primary-container transition-colors flex-shrink-0">
              <span className="material-symbols-outlined text-lg sm:text-2xl font-bold" style={{ fontVariationSettings: "'FILL' 1" }}>
                vital_signs
              </span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-lg sm:text-2xl font-extrabold font-manrope tracking-tight text-primary leading-tight truncate">
                HEALTHBUDDY
              </span>
              <span className="hidden sm:inline-block text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant leading-none">
                AI Healthcare Assistant
              </span>
            </div>
          </Link>

          {/* Search Bar on Desktop */}
          <form onSubmit={handleSearchSubmit} className="hidden md:flex items-center bg-surface-container-low rounded-full px-4 py-2 text-on-surface-variant border border-outline-variant focus-within:border-primary focus-within:bg-white transition-all w-56 lg:w-72">
            <span className="material-symbols-outlined text-outline text-xl">search</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search records, vitals..."
              className="bg-transparent border-none text-xs text-on-surface focus:outline-none w-full ml-2 placeholder:text-outline"
            />
          </form>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
          {/* Language Switcher (Visible on Mobile & Desktop) */}
          <div className="flex items-center">
            <LanguageSwitcher />
          </div>

          {/* Book Appointment CTA Button */}
          <button
            onClick={onOpenBookAppointment}
            className="hidden sm:flex items-center gap-2 bg-primary text-on-primary px-4 py-2.5 rounded-full text-xs font-bold hover:bg-primary-container transition-all shadow-sm active:scale-95 flex-shrink-0"
          >
            <span className="material-symbols-outlined text-base">calendar_add_on</span>
            <span className="hidden md:inline">{t("Book Appointment")}</span>
          </button>

          {/* Notifications Button */}
          <button
            onClick={onOpenNotifications}
            className="text-on-surface-variant hover:bg-surface-container-low p-2 rounded-full relative transition-colors"
            title="Notifications"
          >
            <span className="material-symbols-outlined text-xl sm:text-2xl">notifications</span>
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-error rounded-full ring-2 ring-white"></span>
          </button>

          {/* Settings Shortcut */}
          <button
            onClick={() => navigate("/profile")}
            className="hidden sm:flex text-on-surface-variant hover:bg-surface-container-low p-2 rounded-full transition-colors"
            title="Settings & Profile"
          >
            <span className="material-symbols-outlined text-xl sm:text-2xl">settings</span>
          </button>

          {/* User Profile Dropdown Menu */}
          <div className="relative">
            <button
              onClick={() => setProfileMenuOpen((prev) => !prev)}
              className="flex items-center gap-2 p-1 rounded-full hover:ring-2 hover:ring-primary-fixed transition-all"
            >
              <img
                src={userAvatar}
                alt="User Avatar"
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover border border-outline-variant"
              />
            </button>

            {/* Profile Dropdown */}
            {profileMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-floating p-2 z-50 animate-fade-in text-on-surface">
                <div className="px-3 py-2 border-b border-outline-variant/60">
                  <p className="text-xs font-bold text-on-surface truncate">{userName}</p>
                  <p className="text-[11px] text-on-surface-variant truncate">{user?.email || "alex.patient@healthbuddy.io"}</p>
                </div>
                <div className="py-1">
                  <button
                    onClick={() => {
                      setProfileMenuOpen(false);
                      navigate("/profile");
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-semibold hover:bg-surface-container-low rounded-xl flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-base">person</span>
                    <span>Patient Profile</span>
                  </button>
                  <button
                    onClick={() => {
                      setProfileMenuOpen(false);
                      navigate("/history");
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-semibold hover:bg-surface-container-low rounded-xl flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-base">description</span>
                    <span>Health Records</span>
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-3 py-2 text-xs font-bold text-error hover:bg-error-container/40 rounded-xl flex items-center gap-2 mt-1"
                  >
                    <span className="material-symbols-outlined text-base">logout</span>
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </header>
  );
}
