import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import toast from "react-hot-toast";
import { downloadFileSafe } from "@/utils/mobileDownloadHelper";
import {
  getAllDocuments,
  getActiveDocument,
  setActiveDocumentId,
  toggleDocumentMedication,
  getMedicationTrackerState
} from "@/services/documentDashboardService";

export default function Home({ onOpenMedicalId, onOpenBookAppointment, onOpenTelehealth }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();

  // Document list and active document
  const [documents, setDocuments] = useState(() => getAllDocuments());
  const [activeDocId, setActiveDocId] = useState(() => getActiveDocument()?.id);
  const [medTracker, setMedTracker] = useState(() => getMedicationTrackerState());
  const [showRawText, setShowRawText] = useState(false);

  // Re-sync documents on storage changes or custom event
  const refreshDocuments = () => {
    const all = getAllDocuments();
    setDocuments(all);
    const active = getActiveDocument();
    if (active) {
      setActiveDocId(active.id);
    }
    setMedTracker(getMedicationTrackerState());
  };

  useEffect(() => {
    refreshDocuments();

    const handleDocChange = (e) => {
      if (e.detail?.id) {
        setActiveDocId(e.detail.id);
      }
      refreshDocuments();
    };

    const handleMedToggle = () => {
      setMedTracker(getMedicationTrackerState());
    };

    window.addEventListener("storage", refreshDocuments);
    window.addEventListener("healthbuddy:document-changed", handleDocChange);
    window.addEventListener("healthbuddy:medication-toggled", handleMedToggle);

    return () => {
      window.removeEventListener("storage", refreshDocuments);
      window.removeEventListener("healthbuddy:document-changed", handleDocChange);
      window.removeEventListener("healthbuddy:medication-toggled", handleMedToggle);
    };
  }, []);

  // Compute active document data
  const activeDoc = useMemo(() => {
    return documents.find((d) => String(d.id) === String(activeDocId)) || documents[0] || null;
  }, [documents, activeDocId]);

  const handleSelectDocument = (docId) => {
    setActiveDocumentId(docId);
    setActiveDocId(docId);
    toast.success("Dashboard synced with selected document! 📄");
  };

  // Medication checklist handling
  const docMedications = useMemo(() => {
    if (!activeDoc || !activeDoc.medicines) return [];
    return activeDoc.medicines.map((m) => ({
      ...m,
      taken: medTracker[m.id] !== undefined ? medTracker[m.id] : m.taken
    }));
  }, [activeDoc, medTracker]);

  const toggleMedication = (medId, currentTaken, medName) => {
    const next = !currentTaken;
    toggleDocumentMedication(medId, next);
    setMedTracker((prev) => ({ ...prev, [medId]: next }));
    toast.success(next ? `Marked ${medName} as taken! 💊` : `Marked ${medName} as pending.`);
  };

  // Compute Adherence Rate
  const adherenceRate = useMemo(() => {
    if (docMedications.length === 0) return 100;
    const takenCount = docMedications.filter((m) => m.taken).length;
    return Math.round((takenCount / docMedications.length) * 100);
  }, [docMedications]);

  const rawPatientName = activeDoc?.patient || user?.name || user?.username || "Alex";
  
  // Clean first name extractor
  const cleanDisplayName = useMemo(() => {
    let raw = rawPatientName;
    raw = raw.replace(/\(.*?\)/g, "");
    raw = raw.replace(/Mob.*$/gi, "");
    raw = raw.replace(/Mr\.|Mrs\.|Ms\.|Dr\./gi, "");
    raw = raw.trim();
    const first = raw.split(/[\s,]+/)[0];
    return first || "Alex";
  }, [rawPatientName]);

  const doctorName = activeDoc?.doctor || "Dr. Sarah Jenkins";
  const hospitalName = activeDoc?.hospital || "City Care Super Speciality Hospital";

  // Vitals from Document
  const bpValue = activeDoc?.vitals?.bp || "120/80 mmHg";
  const pulseValue = activeDoc?.vitals?.pulse || "72 bpm";
  const pulseNum = parseInt(pulseValue) || 72;
  const tempValue = activeDoc?.vitals?.temp || "98.6 °F";
  const weightValue = activeDoc?.vitals?.weight || "68 kg";
  const spo2Value = activeDoc?.vitals?.spo2 || "98%";

  const handleDownloadActiveDoc = async () => {
    if (!activeDoc) {
      toast.error("No active document selected");
      return;
    }
    const reportText = `======================================================================
HEALTHBUDDY - CLINICAL DOCUMENT SUMMARY
======================================================================
Title       : ${activeDoc.title || "Clinical Prescription"}
Date        : ${activeDoc.date || "Recent"}
Doctor      : ${activeDoc.doctor || "Medical Consultant"}
Specialty   : ${activeDoc.doctorDegree || "General Medicine"}
Hospital    : ${activeDoc.hospital || "Medical Center"}
Patient     : ${cleanDisplayName}
Diagnosis   : ${activeDoc.diagnosis || "Clinical Evaluation"}

----------------------------------------------------------------------
RECORDED VITALS
----------------------------------------------------------------------
Blood Pressure     : ${bpValue}
Pulse Rate         : ${pulseValue}
Temperature        : ${tempValue}
Weight & SpO2      : ${weightValue} | SpO2: ${spo2Value}

----------------------------------------------------------------------
PRESCRIBED MEDICINES
----------------------------------------------------------------------
${
  docMedications && docMedications.length > 0
    ? docMedications.map((m, i) => `${i + 1}. ${m.name} (${m.dosage || m.frequency})\n   Timing: ${m.timing || "As directed"} | Status: ${m.taken ? "[TAKEN]" : "[PENDING]"}`).join("\n\n")
    : "No medications listed"
}

----------------------------------------------------------------------
DOCTOR'S CLINICAL ADVICE & DIET
----------------------------------------------------------------------
${
  activeDoc.advice && activeDoc.advice.length > 0
    ? activeDoc.advice.map((a, i) => `${i + 1}. ${a}`).join("\n")
    : "Follow clinical advice and prescribed schedule."
}

======================================================================
Generated via HEALTHBUDDY AI Platform.
`;

    const filename = `HEALTHBUDDY-${(activeDoc.title || "Prescription").replace(/[^a-zA-Z0-9]/g, "_")}.txt`;
    await downloadFileSafe(filename, reportText, "text/plain;charset=utf-8");
  };

  return (
    <div className="space-y-5 sm:space-y-6 animate-fade-in w-full max-w-full overflow-hidden">
      
      {/* ============================================================ */}
      {/* 1. DOCUMENT CONNECTION & SOURCE BAR (TOP CONTROL PANEL) */}
      {/* ============================================================ */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-3.5 sm:p-5 shadow-card flex flex-col md:flex-row justify-between items-start md:items-center gap-3.5 w-full max-w-full overflow-hidden">
        <div className="flex items-center gap-3 min-w-0 w-full md:w-auto">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-primary text-white flex items-center justify-center shadow-sm flex-shrink-0">
            <span className="material-symbols-outlined text-xl sm:text-2xl font-bold" style={{ fontVariationSettings: "'FILL' 1" }}>
              description
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-manrope font-bold text-xs sm:text-base text-on-surface truncate max-w-[180px] sm:max-w-xs">
                {activeDoc?.title || t("Clinical Prescription Record")}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold bg-primary-fixed text-on-primary-fixed">
                {activeDoc?.badge ? t(activeDoc.badge) : t("Active Doc")}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold bg-secondary-container text-on-secondary-container flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse"></span>
                <span className="hidden xs:inline">{t("Connected")}</span>
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-on-surface-variant mt-0.5 truncate">
              {doctorName.split("(")[0].trim()} • {hospitalName.split(",")[0].trim()}
            </p>
          </div>
        </div>

        {/* Document Switcher & Quick Actions */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-start md:justify-end min-w-0">
          <div className="relative w-full sm:w-auto min-w-0 flex-1 sm:flex-none">
            <select
              value={activeDocId}
              onChange={(e) => handleSelectDocument(e.target.value)}
              className="w-full sm:w-auto max-w-full bg-surface-container-low border border-outline-variant text-on-surface text-xs font-bold rounded-full py-2 pl-3 pr-8 outline-none focus:border-primary cursor-pointer hover:bg-surface-container transition-all truncate"
            >
              {documents.map((d) => (
                <option key={d.id} value={d.id}>
                  📄 {d.title?.slice(0, 22)}... ({d.date || "Recent"})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto justify-between sm:justify-start flex-wrap">
            <button
              onClick={() => setShowRawText((prev) => !prev)}
              className="flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-full border border-outline-variant bg-surface-container-lowest hover:bg-surface-container text-on-surface text-xs font-bold transition-all flex-1 sm:flex-none"
              title="Inspect raw extracted OCR text"
            >
              <span className="material-symbols-outlined text-sm">visibility</span>
              <span>{showRawText ? t("Hide") : t("View")}</span>
            </button>

            <button
              onClick={handleDownloadActiveDoc}
              className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-full bg-secondary text-white hover:bg-secondary-fixed-dim text-xs font-bold transition-all flex-1 sm:flex-none shadow-xs"
              title="Download active prescription file"
            >
              <span className="material-symbols-outlined text-sm">download</span>
              <span className="truncate">{t("Download Rx")}</span>
            </button>

            <button
              onClick={() => navigate("/upload")}
              className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-full bg-primary text-white text-xs font-bold hover:bg-primary-container transition-all shadow-xs flex-1 sm:flex-none"
            >
              <span className="material-symbols-outlined text-sm">upload_file</span>
              <span className="truncate">{t("Upload")}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Optional Raw Document Text Drawer */}
      {showRawText && activeDoc?.rawText && (
        <div className="bg-surface-container-low border border-outline-variant rounded-2xl p-4 sm:p-5 shadow-inner text-xs animate-fade-in w-full max-w-full">
          <div className="flex justify-between items-center mb-2">
            <span className="font-bold text-on-surface font-manrope flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary text-sm">article</span>
              Extracted OCR Stream:
            </span>
            <button
              onClick={() => setShowRawText(false)}
              className="text-on-surface-variant hover:text-on-surface text-xs font-bold"
            >
              {t("Hide")}
            </button>
          </div>
          <pre className="whitespace-pre-wrap font-mono text-[11px] text-on-surface-variant bg-surface-container-lowest p-3 rounded-xl border border-outline-variant/60 max-h-48 overflow-y-auto">
            {activeDoc.rawText}
          </pre>
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. WELCOME HERO SECTION */}
      {/* ============================================================ */}
      <section className="flex flex-col gap-0.5">
        <h2 className="font-manrope text-xl sm:text-2xl md:text-headline-lg font-bold text-on-background tracking-tight truncate">
          {t("Good morning")}, {cleanDisplayName}
        </h2>
        <p className="font-sans text-xs sm:text-sm text-on-surface-variant">
          {t("Here is your comprehensive health overview for today.")}
        </p>
      </section>

      {/* ============================================================ */}
      {/* 3. QUICK ACTIONS (BENTO GRID STYLE) */}
      {/* ============================================================ */}
      <section className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6 w-full max-w-full">
        {/* Book Appointment */}
        <button
          onClick={onOpenBookAppointment}
          className="flex flex-col items-start justify-between p-4 sm:p-6 bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-card hover:bg-surface-container-low transition-colors h-28 sm:h-36 md:h-40 group text-left cursor-pointer min-w-0"
        >
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary-fixed flex items-center justify-center text-on-primary-fixed group-hover:scale-110 transition-transform shadow-xs flex-shrink-0">
            <span className="material-symbols-outlined text-xl sm:text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              calendar_add_on
            </span>
          </div>
          <span className="font-manrope text-xs sm:text-base md:text-lg font-bold text-on-surface leading-tight">
            {t("Book Appointment")}
          </span>
        </button>

        {/* Talk to Doctor / AI Assistant */}
        <button
          onClick={() => navigate("/assistant")}
          className="flex flex-col items-start justify-between p-4 sm:p-6 bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-card hover:bg-surface-container-low transition-colors h-28 sm:h-36 md:h-40 group text-left cursor-pointer min-w-0"
        >
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-secondary-fixed flex items-center justify-center text-on-secondary-fixed group-hover:scale-110 transition-transform shadow-xs flex-shrink-0">
            <span className="material-symbols-outlined text-xl sm:text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              video_camera_front
            </span>
          </div>
          <span className="font-manrope text-xs sm:text-base md:text-lg font-bold text-on-surface leading-tight">
            {t("Talk to Doctor")}
          </span>
        </button>

        {/* Order / Scan Medicine */}
        <button
          onClick={() => navigate("/upload")}
          className="col-span-2 md:col-span-1 flex flex-row md:flex-col items-center md:items-start justify-between p-4 sm:p-6 bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-card hover:bg-surface-container-low transition-colors h-20 sm:h-28 md:h-40 group relative overflow-hidden text-left cursor-pointer min-w-0"
        >
          <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-4 translate-y-4 pointer-events-none">
            <span className="material-symbols-outlined text-[60px] sm:text-[80px]">medication</span>
          </div>
          <div className="flex items-center gap-3 md:block">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-tertiary-fixed flex items-center justify-center text-on-tertiary-fixed group-hover:scale-110 transition-transform z-10 shadow-xs flex-shrink-0">
              <span className="material-symbols-outlined text-xl sm:text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                local_pharmacy
              </span>
            </div>
            <span className="font-manrope text-xs sm:text-base md:text-lg font-bold text-on-surface z-10 leading-tight">
              {t("Scan & Order Medicine")}
            </span>
          </div>
          <span className="material-symbols-outlined text-on-surface-variant text-base md:hidden">chevron_right</span>
        </button>
      </section>

      {/* ============================================================ */}
      {/* 4. UPCOMING APPOINTMENTS & HEALTH SNAPSHOT */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 w-full max-w-full">
        
        {/* Upcoming Appointments */}
        <section className="lg:col-span-2 space-y-3 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="font-manrope text-base sm:text-lg font-bold text-on-background flex items-center gap-2 truncate">
              <span className="material-symbols-outlined text-primary text-lg sm:text-xl">event_available</span>
              <span>{t("Upcoming Appointments")}</span>
            </h3>
            <button 
              onClick={onOpenBookAppointment}
              className="text-xs font-bold text-primary hover:underline flex-shrink-0"
            >
              {t("View All")}
            </button>
          </div>

          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-card p-4 sm:p-6 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between min-w-0">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
              <div className="flex-shrink-0 flex flex-col items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-primary-container rounded-2xl text-on-primary-container shadow-sm">
                <span className="font-manrope text-lg sm:text-2xl font-extrabold leading-none">14</span>
                <span className="text-[9px] sm:text-xs font-bold uppercase tracking-wider mt-0.5">Oct</span>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 bg-secondary-fixed text-on-secondary-fixed rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-wider">
                    {t("Confirmed")}
                  </span>
                  <span className="text-[11px] sm:text-xs text-on-surface-variant flex items-center gap-1 font-semibold">
                    <span className="material-symbols-outlined text-xs sm:text-sm">schedule</span> 10:30 AM
                  </span>
                </div>
                <h4 className="font-manrope text-sm sm:text-lg font-bold text-on-surface truncate">
                  {doctorName.split("(")[0].trim()}
                </h4>
                <p className="text-xs text-on-surface-variant font-medium truncate">
                  {hospitalName.split(",")[0].trim()} • Consultation
                </p>
              </div>
            </div>

            <div className="w-full md:w-auto flex gap-2 pt-1 md:pt-0">
              <button
                onClick={onOpenBookAppointment}
                className="flex-1 md:flex-none px-4 py-2 rounded-full border border-primary text-primary text-xs font-bold hover:bg-surface-container-low transition-colors text-center"
              >
                {t("Reschedule")}
              </button>
              <button
                onClick={onOpenTelehealth}
                className="flex-1 md:flex-none px-5 py-2 rounded-full bg-primary text-on-primary text-xs font-bold hover:bg-primary-container transition-colors shadow-xs text-center"
              >
                {t("Join Call")}
              </button>
            </div>
          </div>
        </section>

        {/* Health Snapshot */}
        <section className="space-y-3 min-w-0">
          <h3 className="font-manrope text-base sm:text-lg font-bold text-on-background flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-lg sm:text-xl">monitor_heart</span>
            <span>{t("Health Snapshot")}</span>
          </h3>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {/* Heart Rate */}
            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-card p-3.5 sm:p-4 flex flex-col justify-between min-w-0">
              <div className="flex items-center gap-1.5 text-on-surface-variant mb-1.5">
                <span className="material-symbols-outlined text-secondary text-base sm:text-xl">favorite</span>
                <span className="text-[11px] sm:text-xs font-bold truncate">{t("Heart Rate")}</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="font-manrope text-2xl sm:text-3xl font-extrabold text-on-surface">{pulseNum}</span>
                <span className="text-[11px] sm:text-xs font-semibold text-on-surface-variant">bpm</span>
              </div>
              <div className="w-full h-1.5 bg-surface-container-high rounded-full overflow-hidden mt-2.5">
                <div className="w-[65%] h-full bg-secondary rounded-full"></div>
              </div>
            </div>

            {/* Hydration */}
            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-card p-3.5 sm:p-4 flex flex-col justify-between min-w-0">
              <div className="flex items-center gap-1.5 text-on-surface-variant mb-1.5">
                <span className="material-symbols-outlined text-primary text-base sm:text-xl">water_drop</span>
                <span className="text-[11px] sm:text-xs font-bold truncate">{t("Hydration")}</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="font-manrope text-2xl sm:text-3xl font-extrabold text-on-surface">1.8</span>
                <span className="text-[11px] sm:text-xs font-semibold text-on-surface-variant">/ 2.5L</span>
              </div>
              <div className="w-full h-1.5 bg-surface-container-high rounded-full overflow-hidden mt-2.5">
                <div className="w-[72%] h-full bg-primary rounded-full"></div>
              </div>
            </div>
          </div>
        </section>

      </div>

      {/* ============================================================ */}
      {/* 5. VITALS GRID */}
      {/* ============================================================ */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 w-full max-w-full">
        {/* Blood Pressure */}
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-card p-3.5 sm:p-5 flex flex-col justify-between hover:border-primary/50 transition-all min-w-0">
          <div className="flex justify-between items-start mb-1.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-error-container/40 flex items-center justify-center text-error flex-shrink-0">
                <span className="material-symbols-outlined text-sm sm:text-lg">water_drop</span>
              </div>
              <h4 className="font-manrope text-xs sm:text-sm font-bold text-on-surface truncate">{t("Blood Pressure")}</h4>
            </div>
          </div>
          <div className="flex items-baseline gap-1 mb-1">
            <span className="font-manrope text-xl sm:text-3xl font-extrabold text-on-surface truncate">
              {bpValue.replace("mmHg", "").trim()}
            </span>
            <span className="text-[10px] sm:text-xs font-semibold text-on-surface-variant">mmHg</span>
          </div>
          <div className="flex items-center gap-1 text-secondary text-[10px] sm:text-xs font-bold truncate">
            <span className="material-symbols-outlined text-xs sm:text-sm flex-shrink-0">check_circle</span>
            <span className="truncate">{t("Normal clinical range")}</span>
          </div>
        </div>

        {/* Pulse Rate */}
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-card p-3.5 sm:p-5 flex flex-col justify-between hover:border-primary/50 transition-all min-w-0">
          <div className="flex justify-between items-start mb-1.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-primary-fixed/40 flex items-center justify-center text-primary flex-shrink-0">
                <span className="material-symbols-outlined text-sm sm:text-lg">favorite_border</span>
              </div>
              <h4 className="font-manrope text-xs sm:text-sm font-bold text-on-surface truncate">{t("Pulse Rate")}</h4>
            </div>
          </div>
          <div className="flex items-baseline gap-1 mb-1">
            <span className="font-manrope text-xl sm:text-3xl font-extrabold text-on-surface truncate">{pulseValue}</span>
          </div>
          <div className="flex items-center gap-1 text-on-surface-variant text-[10px] sm:text-xs font-bold truncate">
            <span className="material-symbols-outlined text-xs sm:text-sm text-secondary flex-shrink-0">trending_flat</span>
            <span className="truncate">{t("Resting assessed")}</span>
          </div>
        </div>

        {/* Temperature */}
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-card p-3.5 sm:p-5 flex flex-col justify-between hover:border-primary/50 transition-all min-w-0">
          <div className="flex justify-between items-start mb-1.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-tertiary-fixed flex items-center justify-center text-tertiary flex-shrink-0">
                <span className="material-symbols-outlined text-sm sm:text-lg">thermostat</span>
              </div>
              <h4 className="font-manrope text-xs sm:text-sm font-bold text-on-surface truncate">{t("Temperature")}</h4>
            </div>
          </div>
          <div className="flex items-baseline gap-1 mb-1">
            <span className="font-manrope text-xl sm:text-3xl font-extrabold text-on-surface truncate">{tempValue}</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] sm:text-xs font-bold truncate">
            {tempValue.includes("10") ? (
              <span className="text-error flex items-center gap-1 truncate">
                <span className="material-symbols-outlined text-xs sm:text-sm flex-shrink-0">warning</span> {t("Febrile")}
              </span>
            ) : (
              <span className="text-secondary flex items-center gap-1 truncate">
                <span className="material-symbols-outlined text-xs sm:text-sm flex-shrink-0">check_circle</span> {t("Normal")}
              </span>
            )}
          </div>
        </div>

        {/* Weight & SpO2 */}
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-card p-3.5 sm:p-5 flex flex-col justify-between hover:border-primary/50 transition-all min-w-0">
          <div className="flex justify-between items-start mb-1.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-primary-fixed/40 flex items-center justify-center text-primary flex-shrink-0">
                <span className="material-symbols-outlined text-sm sm:text-lg">scale</span>
              </div>
              <h4 className="font-manrope text-xs sm:text-sm font-bold text-on-surface truncate">{t("Weight & SpO2")}</h4>
            </div>
          </div>
          <div className="flex items-baseline gap-1 mb-1">
            <span className="font-manrope text-lg sm:text-2xl font-extrabold text-on-surface truncate">{weightValue}</span>
            <span className="text-[10px] sm:text-xs font-bold text-on-surface-variant truncate">• {spo2Value}</span>
          </div>
          <div className="flex items-center gap-1 text-secondary text-[10px] sm:text-xs font-bold truncate">
            <span className="material-symbols-outlined text-xs sm:text-sm flex-shrink-0">check_circle</span>
            <span className="truncate">{t("Oxygen Saturation 98%")}</span>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 6. PRESCRIBED MEDICATIONS & CLINICAL ADVICE */}
      {/* ============================================================ */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 w-full max-w-full">
        
        {/* Active Prescribed Medications */}
        <div className="lg:col-span-7 bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 sm:p-6 shadow-card flex flex-col justify-between min-w-0">
          <div>
            <div className="flex justify-between items-center mb-3">
              <div className="min-w-0">
                <h3 className="font-manrope text-sm sm:text-lg font-bold text-on-surface flex items-center gap-2 truncate">
                  <span className="material-symbols-outlined text-primary text-base sm:text-xl">pill</span>
                  <span>{t("Active Prescribed Medications")}</span>
                </h3>
                <p className="text-[11px] sm:text-xs text-on-surface-variant mt-0.5 truncate">
                  {docMedications.length} {t("Active Prescribed Medications")}
                </p>
              </div>
              <button
                onClick={() => navigate("/upload")}
                className="text-primary hover:bg-primary-fixed/40 rounded-full p-1.5 transition-colors flex-shrink-0"
                title="Add Medication"
              >
                <span className="material-symbols-outlined text-lg sm:text-xl">add</span>
              </button>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {docMedications.map((med) => (
                <div
                  key={med.id}
                  onClick={() => toggleMedication(med.id, med.taken, med.name)}
                  className={`flex items-center p-2.5 sm:p-3 rounded-2xl border transition-all cursor-pointer select-none min-w-0 ${
                    med.taken
                      ? "bg-surface-container-low border-outline-variant/60 opacity-85"
                      : "bg-surface-container-lowest border-outline-variant hover:border-primary shadow-xs"
                  }`}
                >
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-surface-variant flex items-center justify-center text-primary mr-2.5 sm:mr-3 flex-shrink-0">
                    <span className="material-symbols-outlined text-base sm:text-xl">medication</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className={`font-manrope text-xs sm:text-sm font-bold truncate ${med.taken ? 'line-through text-on-surface-variant' : 'text-on-surface'}`}>
                      {med.name}
                    </h4>
                    <p className="text-[10px] sm:text-[11px] text-on-surface-variant truncate">
                      {med.dosage || med.frequency}
                    </p>
                  </div>

                  <div
                    className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 flex items-center justify-center transition-colors flex-shrink-0 ml-2 ${
                      med.taken
                        ? "bg-secondary border-secondary text-white"
                        : "border-outline-variant hover:border-primary"
                    }`}
                  >
                    {med.taken && (
                      <span className="material-symbols-outlined text-xs sm:text-sm font-bold">check</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-3.5 pt-2.5 border-t border-outline-variant flex items-center justify-between text-xs">
            <span className="text-on-surface-variant font-medium">{t("Daily Adherence Rate")}</span>
            <span className="font-bold text-secondary">{adherenceRate}% {t("Completed")}</span>
          </div>
        </div>

        {/* Doctor's Advice */}
        <div className="lg:col-span-5 bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 sm:p-6 shadow-card flex flex-col justify-between min-w-0">
          <div>
            <h3 className="font-manrope text-sm sm:text-lg font-bold text-on-surface flex items-center gap-2 mb-1 truncate">
              <span className="material-symbols-outlined text-secondary text-base sm:text-xl">health_and_safety</span>
              <span>{t("Doctor's Clinical Advice")}</span>
            </h3>
            <p className="text-[11px] sm:text-xs text-on-surface-variant mb-3 truncate">
              {t("Guidelines from")} {doctorName.split("(")[0].trim()}
            </p>

            <div className="space-y-2">
              {activeDoc?.advice && activeDoc.advice.length > 0 ? (
                activeDoc.advice.slice(0, 4).map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-on-surface bg-surface-container-low p-2 sm:p-2.5 rounded-xl border border-outline-variant/60 min-w-0">
                    <span className="material-symbols-outlined text-secondary text-sm sm:text-base flex-shrink-0 mt-0.5">
                      check_circle
                    </span>
                    <span className="leading-snug font-medium break-words">{item}</span>
                  </div>
                ))
              ) : (
                <div className="text-xs text-on-surface-variant">
                  Follow prescribed dosage and maintain adequate hydration.
                </div>
              )}
            </div>
          </div>

          <div className="mt-3.5 pt-2.5 border-t border-outline-variant flex items-center justify-between text-xs text-on-surface-variant font-semibold">
            <span>{t("Specialty")}</span>
            <span className="text-primary font-bold">{t(activeDoc?.doctorDegree || "General Medicine")}</span>
          </div>
        </div>

      </section>

      {/* ============================================================ */}
      {/* 7. HEALTH TIPS CAROUSEL */}
      {/* ============================================================ */}
      <section className="space-y-3 pb-8 w-full max-w-full">
        <div className="flex items-center justify-between">
          <h3 className="font-manrope text-base sm:text-lg font-bold text-on-background flex items-center gap-2 truncate">
            <span className="material-symbols-outlined text-primary text-base sm:text-xl">lightbulb</span>
            <span>{t("Recommended for You")}</span>
          </h3>
          <span className="text-[11px] sm:text-xs text-on-surface-variant font-semibold flex-shrink-0">{t("Insights")}</span>
        </div>

        <div className="flex overflow-x-auto gap-3.5 pb-2 hide-scrollbar w-full max-w-full">
          {/* Card 1: Nutrition */}
          <div className="flex-shrink-0 w-64 sm:w-80 rounded-2xl overflow-hidden border border-outline-variant shadow-card relative bg-surface-container-lowest group cursor-pointer hover:border-primary transition-all">
            <div
              className="h-32 sm:h-40 w-full bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
              style={{
                backgroundImage: `url('https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=500&auto=format&fit=crop&q=80')`
              }}
            ></div>
            <div className="absolute top-2.5 left-2.5 bg-primary text-on-primary px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider shadow-xs">
              {t("Nutrition")}
            </div>
            <div className="p-3.5 bg-surface-container-lowest relative z-10">
              <h4 className="font-manrope text-xs sm:text-sm font-bold text-on-surface mb-1 group-hover:text-primary transition-colors truncate">
                {t("The Importance of Daily Hydration")}
              </h4>
              <p className="text-[11px] sm:text-xs text-on-surface-variant line-clamp-2 leading-relaxed">
                {t("Staying hydrated is crucial for maintaining energy levels, kidney function, and cognitive focus...")}
              </p>
            </div>
          </div>

          {/* Card 2: Fitness */}
          <div className="flex-shrink-0 w-64 sm:w-80 rounded-2xl overflow-hidden border border-outline-variant shadow-card relative bg-surface-container-lowest group cursor-pointer hover:border-secondary transition-all">
            <div
              className="h-32 sm:h-40 w-full bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
              style={{
                backgroundImage: `url('https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=500&auto=format&fit=crop&q=80')`
              }}
            ></div>
            <div className="absolute top-2.5 left-2.5 bg-secondary text-on-secondary px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider shadow-xs">
              {t("Fitness")}
            </div>
            <div className="p-3.5 bg-surface-container-lowest relative z-10">
              <h4 className="font-manrope text-xs sm:text-sm font-bold text-on-surface mb-1 group-hover:text-secondary transition-colors truncate">
                {t("5 Gentle Exercises for Heart Health")}
              </h4>
              <p className="text-[11px] sm:text-xs text-on-surface-variant line-clamp-2 leading-relaxed">
                {t("Incorporate low-impact brisk walking, stretching, and breathing into your daily routine...")}
              </p>
            </div>
          </div>

          {/* Card 3: Mental Health */}
          <div className="flex-shrink-0 w-64 sm:w-80 rounded-2xl overflow-hidden border border-outline-variant shadow-card relative bg-surface-container-lowest group cursor-pointer hover:border-tertiary transition-all">
            <div className="h-32 sm:h-40 w-full bg-primary-container flex items-center justify-center transition-transform duration-500 group-hover:scale-105">
              <span className="material-symbols-outlined text-5xl text-on-primary-container opacity-60">
                self_improvement
              </span>
            </div>
            <div className="absolute top-2.5 left-2.5 bg-tertiary text-on-tertiary px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider shadow-xs">
              {t("Mental Health")}
            </div>
            <div className="p-3.5 bg-surface-container-lowest relative z-10">
              <h4 className="font-manrope text-xs sm:text-sm font-bold text-on-surface mb-1 group-hover:text-tertiary transition-colors truncate">
                {t("Managing Medical Anxiety")}
              </h4>
              <p className="text-[11px] sm:text-xs text-on-surface-variant line-clamp-2 leading-relaxed">
                {t("Simple mindfulness and clinical grounding techniques to stay calm before checkups...")}
              </p>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}