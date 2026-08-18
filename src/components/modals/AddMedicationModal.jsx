import React, { useState } from "react";
import toast from "react-hot-toast";

export default function AddMedicationModal({ isOpen, onClose, onAddMedication }) {
  if (!isOpen) return null;

  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [frequency, setFrequency] = useState("Daily with food");
  const [timeOfDay, setTimeOfDay] = useState("Morning");
  const [notes, setNotes] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter a medicine name");
      return;
    }

    const newMed = {
      id: Date.now(),
      name: name.trim(),
      dosage: dosage.trim() || "10mg",
      frequency,
      timeOfDay,
      notes,
      taken: false,
    };

    if (onAddMedication) {
      onAddMedication(newMed);
    }
    toast.success(`${name} added to your active medication list! 💊`);
    setName("");
    setDosage("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-surface-container-lowest w-full max-w-md rounded-3xl border border-outline-variant shadow-floating overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-primary text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10"
          >
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">medication</span>
            </div>
            <div>
              <h2 className="font-manrope text-lg font-bold">Add Medication</h2>
              <p className="text-xs text-primary-fixed-dim">Set up dosing reminder and schedule</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
              Medicine Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="E.g., Metformin, Lisinopril, Amlodipine"
              className="w-full bg-surface-container-low border border-outline-variant rounded-2xl px-4 py-2.5 text-sm font-medium focus:border-primary outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
                Dosage
              </label>
              <input
                type="text"
                value={dosage}
                onChange={(e) => setDosage(e.target.value)}
                placeholder="E.g., 500mg, 1 tablet"
                className="w-full bg-surface-container-low border border-outline-variant rounded-2xl px-4 py-2.5 text-sm font-medium focus:border-primary outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
                Timing
              </label>
              <select
                value={timeOfDay}
                onChange={(e) => setTimeOfDay(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant rounded-2xl px-3 py-2.5 text-sm font-medium focus:border-primary outline-none"
              >
                <option value="Morning">Morning</option>
                <option value="Afternoon">Afternoon</option>
                <option value="Evening">Evening</option>
                <option value="Bedtime">Bedtime</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
              Frequency & Instructions
            </label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant rounded-2xl px-3 py-2.5 text-sm font-medium focus:border-primary outline-none"
            >
              <option value="Daily with food">Daily with food</option>
              <option value="Twice daily (after meals)">Twice daily (after meals)</option>
              <option value="Once at bedtime">Once at bedtime</option>
              <option value="As needed for symptoms">As needed for symptoms</option>
            </select>
          </div>

          <div className="pt-3 flex items-center justify-end gap-3 border-t border-outline-variant">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-on-surface-variant hover:text-on-surface"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-primary text-white text-xs font-bold rounded-full hover:bg-primary-container transition-all shadow-sm flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              <span>Add Medication</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
