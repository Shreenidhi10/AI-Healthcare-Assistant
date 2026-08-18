from __future__ import annotations

import re
import threading
import time
from dataclasses import asdict, dataclass
from typing import Any, Dict, List, Optional, Set, Tuple

from app.config import settings
from app.schemas import Medicine
from app.utils.exceptions import NLPEngineError
from app.utils.logger import get_logger

logger = get_logger(__name__)

try:
    from transformers import AutoModelForTokenClassification, AutoTokenizer, pipeline
    TRANSFORMERS_AVAILABLE = True
except ImportError:  # pragma: no cover
    TRANSFORMERS_AVAILABLE = False
    logger.warning("transformers not installed; NLPService will run in regex-only mode.")

def _gpu_device_index() -> int:
    if settings.NLP_DEVICE_OVERRIDE:
        try:
            return int(settings.NLP_DEVICE_OVERRIDE)
        except ValueError:
            return -1
    try:
        import torch
        if torch.cuda.is_available():
            return 0
    except Exception:
        pass
    return -1

@dataclass
class _MedicineDraft:
    name: str
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    frequency_human: Optional[str] = None
    duration: Optional[str] = None
    form: Optional[str] = None
    route: Optional[str] = None

    def to_medicine(self) -> Medicine:
        return Medicine(**asdict(self))

_DISEASE_KEYWORDS: Set[str] = {
    "type 2 diabetes mellitus", "type 1 diabetes mellitus", "diabetes mellitus", "diabetes", 
    "hypertension", "asthma", "copd", "pneumonia", "cancer",
    "tumor", "tumour", "carcinoma", "lymphoma", "leukemia", "leukaemia",
    "hepatitis", "cirrhosis", "uti", "infection", "malaria",
    "dengue", "typhoid", "tuberculosis", "tb", "hiv", "aids", "covid",
    "influenza", "flu", "anemia", "anaemia", "hypothyroidism",
    "hyperthyroidism", "arthritis", "osteoporosis", "osteoarthritis",
    "parkinson", "alzheimer", "epilepsy", "seizure", "stroke",
    "myocardial infarction", "heart attack", "heart failure", "angina",
    "atherosclerosis", "hyperlipidemia", "hypercholesterolemia",
    "depression", "anxiety", "schizophrenia", "bipolar", "psoriasis",
    "eczema", "dermatitis", "gastritis", "ulcer", "gerd", "colitis",
    "ibs", "crohn", "appendicitis", "pancreatitis", "cholecystitis",
    "gallstone", "kidney stone", "renal failure", "ckd", "nephrotic",
    "glaucoma", "cataract", "retinopathy", "conjunctivitis", "sinusitis",
    "rhinitis", "bronchitis", "pleuritis", "meningitis", "encephalitis",
    "sepsis", "fracture", "sprain", "dislocation", "hernia",
}

_SYMPTOM_KEYWORDS: Set[str] = {
    "fever", "ache", "headache", "migraine", "dizziness", "nausea",
    "vomiting", "diarrhea", "diarrhoea", "constipation", "bloating",
    "fatigue", "weakness", "malaise", "chills", "sweating",
    "shortness of breath", "dyspnea", "cough", "mild cough", "sputum", "wheezing",
    "chest pain", "palpitation", "tachycardia", "bradycardia",
    "swelling", "edema", "oedema", "rash", "itching", "pruritus",
    "burning", "tingling", "numbness", "insomnia", "sleep disturbance",
    "loss of appetite", "anorexia", "weight loss", "weight gain",
    "frequent urination", "dysuria", "hematuria", "polyuria", "oliguria",
    "increased thirst", "jaundice", "sore throat", "runny nose", "nasal congestion",
    "sneezing", "tremor", "confusion", "memory loss", "syncope",
    "fainting", "back pain", "joint pain", "muscle pain", "myalgia",
    "arthralgia", "stiffness",
}

