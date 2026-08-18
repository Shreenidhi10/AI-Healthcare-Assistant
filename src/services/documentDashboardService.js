/**
 * documentDashboardService.js
 * Synchronizes medical document data (uploaded prescriptions, lab reports, OCR extracts)
 * directly into the HealthBuddy Dashboard.
 */

import { refineOcrData } from "@/pages/upload/utils/ocrRefiner";
import { SAMPLE_PRESCRIPTIONS } from "@/pages/upload/utils/samplePrescriptions";

const USER_DOCUMENTS_KEY = "user_prescriptions";
const ACTIVE_DOC_KEY = "active_dashboard_doc_id";
const MED_TRACKER_KEY = "doc_medication_tracker";

/**
 * Parses raw sample prescription into structured document format
 */
function parseSampleToDoc(sample) {
  const refined = refineOcrData(sample.text);
  
  // Extract or default vitals
  const vitals = {
    bp: refined.vitals?.bp || sample.text.match(/BP:\s*([0-9/]+(?:\s*mmHg)?)/i)?.[1] || "120/80 mmHg",
    pulse: refined.vitals?.pulse || sample.text.match(/Pulse:\s*([0-9]+(?:\s*bpm)?)/i)?.[1] || "76 bpm",
    temp: refined.vitals?.temp || sample.text.match(/Temp:\s*([0-9.]+\s*F)/i)?.[1] || "98.6 °F",
    weight: refined.vitals?.weight || sample.text.match(/Weight|Wt:\s*([0-9.]+\s*kg|[0-9]+\s*lbs)/i)?.[1] || "68 kg",
    spo2: refined.vitals?.spo2 || sample.text.match(/SpO2:\s*([0-9]+%)/i)?.[1] || "98%"
  };

  // Ensure clean medicines list
  const medicines = (refined.medicines && refined.medicines.length > 0)
    ? refined.medicines.map((m, idx) => ({
        id: `${sample.id}-med-${idx}`,
        name: m.name || m.title || "Prescribed Medicine",
        dosage: m.dosage ? `${m.dosage} • ${m.frequency || m.timing || 'As directed'}` : (m.frequency || "Daily with water"),
        frequency: m.frequency || "Once Daily",
        timing: m.timing || "After Meals",
        duration: m.duration || "5 Days",
        instructions: m.instructions || "",
        taken: idx === 0 // first med checked by default
      }))
    : [
        { id: `${sample.id}-med-0`, name: "Prescribed Therapy", dosage: "Daily as directed", frequency: "Daily", timing: "After meals", taken: true }
      ];

  // Extract lab tests
  const labTests = (refined.labTests && refined.labTests.length > 0)
    ? refined.labTests.map(t => ({ name: t, status: "Recommended by Doctor", date: sample.date }))
    : [
        { name: "Complete Blood Count (CBC)", status: "Completed", date: sample.date },
        { name: "Blood Glucose & Metabolic Panel", status: "Completed", date: sample.date }
      ];

  // Extract advice
  const advice = (refined.advice && refined.advice.length > 0)
    ? refined.advice
    : [
        "Drink adequate water and maintain hydration",
        "Take all medications after meals as scheduled",
        "Get adequate rest and avoid physical strain"
      ];

  return {
    id: sample.id,
    title: sample.title || refined.certificate || refined.diagnosis || "Medical Document",
    badge: sample.badge || "Clinical Rx",
    doctor: sample.doctor || refined.doctor || "Consulting Physician",
    doctorDegree: refined.doctorDegree || "M.D. General Medicine",
    hospital: sample.hospital || refined.hospital || "Health Care Medical Center",
    hospitalAddress: refined.hospitalAddress || "",
    patient: sample.patient || refined.patient || "Patient Record",
    patientAge: refined.patientAge || "32",
    patientGender: refined.patientGender || "Adult",
    diagnosis: sample.diagnosis || refined.diagnosis || "General Health Examination",
    date: sample.date || refined.date || new Date().toLocaleDateString("en-GB"),
    followUp: refined.followUpDate || "Review in 5 to 7 days if symptoms persist",
    vitals,
    medicines,
    labTests,
    advice,
    healthScore: 92,
    rawText: sample.text,
    isSample: true
  };
}

/**
 * Retrieves all available medical documents (user uploaded + seeded samples)
 */
