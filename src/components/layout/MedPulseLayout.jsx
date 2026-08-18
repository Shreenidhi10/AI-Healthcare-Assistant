import React, { useState } from "react";
import MedPulseHeader from "./MedPulseHeader";
import MedPulseSidebar from "./MedPulseSidebar";
import MedPulseFooter from "./MedPulseFooter";
import MobileBottomNav from "./MobileBottomNav";
import MedicalIdModal from "@/components/modals/MedicalIdModal";
import BookAppointmentModal from "@/components/modals/BookAppointmentModal";
import NotificationsModal from "@/components/modals/NotificationsModal";
import TelehealthCallModal from "@/components/modals/TelehealthCallModal";
import InstallAppModal from "@/components/modals/InstallAppModal";
import { useAuth } from "@/contexts/AuthContext";

export default function MedPulseLayout({ children }) {
  const { user } = useAuth();
  const [medicalIdOpen, setMedicalIdOpen] = useState(false);
  const [bookAppointmentOpen, setBookAppointmentOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [telehealthOpen, setTelehealthOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [installAppOpen, setInstallAppOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-on-background flex flex-col font-sans overflow-x-hidden w-full max-w-full">
      {/* Top Header */}
      <MedPulseHeader
        onOpenBookAppointment={() => setBookAppointmentOpen(true)}
        onOpenNotifications={() => setNotificationsOpen(true)}
        onToggleMobileSidebar={() => setMobileSidebarOpen((prev) => !prev)}
      />

      {/* Main App Layout - Full Screen Optimized */}
      <div className="pt-16 md:pt-20 flex flex-1 w-full min-w-0 max-w-full overflow-x-hidden">
        {/* Left Sidebar on Desktop & Mobile Drawer */}
        <MedPulseSidebar
          onOpenMedicalId={() => setMedicalIdOpen(true)}
          isMobileOpen={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
          onOpenInstallApp={() => setInstallAppOpen(true)}
        />

        {/* Dynamic Page Content (Full Width beside Left Sidebar) */}
        <div className="flex-1 lg:pl-64 flex flex-col min-h-[calc(100vh-80px)] w-full min-w-0 max-w-full overflow-x-hidden">
          <main className="flex-1 w-full min-w-0 max-w-full px-3 sm:px-6 lg:px-8 py-4 sm:py-5 pb-24 lg:pb-8 overflow-x-hidden">
            {React.isValidElement(children)
              ? React.cloneElement(children, {
                  onOpenMedicalId: () => setMedicalIdOpen(true),
                  onOpenBookAppointment: () => setBookAppointmentOpen(true),
                  onOpenTelehealth: () => setTelehealthOpen(true),
                  onOpenInstallApp: () => setInstallAppOpen(true),
                })
              : children}
          </main>
          <MedPulseFooter />
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav onOpenMedicalId={() => setMedicalIdOpen(true)} />

      {/* Interactive Global Modals */}
      <MedicalIdModal
        isOpen={medicalIdOpen}
        onClose={() => setMedicalIdOpen(false)}
        user={user}
      />

      <InstallAppModal
        isOpen={installAppOpen}
        onClose={() => setInstallAppOpen(false)}
      />

      <BookAppointmentModal
        isOpen={bookAppointmentOpen}
        onClose={() => setBookAppointmentOpen(false)}
      />

      <NotificationsModal
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
      />

      <TelehealthCallModal
        isOpen={telehealthOpen}
        onClose={() => setTelehealthOpen(false)}
      />
    </div>
  );
}
