import { useState, useEffect, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Copy,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Bookmark,
  Check,
  Building2,
  Stethoscope,
  UserCheck,
  Calendar,
  FileCheck2,
  Pill,
  Sparkles,
  Download,
  Edit3,
  Globe,
  HeartPulse,
  Activity,
  AlertTriangle,
  FileText,
  Search,
  CheckCircle2,
  Plus,
  Trash2,
  Save,
  HelpCircle,
  RefreshCw,
  Phone,
  ShieldAlert
} from "lucide-react";
import toast from "react-hot-toast";
import {
  refineOcrData,
  generateMedicalReportText,
  REGIONAL_TRANSLATIONS,
} from "../utils/ocrRefiner";
import { downloadFileSafe } from "@/utils/mobileDownloadHelper";
import { useLanguage } from "@/contexts/LanguageContext";

const CODE_TO_REGIONAL = {
  hin_Deva: "Hindi",
  ben_Beng: "Bengali",
  mar_Deva: "Marathi",
  tam_Taml: "Tamil",
  tel_Telu: "Telugu",
  kan_Knda: "Kannada",
  guj_Gujr: "Gujarati",
  mal_Mlym: "Malayalam",
  pan_Guru: "Punjabi",
};

function OCRResult({ result, onResultChange, onSaveSuccess }) {
  const { language } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState("structured"); // "structured" | "explainer" | "translate" | "raw"
  const [targetLang, setTargetLang] = useState(() => {
    if (language?.code && CODE_TO_REGIONAL[language.code]) {
      return CODE_TO_REGIONAL[language.code];
    }
    return "Hindi";
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState(null);
  const [editableRawText, setEditableRawText] = useState("");
  const [rawSearch, setRawSearch] = useState("");
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (language?.code && CODE_TO_REGIONAL[language.code]) {
      setTargetLang(CODE_TO_REGIONAL[language.code]);
    }
  }, [language]);

  // Audio Speech Synthesis state
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const utteranceRef = useRef(null);

  // Initialize or update refined data when result changes
  useEffect(() => {
    if (result) {
      const refined = refineOcrData(result);
      setEditedData(refined);
      setEditableRawText(result);
      setIsSaved(false);
    }
  }, [result]);

  // Clean up speech synthesis on unmount
  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  if (!result || !editedData) return null;

  const data = editedData;

  // 1. Copy Structured Summary
  const handleCopy = () => {
    const reportText = generateMedicalReportText(data);
    navigator.clipboard.writeText(reportText);
    setCopied(true);
    toast.success("Structured medical record copied to clipboard!");
    setTimeout(() => setCopied(false), 2200);
  };

  // 2. Text-to-Speech (TTS) with Play / Pause / Resume / Stop
  const handleSpeak = () => {
    if (!window.speechSynthesis) {
      toast.error("Text-to-speech is not supported on this browser.");
      return;
    }

    if (isSpeaking && !isPaused) {
      window.speechSynthesis.pause();
      setIsPaused(true);
      return;
    }

    if (isSpeaking && isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
      return;
    }

    window.speechSynthesis.cancel();

    // Construct spoken text
    let spokenText = `Medical Record for ${data.patient}. `;
    if (data.hospital) spokenText += `Issued by ${data.hospital}. `;
    if (data.doctor) spokenText += `Attending doctor is ${data.doctor}. `;
    if (data.diagnosis) spokenText += `Diagnosis: ${data.diagnosis}. `;
    if (data.status) spokenText += `Medical status: ${data.status}. `;

    if (data.medicines && data.medicines.length > 0) {
      spokenText += `Prescribed medicines are: `;
      data.medicines.forEach((m, i) => {
        spokenText += `${i + 1}: ${m.name}, ${m.dosage || m.frequency}, ${m.timing || ""}. `;
      });
    }

    if (data.advice && data.advice.length > 0) {
      spokenText += `Doctor advice: ${data.advice.join(". ")}.`;
    }

    const utterance = new SpeechSynthesisUtterance(spokenText);
    utterance.rate = 0.92;
    utterance.pitch = 1.0;

    utterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
    setIsPaused(false);
    toast.success("Reading medical prescription aloud...");
  };

  const handleStopSpeaking = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setIsPaused(false);
    }
  };

  // 3. Save to History (localStorage + backend API)
  const handleSaveToHistory = async () => {
    try {
      const stored = localStorage.getItem("user_prescriptions");
      const list = stored ? JSON.parse(stored) : [];

      const recordId = "ocr-" + Date.now();
      const newRecord = {
        id: recordId,
        title: data.certificate || data.diagnosis || "Medical Prescription",
        medication: data.medicines && data.medicines.length > 0 ? data.medicines[0].name : "Medical Treatment",
        hospital: data.hospital,
        hospitalAddress: data.hospitalAddress,
        hospitalPhone: data.hospitalPhone,
        doctor: data.doctor,
        doctorDegree: data.doctorDegree,
        doctorRegNo: data.doctorRegNo,
        doctorDea: data.doctorDea,
        doctorNpi: data.doctorNpi,
        patient: data.patient,
        patientDob: data.patientDob,
        patientAge: data.patientAge,
        patientGender: data.patientGender,
        patientId: data.patientId,
        allergies: data.allergies,
        diagnosis: data.diagnosis,
        leavePeriod: data.leavePeriod,
        status: data.status,
        medicines: data.medicines,
        vitals: data.vitals,
        labTests: data.labTests,
        advice: data.advice,
        ocrText: editableRawText || result,
        confidence: data.confidence,
        date: data.date || new Date().toLocaleDateString("en-GB"),
        createdAt: new Date().toISOString(),
      };

      list.unshift(newRecord);
      localStorage.setItem("user_prescriptions", JSON.stringify(list));
      try {
        localStorage.setItem("active_dashboard_doc_id", recordId);
        window.dispatchEvent(new CustomEvent("healthbuddy:document-changed", { detail: { id: recordId } }));
      } catch (_) {}
      setIsSaved(true);
      toast.success("Saved and synced directly with your Health Dashboard! 📄");

      if (onSaveSuccess) onSaveSuccess(newRecord);

      // Sync with backend API in background if online
      try {
        fetch("/api/medical-history/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newRecord),
        }).catch(() => {});
      } catch (_) {}
    } catch (err) {
      console.error("Save error:", err);
      toast.error("Could not save to history.");
    }
  };

  // 4. Download Printable Medical Summary File
  const handleDownload = async () => {
    const reportText = generateMedicalReportText(data);
    const filename = `HEALTHBUDDY-Medical-Report-${(data.patient || "Record").replace(/[^a-zA-Z0-9]/g, "_")}.txt`;
    await downloadFileSafe(filename, reportText, "text/plain;charset=utf-8");
  };

  // 5. Update Field during Edit Mode
  const updateField = (field, value) => {
    setEditedData((prev) => ({ ...prev, [field]: value }));
  };

  const updateMedicine = (index, key, value) => {
    setEditedData((prev) => {
      const updated = [...prev.medicines];
      updated[index] = { ...updated[index], [key]: value };
      return { ...prev, medicines: updated };
    });
  };

  const addMedicine = () => {
    setEditedData((prev) => ({
      ...prev,
      medicines: [
        ...prev.medicines,
        {
          name: "New Medicine",
          formulation: "Tablet",
          strength: "500mg",
          dosage: "1-0-1 (Twice Daily)",
          frequency: "Twice Daily",
          dosageCode: "1-0-1",
          timesPerDay: 2,
          timing: "After Meals",
          duration: "5 Days",
          instruction: "Take after meals with water.",
        },
      ],
    }));
  };

  const removeMedicine = (index) => {
    setEditedData((prev) => ({
      ...prev,
      medicines: prev.medicines.filter((_, i) => i !== index),
    }));
  };

  // 6. Reparse when raw text is modified in Inspector
  const handleReparseRawText = () => {
    if (!editableRawText.trim()) return;
    const refined = refineOcrData(editableRawText);
    setEditedData(refined);
    if (onResultChange) onResultChange(editableRawText);
    toast.success("Re-parsed and updated structured clinical data!");
  };

  const currentTranslation = REGIONAL_TRANSLATIONS[targetLang] || REGIONAL_TRANSLATIONS.Hindi;

  return (
    <div className="mt-6 rounded-3xl border border-slate-700 bg-slate-900/95 p-5 sm:p-6 space-y-6 shadow-2xl text-slate-100 animate-in fade-in duration-300">
      {/* Top Header & Badges */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                {data.documentType || "Medical Prescription"}
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px]">
                  OCR Accuracy: {data.confidence || 96}%
                </Badge>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                AI-Extracted & Structured Clinical Information
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Bar Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Edit / Save Edit Toggle */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsEditing(!isEditing)}
            className="h-9 border-slate-700 bg-slate-800 text-xs text-slate-200 hover:bg-slate-700"
          >
            {isEditing ? (
              <>
                <Save size={14} className="mr-1.5 text-emerald-400" /> Done Editing
              </>
            ) : (
              <>
                <Edit3 size={14} className="mr-1.5 text-blue-400" /> Edit Record
              </>
            )}
          </Button>

          {/* Copy Button */}
          <Button
            size="sm"
            variant="outline"
            onClick={handleCopy}
            className="h-9 border-slate-700 bg-slate-800 text-xs text-slate-200 hover:bg-slate-700"
          >
            {copied ? (
              <Check size={14} className="mr-1.5 text-emerald-400" />
            ) : (
              <Copy size={14} className="mr-1.5" />
            )}
            {copied ? "Copied" : "Copy"}
          </Button>

          {/* Text-to-Speech (TTS) Button */}
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={handleSpeak}
              className={`h-9 border-slate-700 text-xs ${
                isSpeaking
                  ? "bg-emerald-950 text-emerald-300 border-emerald-600"
                  : "bg-slate-800 text-slate-200 hover:bg-slate-700"
              }`}
            >
              {isSpeaking ? (
                isPaused ? (
                  <>
                    <Play size={14} className="mr-1.5 text-emerald-400" /> Resume
                  </>
                ) : (
                  <>
                    <Pause size={14} className="mr-1.5 text-amber-400" /> Pause
                  </>
                )
              ) : (
                <>
                  <Volume2 size={14} className="mr-1.5 text-emerald-400" /> Listen
                </>
              )}
            </Button>
            {isSpeaking && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleStopSpeaking}
                className="h-9 px-2 text-rose-400 hover:bg-rose-950/40 text-xs"
                title="Stop Audio"
              >
                <VolumeX size={15} />
              </Button>
            )}
          </div>

          {/* Download Text Report */}
          <Button
            size="sm"
            variant="outline"
            onClick={handleDownload}
            className="h-9 border-slate-700 bg-slate-800 text-xs text-slate-200 hover:bg-slate-700"
          >
            <Download size={14} className="mr-1.5" /> Download
          </Button>

          {/* Save to History Button */}
          <Button
            size="sm"
            onClick={handleSaveToHistory}
            className={`h-9 text-xs font-semibold text-white shadow-lg transition-all ${
              isSaved
                ? "bg-teal-700 hover:bg-teal-800"
                : "bg-emerald-600 hover:bg-emerald-500"
            }`}
          >
            {isSaved ? (
              <>
                <CheckCircle2 size={14} className="mr-1.5 text-emerald-200" /> Saved
              </>
            ) : (
              <>
                <Bookmark size={14} className="mr-1.5" /> Save to History
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("structured")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === "structured"
              ? "bg-emerald-600 text-white shadow-md shadow-emerald-950"
              : "bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white"
          }`}
        >
          <FileCheck2 size={14} /> Structured Medical Record
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("explainer")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === "explainer"
              ? "bg-emerald-600 text-white shadow-md shadow-emerald-950"
              : "bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white"
          }`}
        >
          <HelpCircle size={14} /> Plain-Language AI Explainer
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("translate")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === "translate"
              ? "bg-emerald-600 text-white shadow-md shadow-emerald-950"
              : "bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white"
          }`}
        >
          <Globe size={14} /> Regional Translation
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("raw")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === "raw"
              ? "bg-emerald-600 text-white shadow-md shadow-emerald-950"
              : "bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white"
          }`}
        >
          <FileText size={14} /> Raw OCR Inspector ({data.lineCount || 0} Lines)
        </button>
      </div>

      {/* TAB 1: Structured Medical Record */}
      {activeTab === "structured" && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* Hospital & Doctor Banner */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Hospital / Clinic Card */}
            <div className="rounded-2xl bg-gradient-to-r from-emerald-950/70 via-slate-900 to-teal-950/70 p-4 border border-emerald-700/40 space-y-2">
              <div className="flex items-start gap-3">
                <Building2 className="text-emerald-400 h-6 w-6 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-[10px] text-emerald-300 font-bold uppercase tracking-wider">
                    Hospital / Clinic / Medical Center
                  </p>
                  {isEditing ? (
                    <Input
                      value={data.hospital}
                      onChange={(e) => updateField("hospital", e.target.value)}
                      className="mt-1 bg-slate-950 border-slate-700 text-sm font-bold text-white"
                    />
                  ) : (
                    <h4 className="font-bold text-base text-white">{data.hospital}</h4>
                  )}
                  {data.hospitalAddress && (
                    <p className="text-xs text-slate-300 mt-0.5">{data.hospitalAddress}</p>
                  )}
                  {data.hospitalPhone && (
                    <p className="text-[11px] text-emerald-400 mt-0.5 flex items-center gap-1">
                      <Phone size={11} /> {data.hospitalPhone}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Attending Doctor Card */}
            <div className="rounded-2xl bg-slate-950/80 p-4 border border-slate-800 space-y-2">
              <div className="flex items-start gap-3">
                <Stethoscope className="text-emerald-400 h-6 w-6 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    Attending Doctor / Physician
                  </p>
                  {isEditing ? (
                    <Input
                      value={data.doctor}
                      onChange={(e) => updateField("doctor", e.target.value)}
                      className="mt-1 bg-slate-900 border-slate-700 text-sm font-bold text-white"
                    />
                  ) : (
                    <h4 className="font-bold text-sm text-white">
                      {data.doctor}{" "}
                      {data.doctorDegree && (
                        <span className="text-xs text-emerald-400 font-normal">
                          ({data.doctorDegree})
                        </span>
                      )}
                    </h4>
                  )}
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    {data.doctorRegNo && (
                      <span className="text-[11px] text-slate-400">Reg: {data.doctorRegNo}</span>
                    )}
                    {data.doctorDea && (
                      <span className="text-[11px] text-slate-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                        DEA #: {data.doctorDea}
                      </span>
                    )}
                    {data.doctorNpi && (
                      <span className="text-[11px] text-slate-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                        NPI #: {data.doctorNpi}
                      </span>
                    )}
                    {data.enteredBy && (
                      <span className="text-[11px] text-slate-400">Entered by: {data.enteredBy}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Patient Demographics & Vitals Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {/* Patient Name & Demographics */}
            <div className="rounded-2xl bg-slate-950/70 p-3.5 border border-slate-800 space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase">
                <UserCheck size={14} className="text-emerald-400" /> Patient Details
              </div>
              {isEditing ? (
                <div className="space-y-1.5 pt-1">
                  <Input
                    placeholder="Patient Name"
                    value={data.patient}
                    onChange={(e) => updateField("patient", e.target.value)}
                    className="bg-slate-900 border-slate-700 text-xs font-bold text-white h-8"
                  />
                  <div className="grid grid-cols-2 gap-1.5">
                    <Input
                      placeholder="Age"
                      value={data.patientAge}
                      onChange={(e) => updateField("patientAge", e.target.value)}
                      className="bg-slate-900 border-slate-700 text-xs text-white h-7"
                    />
                    <Input
                      placeholder="Gender"
                      value={data.patientGender}
                      onChange={(e) => updateField("patientGender", e.target.value)}
                      className="bg-slate-900 border-slate-700 text-xs text-white h-7"
                    />
                  </div>
                </div>
              ) : (
                <div className="pt-1 space-y-1">
                  <p className="font-bold text-sm text-white">{data.patient}</p>
                  <p className="text-xs text-slate-300">
                    {data.patientAge || "Age recorded"} {data.patientGender ? `• ${data.patientGender}` : ""}
                    {data.patientDob ? ` • DOB: ${data.patientDob}` : ""}
                    {data.patientId ? ` • ID: ${data.patientId}` : ""}
                  </p>
                  {data.allergies && (
                    <div className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-rose-950/60 border border-rose-800 text-rose-300 font-semibold">
                      <ShieldAlert size={12} /> Allergies: {data.allergies}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Diagnosis / Clinical Reason */}
            <div className="rounded-2xl bg-slate-950/70 p-3.5 border border-slate-800 space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase">
                <HeartPulse size={14} className="text-emerald-400" /> Diagnosis & Findings
              </div>
              {isEditing ? (
                <Input
                  value={data.diagnosis}
                  onChange={(e) => updateField("diagnosis", e.target.value)}
                  className="bg-slate-900 border-slate-700 text-xs font-bold text-emerald-300 h-8 mt-1"
                />
              ) : (
                <p className="font-bold text-sm text-emerald-300 pt-1">{data.diagnosis}</p>
              )}
            </div>

            {/* Date & Fitness Status */}
            <div className="rounded-2xl bg-slate-950/70 p-3.5 border border-slate-800 space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase">
                <Calendar size={14} className="text-emerald-400" /> Date & Fitness Status
              </div>
              <p className="font-bold text-sm text-white pt-1">{data.date}</p>
              <p className="text-xs text-emerald-400 font-semibold">{data.status || "Prescription Active"}</p>
            </div>
          </div>

          {/* Vitals Grid (If extracted) */}
          {data.vitals && Object.keys(data.vitals).length > 0 && (
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase text-emerald-400">
                <Activity size={14} /> Recorded Clinical Vitals
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                {Object.entries(data.vitals).map(([key, val]) => (
                  <div key={key} className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-400">{key}</span>
                    <p className="font-bold text-xs text-white mt-0.5">{val}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Prescribed Medicines Table & Schedule */}
          <div className="rounded-2xl bg-slate-950 p-4 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold uppercase text-emerald-400">
                <Pill size={16} /> Prescribed Medicines & Dosage Schedule
              </div>
              {isEditing && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={addMedicine}
                  className="h-7 text-xs border-emerald-500/40 text-emerald-300 hover:bg-emerald-950"
                >
                  <Plus size={13} className="mr-1" /> Add Medicine
                </Button>
              )}
            </div>

            {data.medicines && data.medicines.length > 0 ? (
              <div className="space-y-2.5">
                {data.medicines.map((m, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    {isEditing ? (
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 flex-1">
                        <Input
                          placeholder="Medicine Name"
                          value={m.name}
                          onChange={(e) => updateMedicine(idx, "name", e.target.value)}
                          className="bg-slate-950 border-slate-700 text-xs font-bold text-white"
                        />
                        <Input
                          placeholder="Strength / Form"
                          value={m.strength || m.formulation}
                          onChange={(e) => updateMedicine(idx, "strength", e.target.value)}
                          className="bg-slate-950 border-slate-700 text-xs text-white"
                        />
                        <Input
                          placeholder="Dosage (e.g. 1-0-1)"
                          value={m.dosage || m.frequency}
                          onChange={(e) => updateMedicine(idx, "dosage", e.target.value)}
                          className="bg-slate-950 border-slate-700 text-xs text-emerald-300"
                        />
                        <div className="flex items-center gap-1">
                          <Input
                            placeholder="Timing (e.g. After Meals)"
                            value={m.timing}
                            onChange={(e) => updateMedicine(idx, "timing", e.target.value)}
                            className="bg-slate-950 border-slate-700 text-xs text-slate-300"
                          />
                          <button
                            type="button"
                            onClick={() => removeMedicine(idx)}
                            className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-950/40"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start gap-3">
                          <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                            {idx + 1}
                          </div>
                          <div>
                            <p className="font-bold text-sm text-white flex items-center gap-2">
                              {m.name}
                              {m.strength && (
                                <span className="text-xs text-emerald-300 font-semibold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                                  {m.strength}
                                </span>
                              )}
                              <span className="text-[10px] text-slate-400 font-medium px-1.5 py-0.5 rounded bg-slate-800">
                                {m.formulation || "Tablet"}
                              </span>
                            </p>
                            <p className="text-xs text-slate-300 mt-1">
                              Directions: <span className="text-emerald-300 font-medium">{m.instruction || `${m.timing || "After meals"} with water.`}</span>
                            </p>
                            {(m.dispense || m.refill) && (
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                {m.dispense ? `Dispense: ${m.dispense}` : ""} {m.refill ? ` • Refills: ${m.refill}` : ""}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Frequency & Dosage Pills */}
                        <div className="flex flex-wrap items-center gap-2 sm:self-center">
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-700/50 text-xs font-bold">
                            {m.dosageCode ? `Dosage: ${m.dosageCode}` : m.frequency || m.dosage}
                          </span>
                          <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 text-xs font-medium">
                            {m.timing || "After Food"}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400">No specific medicines detected.</p>
            )}
          </div>

          {/* Doctor's Advice & Dietary Precautions */}
          {data.advice && data.advice.length > 0 && (
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase text-emerald-400">
                <FileCheck2 size={14} /> Doctor's Advice & Dietary Instructions
              </div>
              <ul className="space-y-1.5 pl-2 text-xs text-slate-200">
                {data.advice.map((adv, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                    <span>{adv}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Fitness Certificate Banner if applicable */}
          {data.documentType.includes("Certificate") && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/60 via-slate-900 to-teal-950/60 border border-emerald-600/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div>
                <span className="font-bold text-emerald-300 text-sm">Medical Certificate Decision:</span>
                <p className="text-slate-300 mt-0.5">Leave Period: <span className="font-bold text-white">{data.leavePeriod}</span></p>
              </div>
              <span className="font-bold text-xs px-3 py-1.5 rounded-xl bg-emerald-600 text-white shadow-md">
                {data.status || "Fit for Duty"}
              </span>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Plain-Language AI Explainer */}
      {activeTab === "explainer" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="p-5 rounded-2xl bg-slate-950 border border-emerald-600/30 space-y-4">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-base">
              <Sparkles size={18} />
              <span>AI Health Assistant — Patient Friendly Breakdown</span>
            </div>

            <div className="prose prose-invert max-w-none text-xs leading-relaxed whitespace-pre-line text-slate-200 font-sans">
              {data.healthSummary}
            </div>

            {/* Visual Medicine Timing Cards */}
            {data.medicines && data.medicines.length > 0 && (
              <div className="pt-3 border-t border-slate-800">
                <h5 className="font-bold text-xs text-white mb-2">Daily Medicine Schedule at a Glance:</h5>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-800/40">
                    <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1.5">
                      ☀️ Morning (Breakfast)
                    </span>
                    <ul className="mt-1.5 space-y-1 text-[11px] text-slate-200">
                      {data.medicines
                        .filter((m) => m.dosageCode?.startsWith("1") || m.frequency?.toLowerCase().includes("morning") || m.frequency?.toLowerCase().includes("once"))
                        .map((m, i) => (
                          <li key={i}>• {m.name} ({m.timing || "After food"})</li>
                        ))}
                    </ul>
                  </div>

                  <div className="p-3 rounded-xl bg-blue-950/30 border border-blue-800/40">
                    <span className="text-[11px] font-bold text-blue-300 flex items-center gap-1.5">
                      🌤️ Afternoon (Lunch)
                    </span>
                    <ul className="mt-1.5 space-y-1 text-[11px] text-slate-200">
                      {data.medicines
                        .filter((m) => m.dosageCode?.includes("-1-") || m.frequency?.toLowerCase().includes("noon") || m.frequency?.toLowerCase().includes("thrice"))
                        .map((m, i) => (
                          <li key={i}>• {m.name} ({m.timing || "After lunch"})</li>
                        ))}
                    </ul>
                  </div>

                  <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-800/40">
                    <span className="text-[11px] font-bold text-indigo-300 flex items-center gap-1.5">
                      🌙 Night (Dinner / Bedtime)
                    </span>
                    <ul className="mt-1.5 space-y-1 text-[11px] text-slate-200">
                      {data.medicines
                        .filter((m) => m.dosageCode?.endsWith("1") || m.frequency?.toLowerCase().includes("night") || m.frequency?.toLowerCase().includes("twice") || m.timing?.toLowerCase().includes("bedtime"))
                        .map((m, i) => (
                          <li key={i}>• {m.name} ({m.timing || "After dinner"})</li>
                        ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Regional Translation */}
      {activeTab === "translate" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Globe className="text-emerald-400 h-5 w-5" />
                <h4 className="font-bold text-sm text-white">Translate Medical Record to Regional Language</h4>
              </div>

              {/* Language Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Language:</span>
                <select
                  value={targetLang}
                  onChange={(e) => setTargetLang(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-xs font-bold text-emerald-300 rounded-lg px-3 py-1.5 outline-none cursor-pointer"
                >
                  {Object.keys(REGIONAL_TRANSLATIONS).map((lang) => (
                    <option key={lang} value={lang}>
                      {lang}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Translated Summary Card */}
            <div className="space-y-3 text-xs">
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                <p className="text-emerald-300 font-bold text-sm">
                  {currentTranslation.title}: {data.documentType}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <span className="text-slate-400 font-semibold">{currentTranslation.patient}:</span>
                    <p className="font-bold text-white">{data.patient}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold">{currentTranslation.doctor}:</span>
                    <p className="font-bold text-white">{data.doctor}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold">{currentTranslation.hospital}:</span>
                    <p className="font-bold text-white">{data.hospital}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold">{currentTranslation.diagnosis}:</span>
                    <p className="font-bold text-emerald-300">{data.diagnosis}</p>
                  </div>
                </div>
              </div>

              {/* Translated Medicines */}
              {data.medicines && data.medicines.length > 0 && (
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                  <p className="text-emerald-300 font-bold">{currentTranslation.medicines}:</p>
                  <ul className="space-y-2">
                    {data.medicines.map((m, i) => (
                      <li key={i} className="p-2 rounded-lg bg-slate-950 border border-slate-800/80">
                        <span className="font-bold text-white">
                          {i + 1}. {m.name} ({m.strength || ""})
                        </span>
                        <p className="text-slate-300 text-[11px] mt-0.5">
                          {m.dosage || m.frequency} • {m.timing}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="text-[11px] text-amber-300/80 italic">
                ⚠️ {currentTranslation.disclaimer}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Raw OCR Inspector */}
      {activeTab === "raw" && (
        <div className="space-y-3 animate-in fade-in duration-200">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search size={14} className="absolute left-3 top-2.5 text-slate-500" />
              <Input
                placeholder="Search words in raw OCR text..."
                value={rawSearch}
                onChange={(e) => setRawSearch(e.target.value)}
                className="pl-8 bg-slate-950 border-slate-800 text-xs text-slate-100 h-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleReparseRawText}
                className="border-emerald-600 bg-emerald-950 text-xs text-emerald-300 hover:bg-emerald-900"
              >
                <RefreshCw size={13} className="mr-1" /> Re-parse & Update Cards
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(editableRawText || result);
                  toast.success("Raw OCR text copied!");
                }}
                className="border-slate-700 bg-slate-800 text-xs text-slate-200"
              >
                <Copy size={13} className="mr-1" /> Copy Raw Text
              </Button>
            </div>
          </div>

          <p className="text-[11px] text-slate-400">
            You can directly edit the raw recognized text below and click <span className="text-emerald-400 font-semibold">"Re-parse & Update Cards"</span> to refresh the structured record instantly.
          </p>

          <Textarea
            rows={14}
            value={editableRawText}
            onChange={(e) => setEditableRawText(e.target.value)}
            className="w-full rounded-2xl border border-slate-800 bg-black/90 p-4 text-xs font-mono text-emerald-400 resize-y outline-none selection:bg-emerald-800"
          />
        </div>
      )}
    </div>
  );
}

export default OCRResult;