_COMMON_MEDICINES: Set[str] = {
    "paracetamol", "acetaminophen", "ibuprofen", "aspirin", "amoxicillin",
    "azithromycin", "ciprofloxacin", "metformin", "atorvastatin",
    "simvastatin", "lisinopril", "amlodipine", "metoprolol", "atenolol",
    "omeprazole", "pantoprazole", "ranitidine", "cetirizine",
    "loratadine", "montelukast", "salbutamol", "albuterol", "prednisolone",
    "dexamethasone", "hydrocortisone", "insulin", "insulin glargine", "glibenclamide",
    "glipizide", "warfarin", "heparin", "enoxaparin", "clopidogrel",
    "furosemide", "spironolactone", "hydrochlorothiazide", "losartan",
    "valsartan", "ramipril", "enalapril", "digoxin", "amiodarone",
    "morphine", "codeine", "tramadol", "diclofenac", "naproxen",
    "indomethacin", "colchicine", "allopurinol", "methotrexate",
    "hydroxychloroquine", "doxycycline", "tetracycline", "clindamycin",
    "erythromycin", "vancomycin", "gentamicin", "ampicillin", "cefixime",
    "cephalexin", "ceftriaxone", "meropenem", "cotrimoxazole",
    "fluconazole", "itraconazole", "acyclovir", "valacyclovir",
    "oseltamivir", "chloroquine", "ivermectin", "albendazole",
    "mebendazole", "levothyroxine", "carbimazole", "propylthiouracil",
    "risperidone", "olanzapine", "quetiapine", "haloperidol",
    "sertraline", "fluoxetine", "escitalopram", "amitriptyline",
    "diazepam", "alprazolam", "lorazepam", "clonazepam", "phenytoin",
    "carbamazepine", "valproate", "levetiracetam", "gabapentin",
    "pregabalin", "donepezil", "memantine", "augmentin", "dolo",
    "crocin", "zerodol", "pantocid", "telmisartan",
}

_FREQUENCY_HUMAN_MAP: Dict[str, str] = {
    "OD": "Once Daily", "BD": "Twice Daily", "TDS": "Three Times Daily",
    "QID": "Four Times Daily", "TID": "Three Times Daily",
    "BID": "Twice Daily", "HS": "At Bedtime", "SOS": "As Needed",
    "PRN": "As Needed", "STAT": "Immediately",
    "1-0-0": "Once Daily", "0-1-0": "Once Daily", "1-0-1": "Twice Daily",
    "1-1-1": "Three Times Daily", "1-1-1-1": "Four Times Daily",
    "0-0-1": "At Bedtime", "PC": "After Food", "AC": "Before Food"
}

_FREQUENCY_NATURAL_MAP = {
    "once daily": "OD", "every morning": "OD", "every evening": "OD", "every night": "HS",
    "twice daily": "BD", "three times daily": "TDS", "four times daily": "QID",
    "at bedtime": "HS", "before breakfast": "OD", "after food": "PC", "before food": "AC",
    "as needed": "PRN"
}

_ROUTE_MAP = {
    "by mouth": "Oral", "oral": "Oral", "orally": "Oral",
    "subcutaneous": "Subcutaneous", "inject": "Subcutaneous", "injection": "Subcutaneous",
    "iv": "Intravenous", "intravenous": "Intravenous",
    "im": "Intramuscular", "intramuscular": "Intramuscular",
    "topical": "Topical", "apply locally": "Topical",
    "inhalation": "Inhalation", "inhale": "Inhalation", "inhaler": "Inhalation",
    "nasal": "Nasal", "eye drops": "Eye Drops", "ear drops": "Ear Drops"
}

_DOSAGE_PATTERN = re.compile(r"\b\d+(?:\.\d+)?\s?(?:mg|mcg|g|ml|IU|units?)\b", re.IGNORECASE)

