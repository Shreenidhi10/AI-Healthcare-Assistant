import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";

export default function MedPulseSidebar({ onOpenMedicalId, isMobileOpen, onCloseMobile, onOpenInstallApp }) {
  const location = useLocation();
  const { user } = useAuth();
  const { t } = useLanguage();

  const userName = user?.name || user?.full_name || user?.username || "Alex";
  const userAvatar = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80";

  const navItems = [
    {
      path: "/home",
      label: t("Overview"),
      icon: "dashboard",
      activeMatch: ["/home", "/dashboard", "/results"],
    },
    {
      path: "/assistant",
      label: t("AI Assistant"),
      icon: "smart_toy",
      badge: "AI",
      activeMatch: ["/assistant", "/chat"],
    },
    {
      path: "/upload",
      label: t("Upload & OCR"),
      icon: "upload_file",
      activeMatch: ["/upload"],
    },
    {
      path: "/history",
      label: t("Medical Records"),
      icon: "description",
      activeMatch: ["/history", "/prescription"],
    },
    {
      path: "/profile",
      label: t("Health Profile"),
      icon: "account_circle",
      activeMatch: ["/profile"],
    },
  ];

  const sidebarContent = (
    <div className="flex flex-col p-4 gap-2 h-full">
      {/* Mobile Close Button */}
      {isMobileOpen && (
        <div className="flex lg:hidden justify-between items-center pb-2 border-b border-outline-variant">
          <span className="font-manrope font-extrabold text-primary text-base">HEALTHBUDDY</span>
          <button
            onClick={onCloseMobile}
            className="p-1.5 rounded-full text-on-surface-variant hover:bg-surface-container"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>
      )}

      {/* User Card */}
      <div className="mb-3 flex flex-col items-center text-center p-3 rounded-2xl bg-surface-container-lowest border border-outline-variant/80 shadow-sm">
        <div className="relative mb-2">
          <img
            src={userAvatar}
            alt="User Profile"
            className="w-14 h-14 rounded-full object-cover border-2 border-primary shadow-sm"
          />
          <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-secondary-fixed border-2 border-white rounded-full"></span>
        </div>

        <h2 className="font-manrope text-sm font-bold text-on-surface">
          Welcome back, {userName}
        </h2>
        <p className="text-[11px] text-on-surface-variant mt-0.5">
          Patient ID: {user?.patient_id || "88231"}
        </p>

        <div className="flex gap-2 w-full mt-3">
          <button
            onClick={() => {
              if (onCloseMobile) onCloseMobile();
              onOpenMedicalId();
            }}
            className="flex-1 border border-primary text-primary py-1.5 px-2 rounded-full text-[11px] font-bold hover:bg-primary hover:text-white transition-all flex items-center justify-center gap-1 shadow-xs active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-sm">badge</span>
            <span>{t("Medical ID")}</span>
          </button>

          <button
            onClick={() => {
              if (onCloseMobile) onCloseMobile();
              if (onOpenInstallApp) onOpenInstallApp();
            }}
            className="border border-secondary text-secondary py-1.5 px-2.5 rounded-full text-[11px] font-bold hover:bg-secondary hover:text-white transition-all flex items-center justify-center gap-1 shadow-xs active:scale-[0.98]"
            title="Download / Install Mobile App"
          >
            <span className="material-symbols-outlined text-sm">install_mobile</span>
            <span>{t("Install")}</span>
          </button>
        </div>
      </div>

      {/* Navigation Section */}
      <nav className="flex flex-col gap-1.5 flex-grow">
        {navItems.map((item) => {
          const isActive = item.activeMatch.some((p) => location.pathname.startsWith(p));
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => onCloseMobile && onCloseMobile()}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                isActive
                  ? "bg-secondary-container text-on-secondary-container shadow-sm font-bold scale-[0.99]"
                  : "text-on-surface-variant hover:bg-surface-variant hover:text-on-surface"
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className="material-symbols-outlined text-xl"
                  style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
                >
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="px-2 py-0.5 bg-primary text-white text-[10px] font-extrabold rounded-full">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Install App Banner in Sidebar */}
      <div className="mt-auto pt-2">
        <button
          onClick={() => {
            if (onCloseMobile) onCloseMobile();
            if (onOpenInstallApp) onOpenInstallApp();
          }}
          className="w-full bg-surface-container-lowest p-3 rounded-2xl border border-secondary/40 hover:border-secondary transition-all text-left shadow-xs group mb-2"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-secondary text-white flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-base">download_for_offline</span>
              </span>
              <div>
                <span className="font-manrope text-xs font-bold text-on-surface group-hover:text-secondary block">
                  {t("Download Mobile App")}
                </span>
                <span className="text-[10px] text-on-surface-variant block">
                  {t("Add to Phone Home Screen")}
                </span>
              </div>
            </div>
            <span className="material-symbols-outlined text-secondary text-base">arrow_forward</span>
          </div>
        </button>

        {/* AI Online Status */}
        <div className="bg-surface-container-lowest p-2.5 rounded-xl border border-outline-variant/60">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-on-surface flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-secondary animate-ping"></span>
              <span className="text-secondary font-bold text-[11px]">HEALTHBUDDY AI Online</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden lg:flex flex-col h-[calc(100vh-80px)] w-64 fixed left-0 top-20 bg-surface-container-low border-r border-outline-variant z-40 overflow-y-auto">
        {sidebarContent}
      </aside>

      {/* Mobile Slide-Out Drawer */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex animate-fade-in">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            onClick={onCloseMobile}
          ></div>
          <div className="relative w-72 max-w-[80vw] h-full bg-surface-container-low border-r border-outline-variant shadow-2xl z-10 overflow-y-auto flex flex-col">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
