import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  UploadCloud,
  Camera,
  FileText,
  Sparkles,
  RotateCw,
  SunMedium,
  Contrast,
  Languages,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import CameraCapture from "./CameraCapture";
import { SAMPLE_PRESCRIPTIONS } from "../utils/samplePrescriptions";
import { useLanguage } from "@/contexts/LanguageContext";

const OCR_LANGUAGES = [
  { code: "eng", name: "English" },
  { code: "hin", name: "Hindi (हिन्दी)" },
  { code: "ben", name: "Bengali (বাংলা)" },
  { code: "mar", name: "Marathi (मराठी)" },
  { code: "tel", name: "Telugu (తెలుగు)" },
  { code: "tam", name: "Tamil (தமிழ்)" },
  { code: "guj", name: "Gujarati (ગુજરાતી)" },
  { code: "kan", name: "Kannada (ಕನ್ನಡ)" },
  { code: "mal", name: "Malayalam (മലയാളം)" },
  { code: "pan", name: "Punjabi (ਪੰਜਾਬੀ)" },
];

function UploadSection({
  onImageChange,
  onExtract,
  onLoadSample,
  selectedLanguage,
  onLanguageChange,
  imageFilters,
  onFilterChange,
  activeFileName,
  activeFileSize,
  isProcessing,
}) {
  const { t } = useLanguage();
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState("");
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);

  const allowedTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/bmp",
    "image/tiff",
    "application/pdf",
  ];

  const validateAndSend = (file) => {
    setError("");
    if (!file) return;

    const isValidType =
      allowedTypes.includes(file.type) ||
      file.name.toLowerCase().endsWith(".pdf") ||
      file.name.toLowerCase().endsWith(".jpg") ||
      file.name.toLowerCase().endsWith(".png");

    if (!isValidType) {
      setError("Please select a valid image file (JPG, PNG, WebP, TIFF) or PDF document.");
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setError("File is too large. Please select a document under 25MB.");
      return;
    }

    onImageChange({ target: { files: [file] } });
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSend(e.target.files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSend(e.dataTransfer.files[0]);
    }
  };

  const handleCameraCapture = (file) => {
    validateAndSend(file);
    setIsCameraModalOpen(false);
  };

  return (
    <div className="space-y-5">
      {/* Top Header & Fast Test Samples */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <UploadCloud className="text-emerald-400 h-6 w-6" />
              {t("Medical Prescription & Certificate Scanner")}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {t("Upload prescription photo, doctor's clinic slip, or multi-page PDF medical certificate")}
            </p>
          </div>

          {/* OCR Primary Language Select */}
          <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700 shadow-sm">
            <Languages size={15} className="text-emerald-400 shrink-0" />
            <span className="text-[11px] font-medium text-slate-300">{t("OCR Lang")}:</span>
            <select
              value={selectedLanguage || "eng"}
              onChange={(e) => onLanguageChange(e.target.value)}
              className="bg-slate-900 text-xs font-semibold text-emerald-300 rounded-lg px-2 py-1 border border-slate-700 outline-none cursor-pointer focus:ring-1 focus:ring-emerald-400"
            >
              {OCR_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 1-Click Quick Sample Prescriptions */}
        <div className="mt-3.5 pt-3 border-t border-slate-800/80">
          <div className="flex items-center gap-1.5 mb-2 text-xs font-semibold text-slate-300">
            <Sparkles size={14} className="text-emerald-400" />
            <span>{t("Try 1-Click Medical Samples (Instant Test)")}:</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {SAMPLE_PRESCRIPTIONS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => onLoadSample(s)}
                className="text-left p-2.5 rounded-xl bg-slate-800/70 hover:bg-emerald-950/50 border border-slate-700 hover:border-emerald-500/50 transition-all group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                    {s.badge}
                  </span>
                </div>
                <p className="font-semibold text-xs text-white mt-1.5 line-clamp-1 group-hover:text-emerald-300">
                  {s.title}
                </p>
                <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                  {s.patient}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Drag & Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center transition-all duration-200 ${
          isDragging
            ? "border-emerald-400 bg-emerald-950/30 scale-[1.01]"
            : "border-slate-700 bg-slate-950/60 hover:border-slate-600 hover:bg-slate-950/80"
        }`}
      >
        <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-3.5 text-emerald-400 shadow-inner">
          <UploadCloud size={28} />
        </div>

        <h3 className="text-base font-bold text-white mb-1">
          {t("Drag & Drop Prescription, Medical Slip, or PDF")}
        </h3>
        <p className="text-xs text-slate-400 mb-4 max-w-md mx-auto">
          {t("Supports JPG, PNG, WebP, Camera Scans, and Multi-page PDF reports up to 25MB")}
        </p>

        {/* Buttons & Input */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition-all">
            <FileText size={15} />
            <span>{t("Choose File (Image / PDF)")}</span>
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.bmp,.tiff,.pdf,image/*,application/pdf"
              onChange={handleFileInputChange}
              className="hidden"
            />
          </label>

          <Button
            type="button"
            variant="outline"
            onClick={() => setIsCameraModalOpen(true)}
            className="border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs text-slate-200"
          >
            <Camera size={15} className="mr-1.5 text-emerald-400" />
            {t("Capture with Camera")}
          </Button>
        </div>

        {/* Selected file badge */}
        {activeFileName && (
          <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800 border border-emerald-500/40 text-xs text-emerald-300">
            <CheckCircle2 size={14} className="text-emerald-400" />
            <span className="font-semibold">{activeFileName}</span>
            {activeFileSize && <span className="text-slate-400">({activeFileSize})</span>}
          </div>
        )}

        {error && (
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950/60 border border-rose-700 text-rose-300 text-xs">
            <AlertCircle size={14} />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Image Preprocessing / Enhancement Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-slate-950/70 border border-slate-800">
        <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium">
          <Contrast size={14} className="text-emerald-400" />
          <span>{t("Image Pre-Filters (Boosts Faint Handwriting)")}:</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => onFilterChange({ rotation: ((imageFilters?.rotation || 0) + 90) % 360 })}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-medium text-slate-200 border border-slate-700 flex items-center gap-1"
          >
            <RotateCw size={12} /> {t("Rotate 90°")} ({imageFilters?.rotation || 0}°)
          </button>

          <button
            type="button"
            onClick={() => onFilterChange({ highContrast: !imageFilters?.highContrast })}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all ${
              imageFilters?.highContrast
                ? "bg-emerald-600 text-white border-emerald-500"
                : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
            }`}
          >
            <SunMedium size={12} className="inline mr-1" /> {t("High Contrast")}
          </button>

          <button
            type="button"
            onClick={() => onFilterChange({ grayscale: !imageFilters?.grayscale })}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all ${
              imageFilters?.grayscale
                ? "bg-emerald-600 text-white border-emerald-500"
                : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
            }`}
          >
            {t("Grayscale")}
          </button>

          <button
            type="button"
            onClick={() => onFilterChange({ invert: !imageFilters?.invert })}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all ${
              imageFilters?.invert
                ? "bg-emerald-600 text-white border-emerald-500"
                : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
            }`}
          >
            {t("Invert")}
          </button>

          <button
            type="button"
            onClick={() => onFilterChange({ rotation: 0, grayscale: false, highContrast: false, invert: false })}
            className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-[10px] font-medium text-slate-400 border border-slate-800"
          >
            {t("Reset")}
          </button>
        </div>
      </div>

      {/* Main Extract Action Button */}
      <Button
        onClick={onExtract}
        disabled={isProcessing}
        className="w-full h-12 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-600 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-900/30 transition-all flex items-center justify-center gap-2"
      >
        <Sparkles size={18} className="animate-pulse" />
        {isProcessing ? t("Processing & Extracting Medical Data...") : t("Run Optical Character Recognition (OCR)")}
      </Button>

      {/* Camera Capture Modal */}
      {isCameraModalOpen && (
        <CameraCapture
          onCapture={handleCameraCapture}
          onClose={() => setIsCameraModalOpen(false)}
        />
      )}
    </div>
  );
}

export default UploadSection;