_DURATION_PATTERN = re.compile(
    r"\b(?:for\s+|continue\s+for\s+)?(\d+\s*(?:days?|weeks?|months?|years?)|(?:one|two|three|four)\s+(?:days?|weeks?|months?))\b"
    r"|\b\d+[-]\d+\s*(?:days?|weeks?|months?)\b",
    re.IGNORECASE,
)

_LAB_TEST_PATTERN = re.compile(
    r"\b(?:HbA1c|hemoglobin|haemoglobin|Hb|RBC|WBC|CBC|platelet|"
    r"glucose|blood\s+sugar|fasting\s+sugar|pp\s+sugar|creatinine|urea|"
    r"BUN|sodium|potassium|chloride|bicarbonate|calcium|magnesium|"
    r"phosphate|albumin|bilirubin|ALT|AST|SGPT|SGOT|ALP|GGT|LDH|TSH|"
    r"T3|T4|PSA|CEA|CA-?125|cholesterol|triglycerides|HDL|LDL|VLDL|"
    r"INR|PT|aPTT|ESR|CRP|procalcitonin|ferritin|iron|transferrin|"
    r"vitamin\s+D|vitamin\s+B12|folate|uric\s+acid|eGFR|GFR|"
    r"lipid\s+profile|liver\s+function\s+test|LFT|KFT|"
    r"urine\s+culture|blood\s+culture|x-?ray|MRI|CT\s+scan|ultrasound|"
    r"ECG|EKG|echocardiogram|biopsy|blood\s+pressure)\b",
    re.IGNORECASE,
)

_DATE_PATTERN = re.compile(
    r"\b(?:"
    r"\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}"
    r"|\d{4}[/\-.]\d{1,2}[/\-.]\d{1,2}"
    r"|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)"
    r"[a-z]*\.?\s+\d{1,2},?\s+\d{4}"
    r"|\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)"
    r"[a-z]*\.?\s+\d{4}"
    r")\b",
    re.IGNORECASE,
)

_AGE_PATTERN = re.compile(
    r"\bAge\s*[:\-]?\s*(\d{1,3})\b|\b(\d{1,3})\s*(?:yrs?|years?)\s*(?:old)?\b",
    re.IGNORECASE,
)

_AGE_GENDER_COMBINED_PATTERN = re.compile(
    r"\bAge\s*/\s*Sex\s*[:\-]?\s*(\d{1,3})\s*/\s*([MFmf](?:ale)?)\b",
    re.IGNORECASE,
)

_GENDER_PATTERN = re.compile(
    r"\b(?:Sex|Gender)\s*[:\-]?\s*(Male|Female|M|F)\b", re.IGNORECASE
)

_PATIENT_NAME_PATTERN = re.compile(
    r"\b(?:Patient\s*Name|Patient|Name\s*of\s*Patient|Pt\.?\s*Name)\s*[:\-]\s*"
    r"([A-Z][A-Za-z.'\- ]{1,60}?)(?=\s{2,}|\n|,|$|\bAge\b|\bSex\b|\bGender\b)",
    re.IGNORECASE,
)

_DOCTOR_NAME_PATTERN = re.compile(
    r"\b(?:Dr\.?|Doctor|Physician|Consultant|Prescribed\s+by|Treating\s+Doctor)\s*[:\-]?\s*"
    r"([A-Z][A-Za-z.'\- ]{1,60}?)(?=\s{2,}|\n|,|$|\bMBBS\b|\bMD\b)",
)

_HOSPITAL_PATTERN = re.compile(
    r"\b([A-Za-z][A-Za-z0-9&.'\- ]{2,60}\s(?:Hospital|Clinic|Medical\s+Centre|Medical\s+Center|Nursing\s+Home|Healthcare|Diagnostics|Institute))\b",
    re.IGNORECASE
)

