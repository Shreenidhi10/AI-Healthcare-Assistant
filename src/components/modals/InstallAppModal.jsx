import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";

let deferredInstallPrompt = null;

// Catch beforeinstallprompt globally
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
  });
}

export default function InstallAppModal({ isOpen, onClose }) {
  const [deferredPrompt, setDeferredPrompt] = useState(deferredInstallPrompt);
  const isIOS = typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = typeof navigator !== "undefined" && /Android/.test(navigator.userAgent);

  useEffect(() => {
    const handlePrompt = (e) => {
      e.preventDefault();
      deferredInstallPrompt = e;
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handlePrompt);
    return () => window.removeEventListener("beforeinstallprompt", handlePrompt);
  }, []);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        toast.success("HealthBuddy app installed successfully! 🎉");
        onClose();
      }
      setDeferredPrompt(null);
      deferredInstallPrompt = null;
    } else if (isIOS) {
      toast("Follow the steps below to add to your Home Screen", { icon: "📱" });
    } else {
      toast("Use Chrome's menu (⋮) -> 'Install app' to download to your phone.", { icon: "📲" });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-surface-container-lowest w-full max-w-md rounded-3xl border border-outline-variant shadow-floating overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-primary text-white p-5 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
          >
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
          
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shadow-xs">
              <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                install_mobile
              </span>
            </div>
            <div>
              <h2 className="font-manrope text-lg font-bold leading-tight">Install HEALTHBUDDY App</h2>
              <p className="text-xs text-primary-fixed-dim mt-0.5">Offline-Ready Progressive Mobile App</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-on-surface">
          
          <div className="bg-surface-container-low p-3.5 rounded-2xl border border-outline-variant/60 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-secondary text-white flex items-center justify-center font-bold flex-shrink-0">
              <span className="material-symbols-outlined text-xl">offline_pin</span>
            </div>
            <div>
              <h4 className="font-manrope text-xs font-bold text-on-surface">Fast & Works Offline</h4>
              <p className="text-[11px] text-on-surface-variant leading-tight">
                No app store download needed. Installs in seconds directly to your phone.
              </p>
            </div>
          </div>

          {/* Direct 1-Click Install Button (if browser prompt available) */}
          {deferredPrompt && (
            <button
              onClick={handleInstallClick}
              className="w-full bg-primary text-white py-3 px-4 rounded-2xl text-xs font-bold hover:bg-primary-container transition-all flex items-center justify-center gap-2 shadow-md active:scale-98"
            >
              <span className="material-symbols-outlined text-lg">download</span>
              <span>Tap to Install on Phone</span>
            </button>
          )}

          {/* Step-by-step instructions for Android & iOS */}
          <div className="space-y-3 pt-2">
            <h4 className="font-manrope text-xs font-bold text-on-surface flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary text-base">help</span>
              <span>How to Install on your Phone:</span>
            </h4>

            {/* Android Instructions */}
            <div className="p-3 rounded-2xl bg-surface-container-lowest border border-outline-variant text-xs space-y-1.5">
              <span className="font-bold text-primary flex items-center gap-1 text-[11px] uppercase tracking-wider">
                <span className="material-symbols-outlined text-sm">android</span>
                For Android (Chrome / Brave / Edge):
              </span>
              <ol className="list-decimal list-inside text-on-surface-variant text-[11px] space-y-1 pl-1 leading-snug">
                <li>Tap the <strong>three dots menu (⋮)</strong> at the top-right of your browser.</li>
                <li>Tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.</li>
                <li>Tap <strong>Install</strong>. HealthBuddy will appear on your phone home screen!</li>
              </ol>
            </div>

            {/* iOS Instructions */}
            <div className="p-3 rounded-2xl bg-surface-container-lowest border border-outline-variant text-xs space-y-1.5">
              <span className="font-bold text-secondary flex items-center gap-1 text-[11px] uppercase tracking-wider">
                <span className="material-symbols-outlined text-sm">phone_iphone</span>
                For iPhone (Safari):
              </span>
              <ol className="list-decimal list-inside text-on-surface-variant text-[11px] space-y-1 pl-1 leading-snug">
                <li>Tap the <strong>Share button (⎋)</strong> at the bottom of Safari.</li>
                <li>Scroll down and tap <strong>"Add to Home Screen" (+)</strong>.</li>
                <li>Tap <strong>Add</strong> in the top-right corner.</li>
              </ol>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full mt-2 py-2.5 rounded-full border border-outline-variant text-on-surface text-xs font-bold hover:bg-surface-container-low transition-colors"
          >
            Got it, Close
          </button>
        </div>
      </div>
    </div>
  );
}
