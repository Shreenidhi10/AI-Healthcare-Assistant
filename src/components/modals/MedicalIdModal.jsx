import React, { useState } from "react";
import toast from "react-hot-toast";
import { downloadMedicalIdCard } from "@/utils/mobileDownloadHelper";

export default function MedicalIdModal({ isOpen, onClose, user }) {
  if (!isOpen) return null;

  const userName = user?.name || user?.full_name || user?.username || "Alex Henderson";
  const userPhone = user?.phone_number || "+91 98765 43210";
  const userEmail = user?.email || "alex.patient@healthbuddy.io";

  const handleDownload = async () => {
    await downloadMedicalIdCard(user, { bloodGroup: "O+", dob: "14 Aug 1994" });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-surface-container-lowest w-full max-w-lg rounded-3xl border border-outline-variant shadow-floating overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-primary text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
          >
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
          
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                badge
              </span>
            </div>
            <div>
              <h2 className="font-manrope text-xl font-bold">Universal Medical ID</h2>
              <p className="text-xs text-primary-fixed-dim">Emergency Health Passport • HEALTHBUDDY Network</p>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between bg-primary-container/80 p-3 rounded-2xl border border-white/10">
            <div>
              <p className="text-xs text-primary-fixed">Patient Name</p>
              <p className="font-manrope text-base font-bold">{userName}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-primary-fixed">Patient ID</p>
              <p className="font-mono text-sm font-bold text-secondary-fixed">#MP-984210</p>
            </div>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          
          {/* Critical Emergency Banner */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-surface-container-low p-3 rounded-2xl border border-outline-variant text-center">
              <p className="text-[11px] font-bold text-on-surface-variant uppercase">Blood Type</p>
              <p className="text-2xl font-bold font-manrope text-error mt-0.5">O+ Positive</p>
            </div>
            <div className="bg-surface-container-low p-3 rounded-2xl border border-outline-variant text-center">
              <p className="text-[11px] font-bold text-on-surface-variant uppercase">Donor Status</p>
              <p className="text-base font-bold font-manrope text-secondary mt-1">Organ Donor</p>
            </div>
            <div className="bg-surface-container-low p-3 rounded-2xl border border-outline-variant text-center">
              <p className="text-[11px] font-bold text-on-surface-variant uppercase">Height / Weight</p>
              <p className="text-sm font-bold font-manrope text-on-surface mt-1">5'10" • 165 lbs</p>
            </div>
          </div>

          {/* Allergies & Conditions */}
          <div className="space-y-3">
            <div className="bg-error-container/30 border border-error/30 p-3.5 rounded-2xl">
              <div className="flex items-center gap-2 text-error font-bold text-xs uppercase tracking-wider mb-1">
                <span className="material-symbols-outlined text-sm">warning</span>
                <span>Allergies & Reactions</span>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-1">
                <span className="px-2.5 py-1 bg-white border border-error/40 text-error text-xs font-bold rounded-lg shadow-sm">
                  ⚠️ Penicillin (Severe)
                </span>
                <span className="px-2.5 py-1 bg-white border border-outline-variant text-on-surface text-xs font-medium rounded-lg shadow-sm">
                  Peanuts (Mild)
                </span>
              </div>
            </div>

            <div className="bg-surface-container-low p-3.5 rounded-2xl border border-outline-variant">
              <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider mb-1">
                <span className="material-symbols-outlined text-sm">medical_services</span>
                <span>Active Medical Conditions</span>
              </div>
              <p className="text-xs text-on-surface font-semibold">
                • Mild Hypertension (Stage 1) • Seasonal Allergic Rhinitis
              </p>
            </div>

            <div className="bg-surface-container-low p-3.5 rounded-2xl border border-outline-variant">
              <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider mb-1">
                <span className="material-symbols-outlined text-sm">contact_emergency</span>
                <span>Primary Emergency Contact</span>
              </div>
              <div className="flex items-center justify-between text-xs mt-1">
                <div>
                  <p className="font-bold text-on-surface">Sarah Henderson (Spouse)</p>
                  <p className="text-on-surface-variant">+91 98765 43210</p>
                </div>
                <a 
                  href="tel:+919876543210"
                  className="px-3 py-1.5 bg-secondary text-white font-bold rounded-full flex items-center gap-1 hover:bg-secondary/90 shadow-sm"
                >
                  <span className="material-symbols-outlined text-xs">call</span>
                  <span>Call ICE</span>
                </a>
              </div>
            </div>
          </div>

          {/* QR Code Emergency Scan */}
          <div className="flex items-center gap-4 p-3 bg-surface-container rounded-2xl border border-outline-variant">
            <div className="w-16 h-16 bg-white p-1 rounded-xl border border-outline-variant flex items-center justify-center flex-shrink-0">
              <img 
                src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=MEDPULSE_ID_MP984210_ALEX_O_POS" 
                alt="Emergency QR"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h4 className="font-manrope text-xs font-bold text-on-surface">Instant Paramedic Scan</h4>
              <p className="text-[11px] text-on-surface-variant leading-snug">
                Emergency responders can scan this QR code to access offline medical history securely.
              </p>
            </div>
          </div>

        </div>

        {/* Footer actions */}
        <div className="p-4 bg-surface-container-low border-t border-outline-variant flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-on-surface-variant hover:text-on-surface transition-colors"
          >
            Close
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-xs font-bold rounded-full hover:bg-primary-container transition-all shadow-sm"
          >
            <span className="material-symbols-outlined text-sm">download</span>
            <span>Download Digital ID</span>
          </button>
        </div>

      </div>
    </div>
  );
}
