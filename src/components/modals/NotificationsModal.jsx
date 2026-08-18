import React from "react";

export default function NotificationsModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const notifications = [
    {
      id: 1,
      title: "Telehealth Call Scheduled",
      desc: "Appointment with Dr. Sarah Jenkins (Cardiologist) confirmed for Oct 24, 10:00 AM.",
      time: "10 mins ago",
      icon: "videocam",
      unread: true,
      type: "appointment",
    },
    {
      id: 2,
      title: "Medication Reminder",
      desc: "Time to take Lisinopril 10mg with breakfast.",
      time: "2 hours ago",
      icon: "medication",
      unread: true,
      type: "med",
    },
    {
      id: 3,
      title: "Lab Results Ready",
      desc: "Your Complete Blood Count & Lipid Panel report from Oct 12 is verified.",
      time: "Yesterday",
      icon: "science",
      unread: false,
      type: "lab",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end p-4 pt-20 bg-black/40 backdrop-blur-xs animate-fade-in" onClick={onClose}>
      <div 
        className="bg-surface-container-lowest w-full max-w-sm rounded-3xl border border-outline-variant shadow-floating overflow-hidden mt-2 mr-2"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 bg-primary text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-xl">notifications</span>
            <h3 className="font-manrope text-sm font-bold">Health Notifications</h3>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        <div className="p-2 divide-y divide-outline-variant max-h-96 overflow-y-auto">
          {notifications.map((n) => (
            <div key={n.id} className={`p-3 rounded-2xl flex items-start gap-3 transition-colors ${n.unread ? "bg-primary-fixed/15" : "hover:bg-surface-container-low"}`}>
              <div className="w-8 h-8 rounded-xl bg-surface-container flex items-center justify-center text-primary flex-shrink-0 mt-0.5">
                <span className="material-symbols-outlined text-base">{n.icon}</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-manrope text-xs font-bold text-on-surface">{n.title}</h4>
                  <span className="text-[10px] text-on-surface-variant">{n.time}</span>
                </div>
                <p className="text-[11px] text-on-surface-variant mt-0.5 leading-snug">{n.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="p-3 bg-surface-container-low border-t border-outline-variant text-center">
          <button onClick={onClose} className="text-xs font-bold text-primary hover:underline">
            Mark all as read
          </button>
        </div>
      </div>
    </div>
  );
}
