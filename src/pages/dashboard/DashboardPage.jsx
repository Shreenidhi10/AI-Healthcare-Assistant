import React, { useState, useEffect, useRef } from "react";
import {
  Activity,
  Bed,
  Stethoscope,
  HeartPulse,
  TrendingUp,
  AlertCircle,
  Users,
  ShieldCheck,
  RefreshCw,
  MapPin,
  PhoneCall,
  Clock,
  Globe,
  Volume2,
  VolumeX,
  Languages,
  CheckCircle2,
  Sparkles,
  ArrowRightLeft
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import toast from "react-hot-toast";
import {
  DASHBOARD_LANGUAGES,
  DASHBOARD_TRANSLATIONS,
} from "./dashboardTranslations";

export default function DashboardPage() {
  const [timeframe, setTimeframe] = useState("week");
  const [refreshing, setRefreshing] = useState(false);
  const [selectedLang, setSelectedLang] = useState("en");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const utteranceRef = useRef(null);

  const [stats, setStats] = useState({
    totalBeds: 120,
    availableBeds: 84,
    icuBeds: 12,
    doctorsOnDuty: 18,
    oxygenStock: "92%",
    totalConsultations: 1420,
    activePatients: 340,
  });

  // Current translation dictionary (fallback to English)
  const t = DASHBOARD_TRANSLATIONS[selectedLang] || DASHBOARD_TRANSLATIONS.en;

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      toast.success(selectedLang === "en" ? "Dashboard metrics refreshed!" : `${t.refresh}!`);
    }, 600);
  };

  const handleTranslateToEnglish = () => {
    setSelectedLang("en");
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setIsSpeaking(false);
    toast.success("Switched dashboard language to English");
  };

  const handleLanguageChange = (langCode) => {
    setSelectedLang(langCode);
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setIsSpeaking(false);
    const langObj = DASHBOARD_LANGUAGES.find((l) => l.code === langCode);
    toast.success(`Language changed to ${langObj?.label || langCode}`);
  };

  // Text-To-Speech audio readout of dashboard summary
  const handleToggleSpeak = () => {
    if (!window.speechSynthesis) {
      toast.error("Speech synthesis is not supported on this browser.");
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const speechText = `${t.title}. ${t.subtitle}. ${t.opdBeds}: ${stats.availableBeds} of ${stats.totalBeds} ${t.capacityAvailable}. ${t.doctorsActive}: ${stats.doctorsOnDuty}. ${t.icuBeds}: ${stats.icuBeds}. ${t.oxygenReserve}: ${stats.oxygenStock}. ${t.conditionsTitle}: ${t.viralFever} 38 percent, ${t.respiratory} 24 percent, ${t.diabetes} 18 percent, ${t.hypertension} 12 percent.`;

    const utterance = new SpeechSynthesisUtterance(speechText);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    // Set voice language code if supported
    if (selectedLang === "hi") utterance.lang = "hi-IN";
    else if (selectedLang === "mr") utterance.lang = "mr-IN";
    else if (selectedLang === "bn") utterance.lang = "bn-IN";
    else if (selectedLang === "ta") utterance.lang = "ta-IN";
    else if (selectedLang === "te") utterance.lang = "te-IN";
    else if (selectedLang === "kn") utterance.lang = "kn-IN";
    else if (selectedLang === "gu") utterance.lang = "gu-IN";
    else if (selectedLang === "ml") utterance.lang = "ml-IN";
    else if (selectedLang === "pa") utterance.lang = "pa-IN";
    else utterance.lang = "en-US";

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
    toast.success(`Playing voice readout in ${DASHBOARD_LANGUAGES.find(l => l.code === selectedLang)?.label || "English"}...`);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-28">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 px-4 sm:px-6 pb-12 pt-8 text-white shadow-2xl border-b border-emerald-800/40">
        <div className="max-w-5xl mx-auto space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <Sparkles size={12} /> {t.badge}
                </p>
              </div>
              <h1 className="mt-1.5 text-2xl sm:text-3xl font-bold font-serif text-white tracking-tight">
                {t.title}
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-emerald-200/80">
                {t.subtitle}
              </p>
            </div>

            {/* Top Action Controls */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {/* Voice Readout Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleToggleSpeak}
                className={`h-9 text-xs font-semibold border transition-all ${
                  isSpeaking
                    ? "border-amber-500 bg-amber-950 text-amber-300 hover:bg-amber-900 animate-pulse"
                    : "border-slate-700 bg-slate-900/80 text-emerald-300 hover:bg-slate-800"
                }`}
              >
                {isSpeaking ? (
                  <>
                    <VolumeX size={14} className="mr-1.5" /> {t.stopAudio}
                  </>
                ) : (
                  <>
                    <Volume2 size={14} className="mr-1.5" /> {t.listenSummary}
                  </>
                )}
              </Button>

              {/* Refresh Metrics Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                className="h-9 border-emerald-600/50 bg-emerald-950/80 text-emerald-300 hover:bg-emerald-900 text-xs font-semibold"
              >
                <RefreshCw size={14} className={`mr-1.5 ${refreshing ? "animate-spin" : ""}`} />
                {refreshing ? t.refreshing : t.refresh}
              </Button>
            </div>
          </div>

          {/* DEDICATED MULTILINGUAL TRANSLATION BAR */}
          <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Globe className="text-emerald-400 h-4 w-4 shrink-0" />
              <span className="text-xs text-slate-300 font-medium">{t.currentLanguage}:</span>
              
              {/* Language Dropdown Selector */}
              <select
                value={selectedLang}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-xs font-bold text-emerald-300 rounded-lg px-3 py-1.5 outline-none cursor-pointer hover:border-emerald-500 transition-colors"
              >
                {DASHBOARD_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.flag} {lang.label} ({lang.native})
                  </option>
                ))}
              </select>
            </div>

            {/* 1-Click "Translate to English" Button (Highlights when non-English is active) */}
            <div className="flex items-center gap-2">
              {selectedLang !== "en" ? (
                <button
                  type="button"
                  onClick={handleTranslateToEnglish}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition-all hover:scale-105 active:scale-95 animate-in fade-in"
                  title="Switch dashboard directly back to English"
                >
                  <ArrowRightLeft size={13} />
                  <span>🇬🇧 {t.translateToEnglish}</span>
                </button>
              ) : (
                <span className="text-[11px] text-emerald-400/70 font-medium px-2 py-1 rounded bg-emerald-950/40 border border-emerald-800/30 flex items-center gap-1">
                  <CheckCircle2 size={12} /> English Active
                </span>
              )}
            </div>
          </div>

          {/* Quick-Pill Language Switcher (1-Tap Selection) */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 overflow-x-auto pb-1 scrollbar-none">
            {DASHBOARD_LANGUAGES.map((lang) => {
              const isActive = selectedLang === lang.code;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => handleLanguageChange(lang.code)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all shrink-0 flex items-center gap-1 ${
                    isActive
                      ? "bg-emerald-600 text-white font-bold shadow-sm ring-1 ring-emerald-400"
                      : "bg-slate-900/90 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800"
                  }`}
                >
                  <span>{lang.flag}</span>
                  <span>{lang.native}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto space-y-6 px-4 sm:px-5 -mt-6">
        {/* Metric Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-4">
          {/* Card 1: Available Beds */}
          <Card className="border border-slate-800 bg-slate-900/95 p-4 shadow-xl text-slate-100 rounded-2xl hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] sm:text-xs text-slate-400 font-semibold uppercase">{t.opdBeds}</span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Bed size={17} />
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-white">
              {stats.availableBeds} <span className="text-xs text-slate-400 font-normal">/ {stats.totalBeds}</span>
            </p>
            <p className="mt-1 text-[11px] text-emerald-400 font-medium">70% {t.capacityAvailable}</p>
          </Card>

          {/* Card 2: Doctors on Duty */}
          <Card className="border border-slate-800 bg-slate-900/95 p-4 shadow-xl text-slate-100 rounded-2xl hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] sm:text-xs text-slate-400 font-semibold uppercase">{t.doctorsActive}</span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Stethoscope size={17} />
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-white">{stats.doctorsOnDuty}</p>
            <p className="mt-1 text-[11px] text-emerald-400 font-medium">6 {t.telehealthReady}</p>
          </Card>

          {/* Card 3: ICU Beds */}
          <Card className="border border-slate-800 bg-slate-900/95 p-4 shadow-xl text-slate-100 rounded-2xl hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] sm:text-xs text-slate-400 font-semibold uppercase">{t.icuBeds}</span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <HeartPulse size={17} />
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-white">{stats.icuBeds}</p>
            <p className="mt-1 text-[11px] text-emerald-400 font-medium">{t.emergencyReady}</p>
          </Card>

          {/* Card 4: Oxygen Stock */}
          <Card className="border border-slate-800 bg-slate-900/95 p-4 shadow-xl text-slate-100 rounded-2xl hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] sm:text-xs text-slate-400 font-semibold uppercase">{t.oxygenReserve}</span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Activity size={17} />
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-emerald-400">{stats.oxygenStock}</p>
            <p className="mt-1 text-[11px] text-slate-400">450L {t.stocked}</p>
          </Card>
        </div>

        {/* Analytics Section & Common Conditions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Main Consultations Analytics */}
          <Card className="col-span-1 md:col-span-2 border border-slate-800 bg-slate-900/95 p-5 shadow-xl text-slate-100 rounded-2xl">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="text-emerald-400" size={19} />
                <h3 className="font-bold text-base sm:text-lg text-white">{t.patientFlowTitle}</h3>
              </div>
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setTimeframe("week")}
                  className={`px-3 py-1 text-xs rounded-lg font-semibold transition-colors ${
                    timeframe === "week" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  {t.thisWeek}
                </button>
                <button
                  type="button"
                  onClick={() => setTimeframe("month")}
                  className={`px-3 py-1 text-xs rounded-lg font-semibold transition-colors ${
                    timeframe === "month" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  {t.thisMonth}
                </button>
              </div>
            </div>

            {/* Visual Bar Graph Representation */}
            <div className="space-y-3.5 pt-1">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300 font-medium">{t.mon}</span>
                  <span className="font-bold text-emerald-400">240 {t.patients}</span>
                </div>
                <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: "85%" }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300 font-medium">{t.tue}</span>
                  <span className="font-bold text-emerald-400">195 {t.patients}</span>
                </div>
                <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                  <div className="h-full bg-emerald-500/80 rounded-full" style={{ width: "70%" }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300 font-medium">{t.wed}</span>
                  <span className="font-bold text-emerald-400">210 {t.patients}</span>
                </div>
                <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                  <div className="h-full bg-emerald-500/80 rounded-full" style={{ width: "75%" }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300 font-medium">{t.thu}</span>
                  <span className="font-bold text-emerald-400">180 {t.patients}</span>
                </div>
                <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                  <div className="h-full bg-teal-400 rounded-full" style={{ width: "65%" }} />
                </div>
              </div>
            </div>
          </Card>

          {/* Common Disease Prevalence Breakdown */}
          <Card className="border border-slate-800 bg-slate-900/95 p-5 shadow-xl text-slate-100 rounded-2xl">
            <h3 className="font-bold text-base text-white mb-3 border-b border-slate-800 pb-2">
              {t.conditionsTitle}
            </h3>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <span className="font-semibold text-slate-200">{t.viralFever}</span>
                <span className="font-bold text-emerald-400">38%</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <span className="font-semibold text-slate-200">{t.respiratory}</span>
                <span className="font-bold text-emerald-400">24%</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <span className="font-semibold text-slate-200">{t.diabetes}</span>
                <span className="font-bold text-emerald-400">18%</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <span className="font-semibold text-slate-200">{t.hypertension}</span>
                <span className="font-bold text-emerald-400">12%</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Primary Health Centers (PHC) Network */}
        <Card className="border border-slate-800 bg-slate-900/95 p-5 shadow-xl text-slate-100 rounded-2xl">
          <div className="border-b border-slate-800 pb-3 mb-4">
            <h3 className="font-bold text-base sm:text-lg text-white flex items-center gap-2">
              <MapPin className="text-emerald-400" size={19} /> {t.phcTitle}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">{t.phcSubtitle}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 hover:border-slate-700 transition-all">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-white">{t.raipurPhc}</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-semibold">
                  {t.activeBadge}
                </span>
              </div>
              <p className="text-xs text-slate-400">{t.distance}: 4.2 km • {t.teleConsultActive}</p>
              <div className="pt-2 flex items-center gap-2">
                <a href="tel:108" className="text-xs text-emerald-400 hover:underline flex items-center gap-1 font-semibold">
                  <PhoneCall size={12} /> {t.contactEmergency}
                </a>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 hover:border-slate-700 transition-all">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-white">{t.durgClinic}</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-semibold">
                  {t.activeBadge}
                </span>
              </div>
              <p className="text-xs text-slate-400">{t.distance}: 8.5 km • {t.ambulancesReady}</p>
              <div className="pt-2 flex items-center gap-2">
                <a href="tel:104" className="text-xs text-emerald-400 hover:underline flex items-center gap-1 font-semibold">
                  <PhoneCall size={12} /> {t.helpline104}
                </a>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 hover:border-slate-700 transition-all">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-white">{t.bilaspurCenter}</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-semibold">
                  {t.activeBadge}
                </span>
              </div>
              <p className="text-xs text-slate-400">{t.distance}: 12.0 km • {t.oxygenStockFull}</p>
              <div className="pt-2 flex items-center gap-2">
                <a href="tel:108" className="text-xs text-emerald-400 hover:underline flex items-center gap-1 font-semibold">
                  <PhoneCall size={12} /> {t.contactPhc}
                </a>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
