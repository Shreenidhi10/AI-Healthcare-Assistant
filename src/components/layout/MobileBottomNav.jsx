import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

export default function MobileBottomNav({ onOpenMedicalId }) {
  const location = useLocation();
  const { t } = useLanguage();

  const navItems = [
    { path: "/home", label: t("Overview"), icon: "home", match: ["/home", "/dashboard", "/results"] },
    { path: "/assistant", label: t("AI Chat"), icon: "smart_toy", badge: "AI", match: ["/assistant", "/chat"] },
    { path: "/upload", label: t("Scan Rx"), icon: "document_scanner", match: ["/upload"] },
    { path: "/history", label: t("Records"), icon: "dashboard", match: ["/history", "/prescription"] },
    { path: "/profile", label: t("Profile"), icon: "person", match: ["/profile"] },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 w-full flex justify-around items-center py-2 px-3 bg-surface/95 backdrop-blur-md border-t border-outline-variant shadow-lg z-50 pb-[max(8px,env(safe-area-inset-bottom))]">
      {navItems.map((item) => {
        const isActive = item.match.some((p) => location.pathname.startsWith(p));

        return (
          <Link
            key={item.path}
            to={item.path}
            className={`relative flex flex-col items-center justify-center transition-transform duration-150 active:scale-90 ${
              isActive
                ? "bg-secondary-container text-on-secondary-container rounded-full px-3 py-1 font-bold shadow-xs scale-95"
                : "text-on-surface-variant hover:bg-surface-container px-3 py-1 rounded-full scale-95"
            }`}
          >
            <div className="relative">
              <span
                className="material-symbols-outlined text-2xl leading-none"
                style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
              >
                {item.icon}
              </span>
              {item.badge && !isActive && (
                <span className="absolute -top-1 -right-2 bg-primary text-white text-[8px] font-extrabold px-1 rounded-full">
                  {item.badge}
                </span>
              )}
            </div>
            <span className="text-[10px] font-bold tracking-tight mt-0.5 leading-none truncate max-w-[56px]">
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
