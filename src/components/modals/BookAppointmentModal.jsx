import React, { useState } from "react";
import toast from "react-hot-toast";

const SPECIALISTS = [
  {
    id: "sarah",
    name: "Dr. Sarah Jenkins",
    specialty: "Cardiologist",
    rating: "4.9 ★ (120 reviews)",
    availability: "Available Tomorrow",
    avatar: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&auto=format&fit=crop&q=80",
    fee: "$45 / Telehealth"
  },
  {
    id: "rajesh",
    name: "Dr. Rajesh Sharma",
    specialty: "General Physician",
    rating: "4.8 ★ (98 reviews)",
    availability: "Available Today",
    avatar: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80",
    fee: "$30 / Telehealth"
  },
  {
    id: "priya",
    name: "Dr. Priya Nair",
    specialty: "Pulmonologist & Respiratory",
    rating: "5.0 ★ (140 reviews)",
    availability: "Available Friday",
    avatar: "https://images.unsplash.com/photo-1594824813593-9080c3547f89?w=150&auto=format&fit=crop&q=80",
    fee: "$50 / Telehealth"
  },
];

const TIME_SLOTS = [
  "09:30 AM - 10:00 AM",
  "10:00 AM - 10:45 AM",
  "02:00 PM - 02:30 PM",
  "04:15 PM - 05:00 PM",
  "06:00 PM - 06:30 PM",
];

export default function BookAppointmentModal({ isOpen, onClose, onAppointmentBooked }) {
  if (!isOpen) return null;

  const [selectedDoctor, setSelectedDoctor] = useState(SPECIALISTS[0]);
  const [selectedDate, setSelectedDate] = useState("2024-10-24");
  const [selectedSlot, setSelectedSlot] = useState(TIME_SLOTS[1]);
  const [consultationType, setConsultationType] = useState("telehealth");
  const [symptoms, setSymptoms] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);
      toast.success(`Appointment confirmed with ${selectedDoctor.name} on ${selectedDate} at ${selectedSlot}! 🎉`);
      if (onAppointmentBooked) {
        onAppointmentBooked({
          doctor: selectedDoctor,
          date: selectedDate,
          time: selectedSlot,
          type: consultationType,
          symptoms,
        });
      }
      onClose();
    }, 700);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-surface-container-lowest w-full max-w-xl rounded-3xl border border-outline-variant shadow-floating overflow-hidden"
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
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">calendar_month</span>
            </div>
            <div>
              <h2 className="font-manrope text-xl font-bold">Book a Medical Appointment</h2>
              <p className="text-xs text-primary-fixed-dim">Instant Telehealth or In-Clinic Consultation</p>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[72vh] overflow-y-auto">
          
          {/* Consultation Type Selector */}
          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">
              Consultation Mode
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setConsultationType("telehealth")}
                className={`flex items-center justify-center gap-2 p-3 rounded-2xl border transition-all text-xs font-bold ${
                  consultationType === "telehealth"
                    ? "border-primary bg-primary-fixed/30 text-primary shadow-sm"
                    : "border-outline-variant text-on-surface-variant hover:bg-surface-container"
                }`}
              >
                <span className="material-symbols-outlined text-lg">videocam</span>
                <span>HD Telehealth Call</span>
              </button>
              <button
                type="button"
                onClick={() => setConsultationType("clinic")}
                className={`flex items-center justify-center gap-2 p-3 rounded-2xl border transition-all text-xs font-bold ${
                  consultationType === "clinic"
                    ? "border-primary bg-primary-fixed/30 text-primary shadow-sm"
                    : "border-outline-variant text-on-surface-variant hover:bg-surface-container"
                }`}
              >
                <span className="material-symbols-outlined text-lg">local_hospital</span>
                <span>In-Clinic Visit</span>
              </button>
            </div>
          </div>

          {/* Select Doctor */}
          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">
              Select Healthcare Specialist
            </label>
            <div className="space-y-2">
              {SPECIALISTS.map((doc) => {
                const isSelected = selectedDoctor.id === doc.id;
                return (
                  <div
                    key={doc.id}
                    onClick={() => setSelectedDoctor(doc)}
                    className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition-all ${
                      isSelected
                        ? "border-primary bg-primary-fixed/20 shadow-sm"
                        : "border-outline-variant hover:bg-surface-container-low"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={doc.avatar}
                        alt={doc.name}
                        className="w-12 h-12 rounded-xl object-cover border border-outline-variant"
                      />
                      <div>
                        <h4 className="font-manrope text-sm font-bold text-on-surface">{doc.name}</h4>
                        <p className="text-xs text-primary font-semibold">{doc.specialty}</p>
                        <p className="text-[11px] text-on-surface-variant">{doc.rating}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-on-surface">{doc.fee}</span>
                      <p className="text-[11px] text-secondary font-bold">{doc.availability}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Date & Time Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                Preferred Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant rounded-2xl px-4 py-2.5 text-sm font-medium focus:border-primary outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                Time Slot
              </label>
              <select
                value={selectedSlot}
                onChange={(e) => setSelectedSlot(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant rounded-2xl px-4 py-2.5 text-sm font-medium focus:border-primary outline-none"
              >
                {TIME_SLOTS.map((slot) => (
                  <option key={slot} value={slot}>{slot}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Reason / Symptoms */}
          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">
              Symptoms / Reason for Consultation (Optional)
            </label>
            <textarea
              rows={2}
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              placeholder="E.g., Routine cardiac follow-up, mild chest tightness, review blood pressure readings..."
              className="w-full bg-surface-container-low border border-outline-variant rounded-2xl p-3 text-xs focus:border-primary outline-none resize-none"
            ></textarea>
          </div>

          {/* Submit CTA */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-outline-variant">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold text-on-surface-variant hover:text-on-surface"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-primary text-white text-xs font-bold rounded-full hover:bg-primary-container transition-all shadow-sm flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                  <span>Confirming...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">check_circle</span>
                  <span>Confirm Appointment</span>
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
