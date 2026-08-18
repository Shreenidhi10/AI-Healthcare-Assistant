/**
 * samplePrescriptions.js - Realistic Sample Medical Records for 1-Click OCR Testing.
 * Includes both visual canvas generators and rich OCR clinical texts.
 */

export const SAMPLE_PRESCRIPTIONS = [
  {
    id: "sample-workplace",
    title: "Workplace Medical Center (Pharmacy Rx)",
    badge: "Pharmacy Rx",
    doctor: "Doc Test (Prescribing Physician)",
    hospital: "Workplace Medical Center, Smithville, CA",
    patient: "TEST, TEST (Age: 67, Female)",
    diagnosis: "Pain Management & Analgesic Therapy",
    date: "04/13/2015",
    text: `Workplace Medical Center
100 Main Street
Smithville, CA 90291
(212) 555-4444
visit: www.paris-software.com/samples/workplaceprescriptions

THIS IS A PRESCRIPTION -- PLEASE TAKE TO YOUR PHARMACY.
Patient Name: TEST, TEST
Birthdate: 05/05/1947    Age: 67 Years    Sex: FEMALE    MRN: GSa-000555555
Allergies: NKA

Pharmacist please note--Allergy list may be incomplete.
Patient Address: UNK    Home Phone: (555)777-7777
BLOOMINGDALE, IL 55555    Work Phone:

Prescription Details:    Date Issued: 04/13/2015
Rx: morphine 130 mg/24 hours oral capsule, extended release    Start Date: 04/13/2015
SIG: 130 mg = 1 cap Oral Daily
Dispense/Supply: **30** (thirty) cap
Refill: **0**

Rx: OXYcodone oral 10 mg tablet    Start Date: 04/13/2015
SIG: 10 mg = 1 tab Oral Q6H PRN for pain
Dispense/Supply: **120** (one hundred and twenty) tab
Refill: **0**

Rx: codeine sulfate oral 60 mg tablet    Start Date: 04/13/2015
SIG: 60 mg = 1 tab Oral Q4H PRN for pain
Dispense/Supply: **180** (one hundred and eighty) tab
Refill: **0**

Rx: Norco oral 325-5 mg tablet    Start Date: 04/13/2015
SIG: 2 tab Oral Q4H PRN for pain
Dispense/Supply: **360** (three hundred and sixty) tab
Refill: **0**

DISPENSE AS WRITTEN    X    SUBSTITUTION PERMITTED
Prescribed by: Doc Test    DEA #: 1111111    NPI #: 2222222
Entered by: RN1 RN`
  },
  {
    id: "sample-1",
    title: "OPD Prescription (Viral Fever & RTI)",
    badge: "Handwritten Rx",
    doctor: "Dr. S. K. Sharma (M.B.B.S., M.D. Gen Med)",
    hospital: "City Care Super Speciality Hospital, Raipur",
    patient: "Mr. Sachin Sansare, 28/M",
    diagnosis: "Acute Upper Respiratory Tract Infection with Viral Fever",
    date: "12/10/2024",
    text: `CITY CARE SUPER SPECIALITY HOSPITAL
Opp. Central Park, Civil Lines, Raipur (C.G.)
Ph: 0771-4289000 | Reg No: CG/MC/2018/4921

Dr. S. K. Sharma, M.B.B.S., M.D. (Medicine)
Senior Consultant Physician | Reg. No: MCI-58291

Date: 12/10/2024
Patient Name: Mr. Sachin Sansare
Age/Sex: 28 Yrs / Male | Wt: 68 kg | Temp: 101.4 F
BP: 120/80 mmHg | Pulse: 84 bpm | SpO2: 98%

Provisional Diagnosis: Acute URTI with Viral Fever & Bodyache

Rx (Medicines Prescribed):
1. Tab. Augmentin 625mg (Amoxyclav) - 1 Tab BD x 5 Days (After Meals)
2. Tab. Dolo 650mg (Paracetamol) - 1 Tab TDS x 3 Days (After Food for Fever)
3. Tab. Pan D 40mg (Pantoprazole + Domperidone) - 1 Tab OD x 5 Days (Before Meals / Empty Stomach)
4. Tab. Erazflam 100mg - 1 Tab BD x 5 Days (After Meals for Body Pain)
5. Adv: Hexigel Gum Paint - Apply 1-0-1 on gums x 1 Week after brushing
6. Tab. Limcee 500mg (Vitamin C) - 1 Tab OD x 10 Days (Chewable)

Advice & Diet:
• Drink 3 to 4 liters of warm water daily
• Steam inhalation twice daily with tulsi or saline
• Avoid cold beverages, fried and spicy food
• Complete bed rest for 3 days. Review after 5 days if fever persists.`
  },
  {
    id: "sample-2",
    title: "Medical Fitness Certificate",
    badge: "Official Certificate",
    doctor: "Dr. Sushil Jethani (M.B.B.S., R.C.G.P.)",
    hospital: "P.D. JETHANI MEMORIAL HOSPITAL",
    patient: "Mr. Arpan Singh, 26/M",
    diagnosis: "Recovered from Acute Viral Gastroenteritis & Dehydration",
    date: "10/03/2026",
    text: `P.D. JETHANI MEMORIAL HOSPITAL & RESEARCH CENTRE
Khamtarai, Bilaspur Road, Raipur (C.G.) - 492008
Contact: 0771-2441920 | Email: pdjethani.hospital@gmail.com

FIT / UNFIT MEDICAL CERTIFICATE
Issued under Medical Council of India Guidelines

Date of Examination: 10/03/2026
Certificate No: JETH/MC/2026/0891

This is to certify that:
Patient Name : Mr. Arpan Singh
Age / Gender : 26 Years / Male
Employee ID  : EMP-88492 (Infosys Technologies)

Was under my treatment for: Acute Viral Gastroenteritis with High Fever & Weakness
Period of Medical Leave: From 05/03/2026 to 09/03/2026 (Total 5 Days Bed Rest)

Clinical Assessment:
The patient was examined clinically on 10/03/2026.
Temperature: 98.4 F (Afebrile) | BP: 118/76 mmHg | Pulse: 74 bpm
He has completely recovered from his illness, has normal vitals, and is free from any contagious infection.

Recommendation:
I hereby certify that Mr. Arpan Singh is FIT FOR DUTY to resume his active official duties from 10/03/2026.

Dr. Sushil Jethani
M.B.B.S., R.C.G.P. (Family Medicine)
Reg. No: CG-7749/MCI
Medical Superintendent, P.D. Jethani Memorial Hospital`
  },
  {
    id: "sample-3",
    title: "Chronic Care Prescription (Diabetes & BP)",
    badge: "Cardio-Metabolic Rx",
    doctor: "Dr. Ananya Roy (M.D., D.N.B. Cardiology)",
    hospital: "Apex Heart & Diabetes Institute, Hyderabad",
    patient: "Mrs. Sunita Reddy, 52/F",
    diagnosis: "Type 2 Diabetes Mellitus with Essential Hypertension & Dyslipidemia",
    date: "04/08/2026",
    text: `APEX HEART & DIABETES INSTITUTE
Banjara Hills Road No. 12, Hyderabad - 500034
OPD Consultation Slip | UHID: APEX-2026-99381

Consultant: Dr. Ananya Roy, M.D., D.N.B. (Cardiology & Diabetology)
Reg No: TSMC-44109 | Date: 04/08/2026

Patient Name: Mrs. Sunita Reddy
Age: 52 Yrs | Sex: Female | Weight: 74 kg | BMI: 27.2
BP: 138/88 mmHg | Pulse: 76 bpm | SpO2: 99%
RBS: 164 mg/dL | HbA1c: 7.4% | Serum Creatinine: 0.9 mg/dL

Diagnosis: Type 2 Diabetes Mellitus + Essential Hypertension + Dyslipidemia

Prescribed Medications (Long Term Rx):
1. Tab. Glycomet GP 1 (Metformin 500mg + Glimepiride 1mg) - 1 Tab OD (1-0-0) Before Breakfast
2. Tab. Telma 40mg (Telmisartan) - 1 Tab OD (0-0-1) At Bedtime for BP Control
3. Tab. Atorva 10mg (Atorvastatin) - 1 Tab OD (0-0-1) At Night after Dinner
4. Tab. Ecospirin 75mg (Aspirin) - 1 Tab OD (0-1-0) After Lunch
5. Tab. Shelcal 500mg (Calcium + Vitamin D3) - 1 Tab OD (0-1-0) After Lunch x 30 Days

Investigations Advised:
• Fasting & Post Prandial Blood Sugar (FBS/PPBS) every 15 days
• Lipid Profile & Serum Creatinine repeat after 3 months
• Urine Microalbumin test

Doctor's Dietary Advice:
• Low salt diet (< 3 grams/day) & strict sugar restriction
• 45 minutes brisk walking daily 5 days a week
• Monitor home BP twice a week. Review with sugar log after 1 month.`
  },
  {
    id: "sample-4",
    title: "Pediatric Consultation & Vaccination",
    badge: "Pediatric Slip",
    doctor: "Dr. Ramesh Patel (M.B.B.S., D.C.H., D.N.B. Pediatrics)",
    hospital: "Lotus Children's Hospital & Neonatal Care",
    patient: "Master Aarav Gupta, 4/M",
    diagnosis: "Acute Bronchiolitis with Allergic Rhinitis",
    date: "18/07/2026",
    text: `LOTUS CHILDREN'S HOSPITAL & NEONATAL CLINIC
Near Navrangpura Circle, Ahmedabad - 380009
Contact: 079-26448900 | Emergency: 108

Dr. Ramesh Patel, M.B.B.S., D.C.H., D.N.B. (Pediatrics)
Senior Pediatrician & Child Health Specialist | Reg: G-33921

Date: 18/07/2026 | OPD Slip No: P-8419
Patient Name: Master Aarav Gupta
Age: 4 Years | Sex: Male | Weight: 16.2 kg | Temp: 100.2 F
SpO2: 97% | Chest: Bilateral Wheeze (+)

Clinical Assessment: Acute Bronchiolitis with Allergic Cough

Rx (Pediatric Dosing by Weight):
1. Syr. Meftal-P (Mefenamic Acid 100mg/5ml) - 5ml SOS for fever > 100°F (Max 3 times/day after food)
2. Syr. Ascoril-LS (Levosalbutamol + Ambroxol) - 2.5ml TDS (1-1-1) x 5 Days
3. Syr. Montair-LC Kid (Montelukast 4mg + Levocetirizine 2.5mg) - 5ml OD (0-0-1) At Bedtime x 10 Days
4. Nasoclear Saline Nasal Drops - 2 drops in each nostril before feeds and at bedtime
5. Budecort 0.5mg Respule Nebulization - 1 Respule with 2ml Saline twice daily for 3 days

Diet & Parental Advice:
• Frequent warm sips of water, soup and tender coconut water
• Avoid cold milk, banana, ice cream, dust and smoke exposure
• Immediate emergency review if breathing difficulty, fast breathing (>40/min), or poor oral intake.`
  }
];