export function getAllDocuments() {
  try {
    let userDocs = [];
    const stored = localStorage.getItem(USER_DOCUMENTS_KEY);
    if (stored) {
      userDocs = JSON.parse(stored);
    }

    // Convert raw user prescriptions into full document structures if needed
    const formattedUserDocs = userDocs.map(doc => {
      const refined = doc.ocrText ? refineOcrData(doc.ocrText) : doc;
      
      const vitals = {
        bp: doc.vitals?.bp || refined.vitals?.bp || "120/80 mmHg",
        pulse: doc.vitals?.pulse || refined.vitals?.pulse || "76 bpm",
        temp: doc.vitals?.temp || refined.vitals?.temp || "98.6 °F",
        weight: doc.vitals?.weight || refined.vitals?.weight || "68 kg",
        spo2: doc.vitals?.spo2 || refined.vitals?.spo2 || "98%"
      };

      const medicines = (doc.medicines && doc.medicines.length > 0)
        ? doc.medicines.map((m, idx) => ({
            id: `doc-${doc.id}-med-${idx}`,
            name: m.name || m.title || "Prescribed Medicine",
            dosage: m.dosage ? `${m.dosage} • ${m.frequency || m.timing || 'As directed'}` : (m.frequency || "Daily with water"),
            frequency: m.frequency || "Once Daily",
            timing: m.timing || "After Meals",
            duration: m.duration || "5 Days",
            instructions: m.instructions || "",
            taken: false
          }))
        : (refined.medicines && refined.medicines.length > 0)
        ? refined.medicines.map((m, idx) => ({
            id: `doc-${doc.id}-med-${idx}`,
            name: m.name || "Prescribed Medicine",
            dosage: m.dosage ? `${m.dosage} • ${m.frequency || 'Daily'}` : "As directed",
            frequency: m.frequency || "Once Daily",
            timing: m.timing || "After Meals",
            duration: m.duration || "5 Days",
            instructions: m.instructions || "",
            taken: false
          }))
        : [
            { id: `doc-${doc.id}-med-0`, name: doc.medication || "Active Treatment", dosage: "Daily as prescribed", frequency: "Daily", timing: "After meals", taken: true }
          ];

      const labTests = (doc.labTests && doc.labTests.length > 0)
        ? (Array.isArray(doc.labTests) ? doc.labTests.map(t => typeof t === 'string' ? { name: t, status: "Recommended", date: doc.date } : t) : [])
        : (refined.labTests && refined.labTests.length > 0)
        ? refined.labTests.map(t => ({ name: t, status: "Recommended", date: doc.date }))
        : [
            { name: "Routine Health Checkup", status: "Completed", date: doc.date }
          ];

      const advice = (doc.advice && doc.advice.length > 0)
        ? doc.advice
        : (refined.advice && refined.advice.length > 0)
        ? refined.advice
        : [
            "Follow prescribed medication timings strictly",
            "Maintain balanced diet and hydration",
            "Contact doctor if symptoms worsen"
          ];

      return {
        id: doc.id,
        title: doc.title || doc.diagnosis || "Uploaded Prescription",
        badge: doc.badge || "Uploaded Document",
        doctor: doc.doctor || refined.doctor || "Dr. Medical Specialist",
        doctorDegree: doc.doctorDegree || refined.doctorDegree || "M.D. Physician",
        hospital: doc.hospital || refined.hospital || "General Hospital",
        hospitalAddress: doc.hospitalAddress || refined.hospitalAddress || "",
        patient: doc.patient || refined.patient || "User Patient",
        patientAge: doc.patientAge || refined.patientAge || "30",
        patientGender: doc.patientGender || refined.patientGender || "Adult",
        diagnosis: doc.diagnosis || refined.diagnosis || "Medical Diagnosis",
        date: doc.date || new Date().toLocaleDateString("en-GB"),
        followUp: doc.followUpDate || refined.followUpDate || "Follow up after 5 days",
        vitals,
        medicines,
        labTests,
        advice,
        healthScore: 94,
        rawText: doc.ocrText || "",
        isSample: false
      };
    });

    // Sample documents
    const sampleDocs = SAMPLE_PRESCRIPTIONS.map(parseSampleToDoc);

    // Merge: uploaded user docs first, then sample clinical documents
    return [...formattedUserDocs, ...sampleDocs];
  } catch (err) {
    console.error("Error loading documents for dashboard:", err);
    return SAMPLE_PRESCRIPTIONS.map(parseSampleToDoc);
  }
}

/**
 * Returns the currently selected document for the dashboard
 */
export function getActiveDocument(requestedId = null) {
  const allDocs = getAllDocuments();
  if (!allDocs || allDocs.length === 0) return null;

  const targetId = requestedId || localStorage.getItem(ACTIVE_DOC_KEY);
  if (targetId) {
    const found = allDocs.find(d => String(d.id) === String(targetId));
    if (found) return found;
  }

  // Default to the first document (most recent uploaded or first sample)
  return allDocs[0];
}

/**
 * Sets the active document ID in localStorage
 */
export function setActiveDocumentId(id) {
  try {
    localStorage.setItem(ACTIVE_DOC_KEY, id);
    // Dispatch custom event so Dashboard updates in real-time
    window.dispatchEvent(new CustomEvent("healthbuddy:document-changed", { detail: { id } }));
  } catch (_) {}
}

/**
 * Updates medication taken state for a document
 */
export function toggleDocumentMedication(medId, taken) {
  try {
    const stored = localStorage.getItem(MED_TRACKER_KEY);
    const tracker = stored ? JSON.parse(stored) : {};
    tracker[medId] = taken;
    localStorage.setItem(MED_TRACKER_KEY, JSON.stringify(tracker));
    window.dispatchEvent(new CustomEvent("healthbuddy:medication-toggled", { detail: { medId, taken } }));
  } catch (_) {}
}

/**
 * Gets saved medication taken states
 */
export function getMedicationTrackerState() {
  try {
    const stored = localStorage.getItem(MED_TRACKER_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (_) {
    return {};
  }
}
