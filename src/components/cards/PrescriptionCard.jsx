import React from "react";
import { Eye, Trash2, LayoutDashboard, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { setActiveDocumentId } from "@/services/documentDashboardService";
import { downloadFileSafe } from "@/utils/mobileDownloadHelper";
import toast from "react-hot-toast";

export default function PrescriptionCard({
  id,
  date,
  title,
  medication,
  language,
  doctor,
  hospital,
  diagnosis,
  status,
  onView,
  onDelete,
}) {
  const navigate = useNavigate();

  const handleSyncToDashboard = (e) => {
    e.stopPropagation();
    if (id) {
      setActiveDocumentId(id);
      toast.success("Document synced to HealthBuddy Dashboard! 📊");
      navigate("/home");
    }
  };

  const statusList = Array.isArray(status) ? status : status ? [status] : ["Prescription"];

  return (
    <div className="bg-surface-container-lowest border border-outline-variant hover:border-primary/60 rounded-2xl p-5 shadow-card transition-all flex flex-col justify-between group">
      <div>
        <div className="flex justify-between items-start mb-2">
          <span className="text-[11px] font-bold text-on-surface-variant bg-surface-container-low px-2.5 py-0.5 rounded-full border border-outline-variant/60">
            {date || "Recent Date"}
          </span>
          <span className="text-[11px] font-bold text-primary bg-primary-fixed px-2.5 py-0.5 rounded-full">
            {language || "English"}
          </span>
        </div>

        <h3 className="font-manrope font-bold text-base text-on-surface group-hover:text-primary transition-colors line-clamp-1">
          {title || medication || "Medical Document"}
        </h3>

        {diagnosis && (
          <p className="text-xs text-on-surface-variant font-medium mt-1 line-clamp-1">
            Diagnosis: {diagnosis}
          </p>
        )}

        <div className="mt-3 p-2.5 rounded-xl bg-surface-container-low border border-outline-variant/40 space-y-1 text-xs">
          <p className="font-semibold text-on-surface flex items-center gap-1.5 truncate">
            <span className="material-symbols-outlined text-sm text-primary">stethoscope</span>
            <span>{doctor || "Consultant Doctor"}</span>
          </p>
          {hospital && (
            <p className="text-on-surface-variant flex items-center gap-1.5 truncate text-[11px]">
              <span className="material-symbols-outlined text-sm text-on-surface-variant">location_on</span>
              <span>{hospital}</span>
            </p>
          )}
        </div>

        {/* Status Badges */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {statusList.map((item, idx) => (
            <span
              key={idx}
              className="bg-secondary-container text-on-secondary-container text-[10px] font-bold px-2 py-0.5 rounded-full"
            >
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* Card Action Buttons */}
      <div className="mt-4 pt-3 border-t border-outline-variant flex flex-wrap items-center gap-1.5">
        <button
          onClick={onView}
          className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-full bg-primary text-white text-xs font-bold hover:bg-primary-container transition-all shadow-xs"
        >
          <Eye size={13} />
          <span>Details</span>
        </button>

        <button
          onClick={async (e) => {
            e.stopPropagation();
            const text = `HEALTHBUDDY PRESCRIPTION RECORD #${id || "DOC"}\nDate: ${date || "N/A"}\nTitle: ${title || medication || "Prescription"}\nDoctor: ${doctor || "Consultant"}\nHospital: ${hospital || "Medical Center"}\nDiagnosis: ${diagnosis || "Consultation"}`;
            await downloadFileSafe(`HEALTHBUDDY-Record-${id || "doc"}.txt`, text, "text/plain;charset=utf-8");
          }}
          className="flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-full bg-secondary text-white hover:bg-secondary-fixed-dim text-xs font-bold transition-all shadow-xs"
          title="Download prescription file"
        >
          <Download size={13} />
          <span>Download</span>
        </button>

        <button
          onClick={handleSyncToDashboard}
          className="flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-full bg-secondary-container text-on-secondary-container text-xs font-bold hover:bg-secondary-fixed transition-all"
          title="Display this document on Dashboard"
        >
          <LayoutDashboard size={13} />
          <span className="hidden sm:inline">Sync</span>
        </button>

        <button
          onClick={onDelete}
          className="p-1.5 rounded-full text-outline hover:text-error hover:bg-error-container/30 transition-colors"
          title="Delete Record"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}