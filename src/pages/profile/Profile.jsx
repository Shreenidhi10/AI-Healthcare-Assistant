import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  User,
  Mail,
  Globe,
  Bell,
  Shield,
  HelpCircle,
  LogOut,
  ChevronRight,
  X,
  Search,
  Check,
  Lock,
  PhoneCall,
  Edit3,
  KeyRound,
  FileText
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import toast from "react-hot-toast";

const AVAILABLE_LANGUAGES = [
  { name: "English", code: "en", localName: "English" },
  { name: "Hindi", code: "hi", localName: "हिंदी" },
  { name: "Marathi", code: "mr", localName: "मराठी" },
  { name: "Tamil", code: "ta", localName: "தமிழ்" },
  { name: "Telugu", code: "te", localName: "తెలుగు" },
  { name: "Kannada", code: "kn", localName: "ಕನ್ನಡ" },
  { name: "Bengali", code: "bn", localName: "বাংলা" },
  { name: "Gujarati", code: "gu", localName: "ગુજરાતી" },
  { name: "Malayalam", code: "ml", localName: "മലയാളം" },
  { name: "Punjabi", code: "pa", localName: "ਪੰਜਾਬੀ" }
];

export default function Profile() {
  const navigate = useNavigate();
  const { user, logout, updateUser } = useAuth();
  const { language, setLanguage } = useLanguage();

  // Modals state
  const [activeModal, setActiveModal] = useState(null); // 'language' | 'security' | 'help' | 'editProfile'
  const [langSearch, setLangSearch] = useState("");
  const [currentLang, setCurrentLang] = useState("English");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // Edit profile form state
  const [profileForm, setProfileForm] = useState({
    name: user?.name || user?.full_name || user?.username || "Alex Henderson",
    email: user?.email || "alex.henderson@medpulse.io",
    phone: user?.phone_number || "+91 98765 43210"
  });

  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || user.full_name || user.username || "Alex Henderson",
        email: user.email || "alex.henderson@medpulse.io",
        phone: user.phone_number || "+91 98765 43210"
      });
    }
  }, [user]);

  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  const userName = user?.name || user?.full_name || user?.username || profileForm.name;
  const userEmail = user?.email || profileForm.email;

  const initials = userName
    .split(" ")
    .map((word) => word[0])
    .filter(Boolean)
    .join("")
    .toUpperCase()
    .slice(0, 2) || "AH";

  const handleLogout = async () => {
    await logout();
    toast.success("Signed out of HealthBuddy");
    navigate("/login");
  };

  const handleLanguageSelect = (langName) => {
    setCurrentLang(langName);
    const matched = AVAILABLE_LANGUAGES.find(l => l.name === langName);
    if (matched && setLanguage) {
      setLanguage({ label: matched.name, code: matched.code });
    }
    toast.success(`Preferred Language set to ${langName}`);
    setActiveModal(null);
  };

  const handleToggleNotifications = (checked) => {
    setNotificationsEnabled(checked);
    toast.success(checked ? "Notifications enabled" : "Notifications muted");
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    await updateUser({
      name: profileForm.name,
      full_name: profileForm.name,
      username: profileForm.name,
      email: profileForm.email,
      phone: profileForm.phone,
      phone_number: profileForm.phone
    });
    toast.success("Profile details saved successfully! 👤");
    setActiveModal(null);
  };

  const handleChangePassword = (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("New passwords do not match!");
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      toast.error("Password must be at least 6 characters!");
      return;
    }
    toast.success("Password updated successfully!");
    setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    setActiveModal(null);
  };

  const filteredLanguages = AVAILABLE_LANGUAGES.filter(
    (l) =>
      l.name.toLowerCase().includes(langSearch.toLowerCase()) ||
      l.localName.toLowerCase().includes(langSearch.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3 mb-2">
        <div>
          <h1 className="font-manrope text-headline-lg text-on-surface font-bold tracking-tight">
            Patient Profile & Settings
          </h1>
          <p className="font-sans text-body-md text-on-surface-variant mt-0.5">
            Manage your personal healthcare identity, preferences, and security.
          </p>
        </div>
        <span className="text-xs font-semibold text-secondary bg-secondary-container px-3.5 py-1.5 rounded-full border border-secondary-fixed-dim flex items-center gap-1.5">
          <span className="material-symbols-outlined text-sm">verified_user</span>
          <span>Verified Patient ID #MP-8921</span>
        </span>
      </div>

      <div className="w-full space-y-6">
        {/* Profile Identity Card */}
        <Card className="rounded-2xl p-6 shadow-card border border-outline-variant bg-surface-container-lowest text-on-surface">
          <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
              <Avatar className="h-20 w-20 border-2 border-primary ring-4 ring-primary-fixed/40">
                <AvatarFallback className="bg-primary text-2xl font-bold text-white font-manrope">
                  {initials}
                </AvatarFallback>
              </Avatar>

              <div>
                <h2 className="text-xl font-bold text-on-surface font-manrope">
                  {userName}
                </h2>
                <div className="mt-1 flex items-center justify-center sm:justify-start gap-1.5 text-xs text-on-surface-variant">
                  <Mail size={14} className="text-primary" />
                  <span>{userEmail}</span>
                </div>
                <div className="mt-1 flex items-center justify-center sm:justify-start gap-1.5 text-xs text-on-surface-variant">
                  <span className="inline-block w-2 h-2 rounded-full bg-secondary" />
                  <span>{profileForm.phone}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setProfileForm({
                  name: userName,
                  email: userEmail,
                  phone: user?.phone || user?.phone_number || profileForm.phone || "+91 98765 43210"
                });
                setActiveModal("editProfile");
              }}
              className="flex items-center gap-1.5 px-4 py-2 border border-primary text-primary text-xs font-bold rounded-full hover:bg-primary-fixed/30 transition-colors"
            >
              <Edit3 size={14} />
              <span>Edit Profile</span>
            </button>
          </div>
        </Card>

        {/* Preferences Section */}
        <Card className="rounded-2xl p-6 shadow-card border border-outline-variant bg-surface-container-lowest text-on-surface">
          <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-primary">
            Health System Preferences
          </h3>

          <div className="space-y-4">
            {/* Preferred Language Action */}
            <button
              onClick={() => setActiveModal("language")}
              className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-surface-container-low transition-colors text-left group"
            >
              <div className="flex items-center gap-3.5">
                <div className="p-2.5 rounded-xl bg-primary-fixed/40 text-primary">
                  <Globe size={20} />
                </div>
                <div>
                  <p className="font-bold text-sm text-on-surface">
                    Preferred Language
                  </p>
                  <p className="text-xs text-on-surface-variant">
                    {currentLang} (Click to change dialect & TTS)
                  </p>
                </div>
              </div>
              <ChevronRight size={18} className="text-outline group-hover:text-primary transition-colors" />
            </button>

            <Separator className="bg-outline-variant" />

            {/* Notifications Action */}
            <div className="flex items-center justify-between p-3">
              <div className="flex items-center gap-3.5">
                <div className="p-2.5 rounded-xl bg-secondary-container text-on-secondary-container">
                  <Bell size={20} />
                </div>
                <div>
                  <p className="font-bold text-sm text-on-surface">
                    Medication & Appointment Alerts
                  </p>
                  <p className="text-xs text-on-surface-variant">
                    {notificationsEnabled ? "Receive dosage reminders & vital notifications" : "Notifications disabled"}
                  </p>
                </div>
              </div>
              <Switch
                checked={notificationsEnabled}
                onCheckedChange={handleToggleNotifications}
              />
            </div>
          </div>
        </Card>

        {/* Security & Account Section */}
        <Card className="rounded-2xl p-6 shadow-card border border-outline-variant bg-surface-container-lowest text-on-surface">
          <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-primary">
            Security & Support
          </h3>

          <div className="space-y-2">
            {/* Privacy & Security Action */}
            <button
              onClick={() => setActiveModal("security")}
              className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-surface-container-low transition-colors text-left group"
            >
              <div className="flex items-center gap-3.5">
                <div className="p-2.5 rounded-xl bg-surface-container text-primary">
                  <Shield size={20} />
                </div>
                <div>
                  <p className="font-bold text-sm text-on-surface">
                    Privacy & Credentials
                  </p>
                  <p className="text-xs text-on-surface-variant">
                    Change password & security controls
                  </p>
                </div>
              </div>
              <ChevronRight size={18} className="text-outline group-hover:text-primary transition-colors" />
            </button>

            {/* Help & Support Action */}
            <button
              onClick={() => setActiveModal("help")}
              className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-surface-container-low transition-colors text-left group"
            >
              <div className="flex items-center gap-3.5">
                <div className="p-2.5 rounded-xl bg-surface-container text-primary">
                  <HelpCircle size={20} />
                </div>
                <div>
                  <p className="font-bold text-sm text-on-surface">
                    Clinical Help & 24/7 Helpline
                  </p>
                  <p className="text-xs text-on-surface-variant">
                    FAQs, emergency numbers & support
                  </p>
                </div>
              </div>
              <ChevronRight size={18} className="text-outline group-hover:text-primary transition-colors" />
            </button>
          </div>
        </Card>

        {/* Logout Button */}
        <button
          className="w-full py-3.5 rounded-full bg-error text-white font-bold text-xs hover:bg-error/90 transition-all shadow-sm flex items-center justify-center gap-2"
          onClick={handleLogout}
        >
          <LogOut size={16} />
          <span>Sign Out of HEALTHBUDDY</span>
        </button>

        <p className="pb-4 text-center text-xs text-on-surface-variant">
          HEALTHBUDDY Healthcare Assistant • Version 2.4.0
          <br />
          Encrypted & SAIF-Compliant
        </p>
      </div>

      {/* ============================================================ */}
      {/* MODAL 1: PREFERRED LANGUAGE MODAL */}
      {/* ============================================================ */}
      {activeModal === "language" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-3xl border border-outline-variant bg-surface-container-lowest p-6 shadow-floating text-on-surface max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-outline-variant pb-3">
              <div className="flex items-center gap-2">
                <Globe className="text-primary" size={20} />
                <h3 className="font-bold font-manrope text-lg text-on-surface">Select Preferred Language</h3>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="rounded-full p-1 text-on-surface-variant hover:bg-surface-container"
              >
                <X size={18} />
              </button>
            </div>

            <div className="my-3 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" size={16} />
              <input
                type="text"
                placeholder="Search language (e.g. Hindi, Tamil)..."
                value={langSearch}
                onChange={(e) => setLangSearch(e.target.value)}
                className="w-full rounded-full border border-outline-variant bg-surface-container-low py-2.5 pl-9 pr-4 text-sm outline-none focus:border-primary"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
              {filteredLanguages.map((lang) => {
                const isSelected = currentLang === lang.name;
                return (
                  <button
                    key={lang.code}
                    onClick={() => handleLanguageSelect(lang.name)}
                    className={`w-full flex items-center justify-between p-3 rounded-2xl border text-left transition-all ${
                      isSelected
                        ? "border-primary bg-primary-fixed/30 text-primary font-bold shadow-xs"
                        : "border-outline-variant bg-surface-container-lowest hover:bg-surface-container-low text-on-surface"
                    }`}
                  >
                    <div>
                      <span className="font-semibold text-sm">{lang.name}</span>
                      <span className="ml-2 text-xs text-on-surface-variant">({lang.localName})</span>
                    </div>
                    {isSelected && <Check size={16} className="text-primary font-bold" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 2: PRIVACY & SECURITY MODAL */}
      {/* ============================================================ */}
      {activeModal === "security" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-3xl border border-outline-variant bg-surface-container-lowest p-6 shadow-floating text-on-surface max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-outline-variant pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Shield className="text-primary" size={20} />
                <h3 className="font-bold font-manrope text-lg text-on-surface">Privacy & Security</h3>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="rounded-full p-1 text-on-surface-variant hover:bg-surface-container"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="rounded-2xl border border-secondary-fixed-dim bg-secondary-container/30 p-3.5 text-xs text-on-secondary-container font-medium">
                🔒 Your medical records and voice queries are end-to-end encrypted with zero unauthorized data sharing.
              </div>

              <div>
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  required
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  className="w-full rounded-2xl border border-outline-variant bg-surface-container-low py-2.5 px-3.5 text-sm outline-none focus:border-primary"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  required
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  className="w-full rounded-2xl border border-outline-variant bg-surface-container-low py-2.5 px-3.5 text-sm outline-none focus:border-primary"
                  placeholder="At least 6 characters"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  className="w-full rounded-2xl border border-outline-variant bg-surface-container-low py-2.5 px-3.5 text-sm outline-none focus:border-primary"
                  placeholder="Repeat new password"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 text-xs font-bold text-on-surface-variant hover:text-on-surface"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-primary text-white text-xs font-bold rounded-full hover:bg-primary-container"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 3: HELP & SUPPORT MODAL */}
      {/* ============================================================ */}
      {activeModal === "help" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-3xl border border-outline-variant bg-surface-container-lowest p-6 shadow-floating text-on-surface max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-outline-variant pb-3 mb-4">
              <div className="flex items-center gap-2">
                <HelpCircle className="text-primary" size={20} />
                <h3 className="font-bold font-manrope text-lg text-on-surface">Clinical Help & Helpline</h3>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="rounded-full p-1 text-on-surface-variant hover:bg-surface-container"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="rounded-2xl border border-error/30 bg-error-container/30 p-4">
                <p className="font-bold text-sm text-error flex items-center gap-2">
                  <PhoneCall size={16} /> 24/7 Emergency Ambulance
                </p>
                <p className="text-xs text-on-error-container mt-1 font-semibold">National Emergency: 108 / 112</p>
              </div>

              <div className="rounded-2xl border border-outline-variant bg-surface-container-low p-4 space-y-2">
                <p className="font-bold text-sm text-on-surface">HEALTHBUDDY Support</p>
                <p className="text-on-surface-variant">Email: support@healthbuddy.io</p>
                <p className="text-on-surface-variant">Toll Free: 1800-419-HEALTHBUDDY</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 4: EDIT PROFILE MODAL */}
      {/* ============================================================ */}
      {activeModal === "editProfile" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-3xl border border-outline-variant bg-surface-container-lowest p-6 shadow-floating text-on-surface max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-outline-variant pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Edit3 className="text-primary" size={20} />
                <h3 className="font-bold font-manrope text-lg text-on-surface">Edit Profile Details</h3>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="rounded-full p-1 text-on-surface-variant hover:bg-surface-container"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  className="w-full rounded-2xl border border-outline-variant bg-surface-container-low py-2.5 px-3.5 text-sm outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={profileForm.email}
                  onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                  className="w-full rounded-2xl border border-outline-variant bg-surface-container-low py-2.5 px-3.5 text-sm outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  required
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  className="w-full rounded-2xl border border-outline-variant bg-surface-container-low py-2.5 px-3.5 text-sm outline-none focus:border-primary"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 text-xs font-bold text-on-surface-variant hover:text-on-surface"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-primary text-white text-xs font-bold rounded-full hover:bg-primary-container shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}