class _BioClinicalBERTModel:
    _instance = None
    _init_lock = threading.Lock()

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            with cls._init_lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance

    def __init__(self) -> None:
        if self._initialized:
            return

        self._pipeline = None
        self.device_index = -1
        self.model_loaded = False

        if not TRANSFORMERS_AVAILABLE:
            self._initialized = True
            return

        logger.info("Loading BioClinicalBERT model: %s", settings.NLP_MODEL_NAME)
        start = time.time()
        try:
            self.device_index = _gpu_device_index()
            tokenizer = AutoTokenizer.from_pretrained(
                settings.NLP_MODEL_NAME, cache_dir=str(settings.BIOCLINICALBERT_MODEL_DIR)
            )
            model = AutoModelForTokenClassification.from_pretrained(
                settings.NLP_MODEL_NAME, cache_dir=str(settings.BIOCLINICALBERT_MODEL_DIR)
            )
            self._pipeline = pipeline(
                task="ner",
                model=model,
                tokenizer=tokenizer,
                aggregation_strategy=settings.NLP_AGGREGATION_STRATEGY,
                device=self.device_index,
            )
            self.model_loaded = True
            logger.info(
                "BioClinicalBERT loaded in %.2fs (device=%s)",
                time.time() - start,
                "GPU" if self.device_index >= 0 else "CPU",
            )
        except Exception as exc:
            logger.error("Failed to load BioClinicalBERT model: %s", exc, exc_info=True)
            self._pipeline = None
            self.model_loaded = False

        self._initialized = True

    def predict(self, text: str) -> List[Dict[str, Any]]:
        if self._pipeline is None:
            return []
        try:
            return self._pipeline(text)
        except Exception as exc:
            logger.error("BioClinicalBERT inference failed: %s", exc)
            raise NLPEngineError(f"NLP inference failed: {exc}") from exc

def get_nlp_model() -> _BioClinicalBERTModel:
    return _BioClinicalBERTModel()