/**
 * Draws a clean synthetic prescription canvas for quick preview testing
 */
export function generateSampleCanvas(sample) {
  const canvas = document.createElement("canvas");
  canvas.width = 900;
  canvas.height = 1200;
  const ctx = canvas.getContext("2d");

  // Premium white paper background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Hospital Banner / Header
  ctx.fillStyle = "#0f766e";
  ctx.fillRect(40, 40, 820, 110);

  // Hospital Name & Address
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 24px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(sample.hospital.toUpperCase(), 450, 82);

  ctx.font = "14px sans-serif";
  ctx.fillStyle = "#ccfbf1";
  ctx.fillText("Modern Clinical Care • Multi-Specialty Consultation & Diagnostics", 450, 112);
  ctx.fillText("Accredited Medical Center • Verified Medical Document", 450, 134);

  // Doctor Info Strip
  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(40, 160, 820, 80);
  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(40, 160, 820, 80);

  ctx.textAlign = "left";
  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 18px sans-serif";
  ctx.fillText(sample.doctor, 60, 195);

  ctx.font = "13px sans-serif";
  ctx.fillStyle = "#475569";
  ctx.fillText("Clinical Specialist & Attending Physician", 60, 222);

  ctx.textAlign = "right";
  ctx.fillStyle = "#0f766e";
  ctx.font = "bold 14px sans-serif";
  ctx.fillText(`Date: ${sample.date}`, 830, 195);
  ctx.fillStyle = "#64748b";
  ctx.fillText(`Doc ID: #${sample.id.toUpperCase()}`, 830, 222);

  // Patient Info Box
  ctx.fillStyle = "#f1f5f9";
  ctx.fillRect(40, 255, 820, 60);
  ctx.strokeRect(40, 255, 820, 60);

  ctx.textAlign = "left";
  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 15px sans-serif";
  ctx.fillText(`Patient: ${sample.patient}`, 60, 290);

  ctx.textAlign = "right";
  ctx.font = "14px sans-serif";
  ctx.fillStyle = "#334155";
  ctx.fillText(`Diagnosis: ${(sample.diagnosis || "").slice(0, 45)}...`, 830, 290);

  // Rx Symbol
  ctx.textAlign = "left";
  ctx.fillStyle = "#0f766e";
  ctx.font = "bold italic 36px serif";
  ctx.fillText("℞", 60, 365);

  // Body Lines
  ctx.fillStyle = "#1e293b";
  ctx.font = "13px monospace";
  const lines = sample.text.split("\n").slice(7);
  let y = 395;
  for (const line of lines) {
    if (y > 1100) break;
    if (line.includes("Rx") || line.includes("Advice") || line.includes("Diagnosis") || line.includes("SIG:")) {
      ctx.fillStyle = "#0f766e";
      ctx.font = "bold 14px sans-serif";
    } else {
      ctx.fillStyle = "#1e293b";
      ctx.font = "13px sans-serif";
    }
    ctx.fillText(line.slice(0, 85), 60, y);
    y += 24;
  }

  // Doctor Signature Stamp
  ctx.strokeStyle = "#0f766e";
  ctx.lineWidth = 1;
  ctx.strokeRect(620, 1070, 220, 70);
  ctx.font = "italic 16px cursive";
  ctx.fillStyle = "#0369a1";
  ctx.fillText("Authorized Physician", 645, 1105);
  ctx.font = "11px sans-serif";
  ctx.fillStyle = "#475569";
  ctx.fillText("Official Medical Signature", 645, 1128);

  return canvas;
}
