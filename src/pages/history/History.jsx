import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import PageHeader from "@/components/common/PageHeader";
import EmptyState from "@/components/common/EmptyState";
import PrescriptionCard from "@/components/cards/PrescriptionCard";

const DEFAULT_PRESCRIPTIONS = [
  {
    id: 1,
    date: "26 July 2026",
    medication: "Paracetamol",
    language: "Telugu",
    doctor: "Dr. Kumar",
    status: ["Simplified", "Translated"],
    prescriptionText: "Fever and body pain prescription for adults.",
  },
  {
    id: 2,
    date: "20 July 2026",
    medication: "Amoxicillin",
    language: "English",
    doctor: "Dr. Sharma",
    status: ["Translated"],
    prescriptionText: "Antibiotic dosage for bacterial infection.",
  },
];

export default function History() {
  const navigate = useNavigate();

  const [prescriptions, setPrescriptions] = useState(() => {
    try {
      const stored = localStorage.getItem("user_prescriptions");
      const savedList = stored ? JSON.parse(stored) : [];
      return [...savedList, ...DEFAULT_PRESCRIPTIONS];
    } catch (_) {
      return DEFAULT_PRESCRIPTIONS;
    }
  });

  const [search, setSearch] = useState("");
  const [languageFilter, setLanguageFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [doctorFilter, setDoctorFilter] = useState("All");
  const [sortOrder, setSortOrder] = useState("Recent");

  const filteredPrescriptions = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    let result = prescriptions.filter((item) => {
      const matchesSearch =
        normalizedSearch === "" ||
        (item.medication || item.title || "").toLowerCase().includes(normalizedSearch) ||
        (item.doctor || item.hospital || "").toLowerCase().includes(normalizedSearch) ||
        (item.prescriptionText || item.ocrText || "").toLowerCase().includes(normalizedSearch);

      const matchesLanguage =
        languageFilter === "All" || item.language === languageFilter;
      const matchesDate = dateFilter === "All" || item.date === dateFilter;
      const matchesStatus =
        statusFilter === "All" || (Array.isArray(item.status) ? item.status.includes(statusFilter) : item.status === statusFilter);
      const matchesDoctor =
        doctorFilter === "All" || item.doctor === doctorFilter;

      return (
        matchesSearch &&
        matchesLanguage &&
        matchesDate &&
        matchesStatus &&
        matchesDoctor
      );
    });

    result = [...result].sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);

      if (sortOrder === "Oldest") {
        return dateA - dateB;
      }

      return dateB - dateA;
    });

    return result;
  }, [dateFilter, doctorFilter, languageFilter, prescriptions, search, sortOrder, statusFilter]);

  const handleDelete = (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this prescription record?"
    );

    if (confirmDelete) {
      setPrescriptions((prev) => {
        const updated = prev.filter((item) => item.id !== id);
        const userOnly = updated.filter((item) => typeof item.id === "string" && item.id.startsWith("ocr-"));
        localStorage.setItem("user_prescriptions", JSON.stringify(userOnly));
        return updated;
      });
    }
  };

  const clearFilters = () => {
    setSearch("");
    setLanguageFilter("All");
    setDateFilter("All");
    setStatusFilter("All");
    setDoctorFilter("All");
    setSortOrder("Recent");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3 mb-2">
        <div>
          <h1 className="font-manrope text-headline-lg text-on-surface font-bold tracking-tight">
            Medical Records & Prescription History
          </h1>
          <p className="font-sans text-body-md text-on-surface-variant mt-0.5">
            Access your previously simplified prescriptions, lab results, and OCR scans.
          </p>
        </div>
        <button
          onClick={() => navigate("/upload")}
          className="flex items-center gap-2 bg-primary text-on-primary px-5 py-2.5 rounded-full text-xs font-bold hover:bg-primary-container transition-all shadow-sm"
        >
          <span className="material-symbols-outlined text-base">upload_file</span>
          <span>Upload Record</span>
        </button>
      </div>

      <div className="max-w-5xl mx-auto space-y-6">
        {/* Search & Filter Toolbar */}
        <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant shadow-card space-y-4">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-xl">
              search
            </span>
            <input
              type="text"
              placeholder="Search by prescription name, medication, doctor, or extracted diagnosis..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant rounded-full pl-11 pr-4 py-2.5 text-sm focus:border-primary outline-none text-on-surface"
            />
          </div>

          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 text-xs">
            <select
              className="rounded-xl border border-outline-variant bg-surface-container-low px-3 py-2 text-on-surface outline-none focus:border-primary font-medium"
              value={languageFilter}
              onChange={(e) => setLanguageFilter(e.target.value)}
            >
              <option value="All">All Languages</option>
              <option value="Telugu">Telugu</option>
              <option value="English">English</option>
              <option value="Hindi">Hindi</option>
              <option value="Tamil">Tamil</option>
              <option value="Marathi">Marathi</option>
            </select>

            <select
              className="rounded-xl border border-outline-variant bg-surface-container-low px-3 py-2 text-on-surface outline-none focus:border-primary font-medium"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            >
              <option value="All">All Dates</option>
              <option value="26 July 2026">26 July 2026</option>
              <option value="20 July 2026">20 July 2026</option>
              <option value="Oct 12, 2024">Oct 12, 2024</option>
            </select>

            <select
              className="rounded-xl border border-outline-variant bg-surface-container-low px-3 py-2 text-on-surface outline-none focus:border-primary font-medium"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All">All Status</option>
              <option value="Completed">Completed</option>
              <option value="Simplified">Simplified</option>
              <option value="Translated">Translated</option>
            </select>

            <select
              className="rounded-xl border border-outline-variant bg-surface-container-low px-3 py-2 text-on-surface outline-none focus:border-primary font-medium"
              value={doctorFilter}
              onChange={(e) => setDoctorFilter(e.target.value)}
            >
              <option value="All">All Doctors</option>
              <option value="Dr. Sarah Jenkins">Dr. Sarah Jenkins</option>
              <option value="Dr. Kumar">Dr. Kumar</option>
              <option value="Dr. Sharma">Dr. Sharma</option>
              <option value="Dr. Sushil Jethani">Dr. Sushil Jethani</option>
            </select>

            <select
              className="rounded-xl border border-outline-variant bg-surface-container-low px-3 py-2 text-on-surface outline-none focus:border-primary font-medium"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
            >
              <option value="Recent">Recent First</option>
              <option value="Oldest">Oldest First</option>
            </select>

            <button
              onClick={clearFilters}
              className="rounded-xl border border-outline-variant text-on-surface-variant hover:bg-surface-container font-bold py-2 transition-colors flex items-center justify-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">filter_alt_off</span>
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Prescriptions List */}
        <div className="space-y-4">
          {filteredPrescriptions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-outline-variant bg-surface-container-lowest p-10 text-center shadow-sm">
              <div className="w-16 h-16 rounded-full bg-surface-container mx-auto flex items-center justify-center text-outline mb-3">
                <span className="material-symbols-outlined text-3xl">description</span>
              </div>
              <h3 className="font-manrope text-base font-bold text-on-surface">No records match your filters</h3>
              <p className="text-xs text-on-surface-variant mt-1">Upload a prescription or clear search filters to view your history.</p>
              <div className="mt-5 flex justify-center">
                <button
                  onClick={() => navigate("/upload")}
                  className="bg-primary hover:bg-primary-container text-white text-xs font-bold px-6 py-2.5 rounded-full shadow-sm"
                >
                  Upload New Record
                </button>
              </div>
            </div>
          ) : (
            filteredPrescriptions.map((prescription) => (
              <PrescriptionCard
                key={prescription.id}
                id={prescription.id}
                date={prescription.date}
                title={prescription.title}
                medication={prescription.medication || prescription.title || prescription.diagnosis || "Medical Scan"}
                language={prescription.language || "English"}
                doctor={prescription.doctor || "Consultant Doctor"}
                hospital={prescription.hospital || ""}
                diagnosis={prescription.diagnosis || ""}
                status={Array.isArray(prescription.status) ? prescription.status : [prescription.status || "Completed"]}
                onView={() => {
                  navigate(`/prescription/${prescription.id}`);
                }}
                onDelete={() => {
                  handleDelete(prescription.id);
                }}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}