class NLPService:
    _BERT_LABEL_MAP: Dict[str, str] = {
        "DISEASE": "disease", "SYMPTOM": "symptoms", "MEDICINE": "medicines",
        "DRUG": "medicines", "CHEMICAL": "medicines", "DOSAGE": "dosage",
        "FREQUENCY": "frequency", "DURATION": "duration", "LAB": "lab_tests",
        "TEST": "lab_tests",
    }

    def __init__(self) -> None:
        self._model = get_nlp_model()

    @property
    def is_model_loaded(self) -> bool:
        return self._model.model_loaded

    def extract_entities(self, text: str, ocr_confidence: Optional[float] = None) -> Dict[str, Any]:
        logger.info("[DEBUG 6/7] NLP input text: '%s'", text[:300] if text else "")
        if not text or not text.strip():
            return self._empty_entities(needs_review=True)

        truncated = text[: settings.NLP_MAX_INPUT_CHARS]

        raw_entities: List[Dict[str, Any]] = []
        if self._model.model_loaded:
            raw_entities = self._model.predict(truncated)

        buckets: Dict[str, Set[str]] = {
            "disease": set(), "symptoms": set(), "dosage": set(),
            "frequency": set(), "duration": set(), "lab_tests": set(),
            "dates": set(), "diagnosis": set(),
        }

        bert_medicines = set()
        for ent in raw_entities:
            label = ent.get("entity_group", ent.get("entity", "")).upper()
            word = ent.get("word", "").strip().replace("##", "")
            bucket = self._BERT_LABEL_MAP.get(label)
            if bucket and bucket in buckets and len(word) >= 2:
                buckets[bucket].add(self._normalize(word))
            if label in ["MEDICINE", "DRUG", "CHEMICAL"]:
                bert_medicines.add(word)

        # Split text into sections
        sections = self._parse_sections(truncated)
        
        # General extractions
        patient_name = self._extract_patient_name(truncated)
        doctor_name = self._extract_doctor_name(truncated)
        hospital = self._extract_hospital(truncated)
        age = self._extract_age(truncated)
        gender = self._extract_gender(truncated)
        self._extract_regex_bucket(truncated, _DATE_PATTERN, buckets["dates"])

        # Targeted extractions
        if "Diagnosis" in sections:
            self._extract_diagnosis(sections["Diagnosis"], buckets["diagnosis"])
            self._extract_keyword_bucket(sections["Diagnosis"], _DISEASE_KEYWORDS, buckets["disease"])
        else:
            # Fallback if no header
            self._extract_diagnosis(truncated, buckets["diagnosis"])
            self._extract_keyword_bucket(truncated, _DISEASE_KEYWORDS, buckets["disease"])

        if "Symptoms" in sections:
            self._extract_keyword_bucket(sections["Symptoms"], _SYMPTOM_KEYWORDS, buckets["symptoms"])
        else:
            # If no symptoms section, we still look but might get false positives.
            self._extract_keyword_bucket(truncated, _SYMPTOM_KEYWORDS, buckets["symptoms"])

        if "Lab" in sections:
            self._extract_lab_tests(sections["Lab"], buckets["lab_tests"])

        medicines_text = sections.get("Medicines", truncated)
        medicines_results, ocr_med_count = self._extract_medicines(medicines_text, bert_medicines)

        needs_review = bool(
            ocr_confidence is not None and ocr_confidence < settings.REVIEW_CONFIDENCE_THRESHOLD
        )
        if not self._model.model_loaded:
            needs_review = True
            
        review_reasons = []
        if len(medicines_results) < ocr_med_count:
            needs_review = True
            review_reasons.append(f"Found {ocr_med_count} numbered medicines in OCR but only extracted {len(medicines_results)}")

        return {
            "patient_name": patient_name,
            "doctor_name": doctor_name,
            "hospital_clinic": hospital,
            "age": age,
            "gender": gender,
            "disease": sorted(buckets["disease"]),
            "symptoms": sorted(buckets["symptoms"]),
            "diagnosis": sorted(buckets["diagnosis"]),
            "medicines": [m.to_medicine() for m in medicines_results],
            "lab_tests": sorted(buckets["lab_tests"]),
            "dates": sorted(buckets["dates"]),
            "needs_review": needs_review,
            "review_reasons": review_reasons
        }

    # -- helpers ------------------------------------------------------------

    @staticmethod
    def _parse_sections(text: str) -> Dict[str, str]:
        lines = text.split("\n")
        sections = {}
        current_section = "General"
        sections[current_section] = []
        
        headers = {
            "Diagnosis": r"^(?:diagnosis|impression|assessment|clinical\s+diagnosis)\s*[:\-]?",
            "Symptoms": r"^(?:chief\s+complaints|presenting\s+complaints|history\s+of\s+present\s+illness|symptoms)\s*[:\-]?",
            "Medicines": r"^(?:medicines|medications|rx|treatment)\s*[:\-]?",
            "Lab": r"^(?:laboratory\s+investigations|lab\s+tests|investigations)\s*[:\-]?",
            "Advice": r"^(?:discharge\s+instructions|advice|follow\s+up)\s*[:\-]?"
        }
        
        for line in lines:
            line_str = line.strip()
            if not line_str:
                continue
            
            matched_header = None
            for sec_name, pattern in headers.items():
                if re.match(pattern, line_str, re.IGNORECASE) or line_str.lower() == sec_name.lower():
                    matched_header = sec_name
                    break
            
            if matched_header:
                current_section = matched_header
                if current_section not in sections:
                    sections[current_section] = []
                
                # if there is text on the same line after the header, capture it
                for pattern in headers.values():
                    m = re.match(pattern + r"\s*(.+)", line_str, re.IGNORECASE)
                    if m and m.group(1).strip():
                        val = m.group(1).strip()
                        if val not in [":", "-"]:
                            sections[current_section].append(val)
                        break
            else:
                sections[current_section].append(line_str)
                
        return {k: "\n".join(v) for k, v in sections.items()}

    @staticmethod
    def _empty_entities(needs_review: bool = True) -> Dict[str, Any]:
        return {
            "patient_name": None, "doctor_name": None, "hospital_clinic": None,
            "age": None, "gender": None, "disease": [], "symptoms": [],
            "diagnosis": [], "medicines": [], "lab_tests": [], "dates": [],
            "needs_review": needs_review, "review_reasons": []
        }

    @staticmethod
    def _normalize(text: str) -> str:
        text = text.strip()
        return text[0].upper() + text[1:] if text else text

    @staticmethod
    def _extract_keyword_bucket(text: str, keywords: Set[str], bucket: Set[str]) -> None:
        lower = text.lower()
        sorted_kws = sorted(keywords, key=len, reverse=True)
        for kw in sorted_kws:
            if kw in lower:
                match = re.search(r'\b' + re.escape(kw) + r'\b', text, re.IGNORECASE)
                if match:
                    val = NLPService._normalize(match.group())
                    if not any(val.lower() in existing.lower() for existing in bucket):
                        bucket.add(val)

    @staticmethod
    def _extract_regex_bucket(
        text: str, pattern: re.Pattern, bucket: Set[str], normalize_dosage: bool = False
    ) -> None:
        for m in pattern.finditer(text):
            value = m.group().strip()
            if normalize_dosage:
                value = re.sub(r"(\d+)\s+(mg|mcg|g|ml|iu)", r"\1\2", value, flags=re.IGNORECASE).lower()
            bucket.add(value)

    @staticmethod
    def _extract_diagnosis(text: str, bucket: Set[str]) -> None:
        lines = text.split("\n")
        for line in lines:
            clean_line = re.sub(r"^\d+[\.\)\-]\s*", "", line.strip()).strip()
            if clean_line:
                bucket.add(clean_line)

    @staticmethod
    def _extract_lab_tests(text: str, bucket: Set[str]) -> None:
        for line in text.split("\n"):
            line_str = line.strip()
            if not line_str:
                continue
            if _LAB_TEST_PATTERN.search(line_str):
                bucket.add(line_str)

    @staticmethod
    def _extract_medicines(text: str, bert_medicines: Set[str] = None) -> Tuple[List[_MedicineDraft], int]:
        medicines: List[_MedicineDraft] = []
        seen_names: Set[str] = set()
        
        if bert_medicines is None:
            bert_medicines = set()
            
        combined_medicines = _COMMON_MEDICINES.union({m.lower() for m in bert_medicines})
        sorted_medicines = sorted(combined_medicines, key=len, reverse=True)

        lines = text.split("\n")
        blocks = []
        current_block = []
        ocr_med_count = 0
        
        for line in lines:
            line_str = line.strip()
            if not line_str:
                continue
                
            if re.match(r"^\d+[\.\)\-]", line_str):
                ocr_med_count += 1
                
            lower_line = line_str.lower()
            
            matched_drug = None
            for d in sorted_medicines:
                if re.search(r'\b' + re.escape(d) + r'\b', lower_line):
                    matched_drug = d
                    break
            
            if matched_drug:
                if current_block:
                    blocks.append(current_block)
                current_block = [(line_str, matched_drug)]
            elif current_block:
                current_block.append((line_str, None))
                
        if current_block:
            blocks.append(current_block)

        for block in blocks:
            full_text = " ".join([line for line, _ in block])
            primary_drug = block[0][1]
            name = primary_drug.title()
            
            if name.lower() in seen_names:
                continue
            seen_names.add(name.lower())

            dosage = None
            dosage_m = _DOSAGE_PATTERN.search(full_text)
            if dosage_m:
                dosage = re.sub(r"(\d+)\s+(mg|mcg|g|ml|iu)", r"\1\2", dosage_m.group(), flags=re.IGNORECASE)

            frequency = None
            frequency_human = None
            
            freq_m = re.search(r"\b(\d-\d-\d(-\d)?|OD|BD|TDS|QDS|QID|TID|BID|SID|SOS|PRN|STAT)\b", full_text, re.IGNORECASE)
            if freq_m:
                frequency = freq_m.group(1).strip().upper()
                frequency_human = _FREQUENCY_HUMAN_MAP.get(frequency)
            else:
                sorted_nat = sorted(_FREQUENCY_NATURAL_MAP.keys(), key=len, reverse=True)
                for nat in sorted_nat:
                    if re.search(r"\b" + re.escape(nat) + r"\b", full_text, re.IGNORECASE):
                        frequency = _FREQUENCY_NATURAL_MAP[nat]
                        frequency_human = _FREQUENCY_HUMAN_MAP.get(frequency)
                        break

            duration = None
            dur_m = _DURATION_PATTERN.search(full_text)
            if dur_m:
                duration_val = dur_m.group(1) if dur_m.group(1) else dur_m.group()
                duration = duration_val.strip()

            form = None
            form_m = re.search(r"\b(Tablet|Tab|Capsule|Cap|Injection|Inj|Syrup|Syp|Suspension|Drops|Cream|Ointment|Gel|Patch|Inhaler|Spray|Powder)\b\.?", full_text, re.IGNORECASE)
            if form_m:
                val = form_m.group(1).title()
                if val == "Tab": val = "Tablet"
                if val == "Cap": val = "Capsule"
                if val == "Inj": val = "Injection"
                if val == "Syp": val = "Syrup"
                form = val

            route = None
            sorted_route = sorted(_ROUTE_MAP.keys(), key=len, reverse=True)
            for r in sorted_route:
                if re.search(r"\b" + re.escape(r) + r"\b", full_text, re.IGNORECASE):
                    route = _ROUTE_MAP[r]
                    break

            medicines.append(
                _MedicineDraft(
                    name=name,
                    dosage=dosage,
                    frequency=frequency,
                    frequency_human=frequency_human,
                    duration=duration,
                    form=form,
                    route=route
                )
            )

        return medicines, ocr_med_count

    @staticmethod
    def _extract_patient_name(text: str) -> Optional[str]:
        match = _PATIENT_NAME_PATTERN.search(text)
        return match.group(1).strip() if match else None

    @staticmethod
    def _extract_doctor_name(text: str) -> Optional[str]:
        match = _DOCTOR_NAME_PATTERN.search(text)
        if match:
            name = match.group(1).strip()
            return name if name else None
        return None

    @staticmethod
    def _extract_hospital(text: str) -> Optional[str]:
        lines = text.split('\n')
        
        for line in lines:
            m = re.match(r"^(?:Hospital|Clinic|Center|Facility)\s*[:\-]\s*(.+)", line.strip(), re.IGNORECASE)
            if m:
                val = m.group(1).strip()
                val = re.split(r",|\s{2,}", val)[0]
                return val.title()

        suffix_pattern = re.compile(r"\b(Hospital|Medical Centre|Medical Center|Clinic|Institute)\b", re.IGNORECASE)
        for line in lines:
            line_clean = line.strip()
            if suffix_pattern.search(line_clean):
                if 5 <= len(line_clean) <= 100:
                    return line_clean.title()
                
        return None

    @staticmethod
    def _extract_age(text: str) -> Optional[str]:
        combined = _AGE_GENDER_COMBINED_PATTERN.search(text)
        if combined:
            return combined.group(1)
        match = _AGE_PATTERN.search(text)
        if match:
            return match.group(1) or match.group(2)
        return None

    @staticmethod
    def _extract_gender(text: str) -> Optional[str]:
        combined = _AGE_GENDER_COMBINED_PATTERN.search(text)
        if combined:
            token = combined.group(2).upper()
            return "Male" if token.startswith("M") else "Female"
        match = _GENDER_PATTERN.search(text)
        if match:
            token = match.group(1).upper()
            if token in ("M", "MALE"):
                return "Male"
            if token in ("F", "FEMALE"):
                return "Female"
        return None

def get_nlp_service() -> NLPService:
    return NLPService()
