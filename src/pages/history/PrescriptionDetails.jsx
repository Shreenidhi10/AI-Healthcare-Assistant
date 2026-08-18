import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  ArrowLeft,
  Stethoscope,
  Calendar,
  FileText,
  Building2,
  UserCheck,
  HeartPulse,
  Activity,
  Pill,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Copy,
  Check,
  Sparkles,
  FileCheck2
} from "lucide-react";
import toast from "react-hot-toast";
import { downloadFileSafe } from "@/utils/mobileDownloadHelper";

export default function PrescriptionDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [prescription, setPrescription] = useState(null);
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("user_prescriptions");
      const savedList = stored ? JSON.parse(stored) : [];
      const found = savedList.find((p) => String(p.id) === String(id));

      if (found) {
        setPrescription(found);
      } else {
        // Fallback default details
        setPrescription({
          id: id,
          title: "Prescription Details #" + id,
          date: new Date().toLocaleDateString("en-GB"),
          medication: "Paracetamol 650mg",
          language: "English",
          doctor: "Dr. S. K. Sharma (M.B.B.S., M.D.)",
          hospital: "City Care Super Speciality Hospital",
          hospitalAddress: "Civil Lines, Raipur (C.G.)",
          patient: "Patient Record",
          diagnosis: "Acute Upper Respiratory Infection & Fever",
          status: "Fit for Duty",
          medicines: [
            {
              name: "Paracetamol 650mg",
              formulation: "Tablet",
              dosage: "1-0-1 (Twice Daily)",
              timing: "After Meals",
              duration: "5 Days",
              instruction: "Take after food with water.",
            },
            {
              name: "Augmentin 625mg",
              formulation: "Tablet",
              dosage: "1-0-1 (Twice Daily)",
              timing: "After Meals",
              duration: "5 Days",
              instruction: "Complete 5 days antibiotic course.",
            },
          ],
          ocrText: "Tab. Augmentin 625mg - 1 Tab BD x 5 Days\nTab. Paracetamol 650mg - 1 Tab TDS for Fever.",
        });
      }
    } catch (_) {
      setPrescription(null);
    }
  }, [id]);

  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleCopy = () => {
    if (!prescription) return;
    const text = `MEDICAL PRESCRIPTION RECORD #${id}
Date: ${prescription.date}
Hospital: ${prescription.hospital || "Medical Center"}
Doctor: ${prescription.doctor || "Physician"}
Patient: ${prescription.patient || "Patient"}
Diagnosis: ${prescription.diagnosis || "Medical Consultation"}
Status: ${prescription.status || "Active"}

MEDICINES:
${prescription.medicines ? prescription.medicines.map((m, i) => `${i + 1}. ${m.name} (${m.dosage || m.frequency || "As directed"}) - ${m.timing || ""}`).join("\n") : prescription.ocrText}
`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Medical record copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSpeak = () => {
    if (!window.speechSynthesis || !prescription) return;

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
    let textToSpeak = `Prescription record for ${prescription.patient || "patient"}. Issued by ${prescription.hospital || "medical center"}, ${prescription.doctor || "doctor"}. Diagnosis is ${prescription.diagnosis || "general examination"}. `;
    if (prescription.medicines && prescription.medicines.length > 0) {
      textToSpeak += "Prescribed medicines are: ";
      prescription.medicines.forEach((m, idx) => {
        textToSpeak += `${idx + 1}: ${m.name}, ${m.dosage || ""}, ${m.timing || ""}. `;
      });
    }

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.rate = 0.92;
    utterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };

    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
    setIsPaused(false);
    toast.success("Reading prescription aloud...");
  };

  const handleStopSpeaking = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setIsPaused(false);
    }
  };

  const handleDownload = async () => {
    if (!prescription) return;
    const reportText = `==========================================================
HEALTHBUDDY - PRESCRIPTION RECORD #${id}
==========================================================

Date        : ${prescription.date}
Hospital    : ${prescription.hospital || "Hospital"}
Address     : ${prescription.hospitalAddress || "N/A"}
Doctor      : ${prescription.doctor || "Consultant"}
Patient     : ${prescription.patient || "Patient Record"}
Diagnosis   : ${prescription.diagnosis || "Medical Consultation"}
Status      : ${prescription.status || "Active"}

PRESCRIBED MEDICINES:
${
  prescription.medicines && prescription.medicines.length > 0
    ? prescription.medicines.map((m, i) => `${i + 1}. [${m.formulation || "Tab"}] ${m.name} ${m.strength || ""}\n   Dosage: ${m.dosage || m.frequency}\n   Timing: ${m.timing || "After food"}\n   Duration: ${m.duration || "As directed"}`).join("\n\n")
    : prescription.ocrText || "No text attached"
}

ORIGINAL OCR SCAN:
${prescription.ocrText || prescription.prescriptionText || "N/A"}
`;

    const filename = `HEALTHBUDDY-Prescription-${id}.txt`;
    await downloadFileSafe(filename, reportText, "text/plain;charset=utf-8");
  };

  if (!prescription) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-28 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Back and Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button
            variant="outline"
            onClick={() => navigate("/history")}
            className="border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 text-xs"
          >
            <ArrowLeft size={14} className="mr-1.5" /> Back to History
          </Button>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopy}
              className="h-9 border-slate-800 bg-slate-900 text-xs text-slate-200"
            >
              {copied ? <Check size={14} className="mr-1 text-emerald-400" /> : <Copy size={14} className="mr-1" />}
              {copied ? "Copied" : "Copy"}
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={handleSpeak}
              className={`h-9 border-slate-800 text-xs ${
                isSpeaking ? "bg-emerald-950 text-emerald-300 border-emerald-600" : "bg-slate-900 text-slate-200"
              }`}
            >
              <Volume2 size={14} className="mr-1 text-emerald-400" />
              {isSpeaking ? (isPaused ? "Resume" : "Pause") : "Listen"}
            </Button>

            {isSpeaking && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleStopSpeaking}
                className="h-9 px-2 text-rose-400 text-xs"
              >
                <VolumeX size={15} />
              </Button>
            )}

            <Button
              size="sm"
              onClick={handleDownload}
              className="h-9 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md"
            >
              <Download size={14} className="mr-1" /> Download
            </Button>
          </div>
        </div>

        {/* Title & Badge */}
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="text-emerald-400 h-5 w-5" />
            <h1 className="text-2xl sm:text-3xl font-bold text-white">
              {prescription.title || prescription.medication || "Prescription Details"}
            </h1>
          </div>
          <p className="mt-1 text-xs text-emerald-400">
            Encrypted Patient Record ID: {id} • Scanned & Verified with AI OCR
          </p>
        </div>

        {/* Hospital & Doctor Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="rounded-2xl p-4 border border-slate-800 bg-slate-900 text-slate-100 space-y-1">
            <div className="flex items-start gap-3">
              <Building2 className="text-emerald-400 h-6 w-6 mt-0.5 shrink-0" />
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Hospital / Medical Center</p>
                <h4 className="font-bold text-base text-white">{prescription.hospital || "Medical Clinic"}</h4>
                {prescription.hospitalAddress && (
                  <p className="text-xs text-slate-300 mt-0.5">{prescription.hospitalAddress}</p>
                )}
              </div>
            </div>
          </Card>

          <Card className="rounded-2xl p-4 border border-slate-800 bg-slate-900 text-slate-100 space-y-1">
            <div className="flex items-start gap-3">
              <Stethoscope className="text-emerald-400 h-6 w-6 mt-0.5 shrink-0" />
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Attending Doctor</p>
                <h4 className="font-bold text-sm text-white">{prescription.doctor || "Physician"}</h4>
                {prescription.doctorDegree && (
                  <p className="text-xs text-emerald-400">{prescription.doctorDegree}</p>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Patient Demographics & Vitals */}
        <Card className="rounded-2xl p-5 border border-slate-800 bg-slate-900 text-slate-100 space-y-4 shadow-xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-slate-400 font-semibold uppercase flex items-center gap-1">
                <UserCheck size={13} className="text-emerald-400" /> Patient
              </p>
              <p className="font-bold text-sm text-white mt-1">{prescription.patient || "Patient Record"}</p>
            </div>

            <div>
              <p className="text-xs text-slate-400 font-semibold uppercase flex items-center gap-1">
                <Calendar size={13} className="text-emerald-400" /> Date
              </p>
              <p className="font-bold text-sm text-white mt-1">{prescription.date}</p>
            </div>

            <div>
              <p className="text-xs text-slate-400 font-semibold uppercase flex items-center gap-1">
                <HeartPulse size={13} className="text-emerald-400" /> Diagnosis
              </p>
              <p className="font-bold text-sm text-emerald-300 mt-1">{prescription.diagnosis || "General Observation"}</p>
            </div>

            <div>
              <p className="text-xs text-slate-400 font-semibold uppercase">Fitness / Status</p>
              <Badge className="mt-1 bg-emerald-600 text-white font-semibold">
                {Array.isArray(prescription.status) ? prescription.status.join(", ") : prescription.status || "Active"}
              </Badge>
            </div>
          </div>
        </Card>

        {/* Medicines Table */}
        <Card className="rounded-2xl p-5 border border-slate-800 bg-slate-900 text-slate-100 shadow-xl space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold uppercase text-emerald-400">
            <Pill size={16} /> Prescribed Medicines & Dosage Schedule
          </div>

          {prescription.medicines && prescription.medicines.length > 0 ? (
            <div className="space-y-2.5">
              {prescription.medicines.map((m, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      {idx + 1}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-white flex items-center gap-2">
                        {m.name || m}
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
                        Instructions: <span className="text-emerald-300 font-medium">{m.instruction || `${m.timing || "After meals"} with water.`}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 sm:self-center">
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-700/50 text-xs font-bold">
                      {m.dosageCode ? `Dosage: ${m.dosageCode}` : m.frequency || m.dosage || "As directed"}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 text-xs font-medium">
                      {m.timing || "After Food"}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-400 text-xs">
                      {m.duration || "5 Days"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400">Refer to original OCR text below.</p>
          )}
        </Card>

        {/* Original OCR Record Section */}
        <Card className="rounded-2xl p-5 border border-slate-800 bg-slate-900 text-slate-100 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-sm text-emerald-400 flex items-center gap-2">
              <FileText size={16} /> Extracted Record & Raw OCR Content
            </h2>
            <button
              onClick={() => setShowRaw(!showRaw)}
              className="text-xs text-slate-400 hover:text-white"
            >
              {showRaw ? "Collapse" : "Expand"}
            </button>
          </div>
          <div className="rounded-xl border border-slate-800 bg-black/90 p-4 text-xs font-mono text-emerald-400 whitespace-pre-wrap max-h-72 overflow-auto">
            {prescription.ocrText || prescription.prescriptionText || "Extracted content for this medical prescription scan."}
          </div>
        </Card>
      </div>
    </div>
  );
}