import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import LandingPage from "./pages/landing/LandingPage";
import Home from "@/pages/home/Home";
import History from "./pages/history/History";
import PrescriptionDetails from "./pages/history/PrescriptionDetails";
import Upload from "./pages/upload/Upload";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import Profile from "./pages/profile/Profile";
import Assistant from "./pages/assistant/Assistant";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import MedPulseLayout from "@/components/layout/MedPulseLayout";

import { Workspace } from "@/components/healthcare/Workspace";
import { AppHeader } from "@/components/healthcare/AppHeader";

function ResultsPage() {
  return (
    <div className="space-y-6">
      <AppHeader />
      <Workspace />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <BrowserRouter>
          <Routes>
            {/* Landing & Authentication Pages */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Core MedPulse Application Routes (Inside MedPulseLayout) */}
            <Route
              path="/home"
              element={
                <MedPulseLayout>
                  <Home />
                </MedPulseLayout>
              }
            />
            <Route
              path="/dashboard"
              element={
                <MedPulseLayout>
                  <Home />
                </MedPulseLayout>
              }
            />
            <Route
              path="/results"
              element={
                <MedPulseLayout>
                  <ResultsPage />
                </MedPulseLayout>
              }
            />
            <Route
              path="/upload"
              element={
                <MedPulseLayout>
                  <Upload />
                </MedPulseLayout>
              }
            />
            <Route
              path="/history"
              element={
                <MedPulseLayout>
                  <History />
                </MedPulseLayout>
              }
            />
            <Route
              path="/prescription/:id"
              element={
                <MedPulseLayout>
                  <PrescriptionDetails />
                </MedPulseLayout>
              }
            />
            <Route
              path="/profile"
              element={
                <MedPulseLayout>
                  <Profile />
                </MedPulseLayout>
              }
            />
            <Route
              path="/assistant"
              element={
                <MedPulseLayout>
                  <Assistant />
                </MedPulseLayout>
              }
            />
            <Route path="/chat" element={<Navigate to="/assistant" replace />} />
            <Route path="*" element={<Navigate to="/home" replace />} />
          </Routes>
        </BrowserRouter>
      </LanguageProvider>
    </AuthProvider>
  );
}