// comprehensive_medicine_detector.cjs
const testCases = [
  // 1. User's Workplace Prescription lines (with pipes and noise)
  "| Rx: morphine 130 mg/24 hours oral capsule, extended release Start Date: 04/13/2015 |",
  "SIG: 130 mg = 1 cap Oral Daily |",
  "~ Dispense/Supply: **30** (thirty) cap |",
  "Refill: Hk (hk |",
  "| Rx: codeine sulfate oral 60 mg tablet Start Date: 04/13/2015 |",
  "SIG: 60 mg = 1 tab Oral Q4H PRN for pain |",
  "| Rx: Norco oral 325-5 mg tablet Start Date: 04/13/2015 |",
  "SIG: 2 tab Oral Q4H PRN for pain |",
  
  // 2. Unprefixed US / International Rx lines
  "Amoxicillin 500mg oral capsule Take 1 cap PO TID x 10 days",
  "Lisinopril 10 mg tablet 1 tab daily in the morning",
  "Albuterol HFA 90 mcg Inhaler 2 puffs Q4H PRN shortness of breath",
  "Levothyroxine 50 mcg oral tablet 1 tablet daily on empty stomach",
  "Lipitor 20mg tablet 1 OD at bedtime",
  "Metformin 500 mg 1 tab twice daily with meals",
  "Omeprazole 40mg Delayed Release Capsule 1 cap daily before breakfast",
  "Prednisone 10mg tablet 2 tabs daily for 5 days",
  "Ciprofloxacin 500mg 1 tab BID x 7 days",
  "Hydrochlorothiazide 25mg 1 tab OD",
  "Gabapentin 300mg 1 capsule at night",
  "Amlodipine 5mg tablet 1 daily",
  "Ibuprofen 400mg 1 tab Q6H PRN for pain",
  "Azithromycin 250mg 2 tabs day 1 then 1 tab daily x 4 days",
  
  // 3. Indian OPD style lines
  "1. Tab. Dolo 650mg 1-0-1 x 3 days (after food)",
  "2. Cap. Pan D 40mg 1-0-0 empty stomach x 5 days",
  "3. Syr. Ascoril LS 5ml TDS x 5 days",
  "4. Tab. Augmentin 625 1 BD x 5 days",
  "5. Inj. Dynapar 75mg IM STAT",
  "6. Tab. Telma 40 0-0-1 at bedtime",
  "7. Budecort 0.5mg respule 1 respule twice daily with saline",
  "8. Nasoclear nasal drops 2 drops in each nostril TDS"
];

console.log("Testing universal medicine detector against diverse clinical formats...");
