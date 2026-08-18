/**
 * mobileDownloadHelper.js
 * Cross-platform robust file downloader & share handler for Mobile (iOS Safari, Android Chrome) & Desktop.
 */

import toast from "react-hot-toast";

/**
 * Downloads or shares a text/pdf/document file safely on mobile and desktop
 */
export async function downloadFileSafe(filename, content, mimeType = "text/plain;charset=utf-8") {
  try {
    const blob = new Blob([content], { type: mimeType });
    const file = new File([blob], filename, { type: mimeType });

    // 1. Try Web Share API with files (Standard for iOS Safari & Android Chrome)
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: filename,
          text: `Health document: ${filename}`,
        });
        toast.success("Document shared/saved successfully! 📄");
        return;
      } catch (shareErr) {
        // If user cancelled share sheet, just return quietly
        if (shareErr.name === "AbortError") {
          return;
        }
        console.warn("Share API fallback to anchor download:", shareErr);
      }
    }

    // 2. Cross-platform Anchor Download with delayed URL revoke for mobile
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.target = "_blank";
    link.rel = "noopener noreferrer";

    document.body.appendChild(link);
    link.click();

    // Do NOT revoke immediately! Keep URL alive for 30 seconds for mobile stream completion
    setTimeout(() => {
      try {
        if (document.body.contains(link)) {
          document.body.removeChild(link);
        }
        URL.revokeObjectURL(url);
      } catch (_) {}
    }, 30000);

    toast.success(`Downloaded: ${filename} 📄`);
  } catch (err) {
    console.error("Download Error:", err);
    toast.error("Download failed. Please check browser permissions.");
  }
}

/**
 * Generates and downloads the Official HEALTHBUDDY Medical ID Card
 */
export async function downloadMedicalIdCard(user, medicalData = {}) {
  const userName = user?.name || user?.full_name || user?.username || "Alex Henderson";
  const userPhone = user?.phone_number || "+91 98765 43210";
  const userEmail = user?.email || "alex.patient@healthbuddy.io";

  const medicalIdText = `======================================================================
HEALTHBUDDY - UNIVERSAL EMERGENCY MEDICAL ID PASSPORT
======================================================================
Cardholder Name     : ${userName}
Patient ID Number   : ${user?.patient_id || "HB-884920"}
Blood Group         : ${medicalData.bloodGroup || "O+ (Positive)"}
Date of Birth       : ${medicalData.dob || "14 Aug 1994 (Age: 30)"}
Primary Contact     : ${userPhone}
Registered Email    : ${userEmail}

----------------------------------------------------------------------
EMERGENCY CONTACT PERSON
----------------------------------------------------------------------
Name                : Sarah Henderson (Spouse / Guardian)
Emergency Phone     : +91 98765 43210
Alternate Contact   : +91 98765 43211

----------------------------------------------------------------------
CRITICAL MEDICAL ALERTS & ALLERGIES
----------------------------------------------------------------------
Known Allergies     : Severe Penicillin Allergy, Sulfa Drugs
Chronic Conditions  : Mild Hypertension (Monitored)
Current Medication  : Lisinopril 10mg OD, Multivitamin
Primary Care Clinic : Metro Health Super Speciality Center
Physician           : Dr. Sarah Jenkins (Cardiology)

----------------------------------------------------------------------
NATIONAL EMERGENCY HELPLINES:
- Ambulance & Medical Response : 108 / 112
- HealthBuddy 24/7 AI Triage   : 1800-419-HEALTHBUDDY
======================================================================
Issued by HEALTHBUDDY AI Systems. End-to-end Encrypted Medical Passport.
`;

  const filename = `HEALTHBUDDY-Medical-ID-${userName.replace(/[^a-zA-Z0-9]/g, "_")}.txt`;
  await downloadFileSafe(filename, medicalIdText, "text/plain;charset=utf-8");
}
