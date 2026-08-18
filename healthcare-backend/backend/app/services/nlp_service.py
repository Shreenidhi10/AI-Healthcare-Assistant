"""
app/services/nlp_service.py — NLPService

Wraps BioClinicalBERT (emilyalsentzer/Bio_ClinicalBERT) as a
thread-safe singleton token-classification pipeline, loaded once at
app startup, plus a rich regex/keyword post-processing layer that
maps raw BERT entities and pattern matches into the clinical entity
buckets required by the API contract:

    patient_name, doctor_name, hospital, disease, symptoms, medicines
    (structured), dosage, frequency, duration, lab_tests, dates, age,
    gender, diagnosis.

BioClinicalBERT's off-the-shelf NER head is trained for general
biomedical text and does not itself emit "patient name" / "hospital"
labels, so those fields are extracted with targeted regexes that mirror
common prescription/discharge-summary layouts (e.g. "Patient: John Doe",
"Dr. Smith", "ABC Hospital", "Age/Sex: 45/M"). This mirrors the
approach already used for medicines/dosage/frequency/duration in the
original NER module and extends it to the additional fields requested
by the merged API.

Public surface required by the spec:

    class NLPService:
        def extract_entities(text) -> ...
"""
from __future__ import annotations

import re
import threading
import time
from dataclasses import asdict, dataclass
from typing import Any, Dict, List, Optional, Set

from app.core.config import settings
from app.schemas.ocr import Medicine
from app.utils.exceptions import NLPEngineError
from app.core.logging_config import get_logger

logger = get_logger(__name__)

try:
    from transformers import AutoModelForTokenClassification, AutoTokenizer, pipeline

    TRANSFORMERS_AVAILABLE = True
except ImportError:  # pragma: no cover - environment without transformers
    TRANSFORMERS_AVAILABLE = False
    logger.warning("transformers not installed; NLPService will run in regex-only mode.")


def _gpu_device_index() -> int:
    """
    Resolve which device index to hand to the HF `pipeline(device=...)`
    argument. -1 means CPU. Falls back to CPU on any detection failure
    so the service never crashes solely due to GPU probing.
    """
    if settings.NLP_DEVICE_OVERRIDE:
        try:
            return int(settings.NLP_DEVICE_OVERRIDE)
        except ValueError:
            logger.warning("Invalid NLP_DEVICE_OVERRIDE=%s, using CPU.", settings.NLP_DEVICE_OVERRIDE)
            return -1
    try:
        import torch

        if torch.cuda.is_available():
            return 0
    except Exception:  # noqa: BLE001
        pass
    return -1


# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# Keyword / pattern banks
# ---------------------------------------------------------------------------

_DISEASE_KEYWORDS: Set[str] = {
    "diabetes", "hypertension", "asthma", "copd", "pneumonia", "cancer",
    "tumor", "tumour", "carcinoma", "lymphoma", "leukemia", "leukaemia",
    "hepatitis", "cirrhosis", "uti", "infection", "fever", "malaria",
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
    "pain", "ache", "headache", "migraine", "dizziness", "nausea",
    "vomiting", "diarrhea", "diarrhoea", "constipation", "bloating",
    "fatigue", "weakness", "malaise", "chills", "sweating",
    "shortness of breath", "dyspnea", "cough", "sputum", "wheezing",
    "chest pain", "palpitation", "tachycardia", "bradycardia",
    "swelling", "edema", "oedema", "rash", "itching", "pruritus",
    "burning", "tingling", "numbness", "insomnia", "sleep disturbance",
    "loss of appetite", "anorexia", "weight loss", "weight gain",
    "frequent urination", "dysuria", "hematuria", "polyuria", "oliguria",
    "jaundice", "sore throat", "runny nose", "nasal congestion",
    "sneezing", "tremor", "confusion", "memory loss", "syncope",
    "fainting", "back pain", "joint pain", "muscle pain", "myalgia",
    "arthralgia", "stiffness", "increased thirst", "mild cough",
}

_COMMON_MEDICINES: Set[str] = {
    "paracetamol", "acetaminophen", "ibuprofen", "aspirin", "amoxicillin",
    "azithromycin", "ciprofloxacin", "metformin", "atorvastatin",
    "simvastatin", "lisinopril", "amlodipine", "metoprolol", "atenolol",
    "omeprazole", "pantoprazole", "ranitidine", "cetirizine",
    "loratadine", "montelukast", "salbutamol", "albuterol", "prednisolone",
    "dexamethasone", "hydrocortisone", "insulin", "glibenclamide",
    "glipizide", "warfarin", "heparin", "enoxaparin", "clopidogrel",
    "furosemide", "spironolactone", "hydrochlorothiazide", "losartan",
    "valsartan", "telmisartan", "ramipril", "enalapril", "digoxin", "amiodarone",
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
    "crocin", "zerodol", "pantocid",
}

_FREQUENCY_HUMAN_MAP: Dict[str, str] = {
    "OD": "Once Daily", "BD": "Twice Daily", "TDS": "Three Times Daily",
    "QDS": "Four Times Daily", "QID": "Four Times Daily", "TID": "Three Times Daily",
    "BID": "Twice Daily", "HS": "At Bedtime", "SOS": "As Needed",
    "PRN": "As Needed", "STAT": "Immediately",
    "1-0-0": "Once Daily", "0-1-0": "Once Daily", "1-0-1": "Twice Daily",
    "1-1-1": "Three Times Daily", "1-1-1-1": "Four Times Daily",
    "0-0-1": "At Bedtime",
    "ONCE DAILY": "Once Daily", "TWICE DAILY": "Twice Daily",
    "THREE TIMES DAILY": "Three Times Daily", "FOUR TIMES DAILY": "Four Times Daily",
    "TWICE A DAY": "Twice Daily", "THREE TIMES A DAY": "Three Times Daily",
    "FOUR TIMES A DAY": "Four Times Daily",
    "DAILY": "Daily", "AS NEEDED": "As Needed", "IF NEEDED": "As Needed",
    "WHEN NEEDED": "As Needed", "WHEN REQUIRED": "As Needed", "ONLY IF": "As Needed",
    "BEFORE FOOD": "Before Food", "AFTER FOOD": "After Food", "WITH FOOD": "With Food",
    "BEFORE MEALS": "Before Meals", "AFTER MEALS": "After Meals", "WITH MEALS": "With Meals",
    "AT BEDTIME": "At Bedtime",
}

_FREQUENCY_PATTERN = re.compile(
    r"\b("
    r"\d-\d-\d|"
    r"OD|BD|TDS|QDS|QID|TID|BID|SID|SOS|PRN|STAT|"
    r"(?:once|twice|thrice|three times|four times)\s+(?:a|per)?\s*day|"
    r"(?:once|twice|thrice|three times|four times)\s+daily|"
    r"\d+\s+times?\s+(?:a|per)\s+day|"
    r"daily|every\s+day|alternate\s+days?|weekly|monthly|"
    r"at\s+bedtime|before\s+meals?|after\s+meals?|with\s+meals?|"
    r"before\s+food|after\s+food|with\s+food|as\s+needed|if\s+needed|"
    r"when\s+needed|when\s+required|only\s+if"
    r")\b",
    re.IGNORECASE,
)

_FORM_PATTERN = re.compile(
    r"\b(tablet|tab|capsule|cap|syrup|syp|injection|inj|cream|ointment|drops?|spray|gel|powder|inhaler|patch)\b",
    re.IGNORECASE,
)

_DIAGNOSIS_SECTION_PATTERN = re.compile(
    r"^\s*(?:diagnosis|impression|assessment|clinical\s+diagnosis)\s*[:\-]?\s*(?P<tail>.*)\s*$",
    re.IGNORECASE,
)

_SYMPTOMS_SECTION_PATTERN = re.compile(
    r"^\s*(?:symptoms?|complaints?)\s*[:\-]?\s*(?P<tail>.*)\s*$",
    re.IGNORECASE,
)

_MEDICATION_SECTION_PATTERN = re.compile(
    r"^\s*(?:medications?|medicine(?:s)?|prescription|drugs?)\s*[:\-]?\s*(?P<tail>.*)\s*$",
    re.IGNORECASE,
)

_LAB_SECTION_PATTERN = re.compile(
    r"^\s*(?:laboratory(?:\s+tests?|\s+investigations?)?|lab(?:\s+tests?|\s+investigations?)?|investigations?)\s*[:\-]?\s*(?P<tail>.*)\s*$",
    re.IGNORECASE,
)

_ALL_SECTION_PATTERNS = (
    _DIAGNOSIS_SECTION_PATTERN,
    _SYMPTOMS_SECTION_PATTERN,
    _MEDICATION_SECTION_PATTERN,
    _LAB_SECTION_PATTERN,
    re.compile(r"^\s*(?:hospital|patient|doctor|age|gender|sex)\s*[:\-]?\s*(?P<tail>.*)\s*$", re.IGNORECASE),
)

_DOSAGE_PATTERN = re.compile(r"\b\d+(?:\.\d+)?\s?(?:mg|mcg|g|ml|IU|units?)\b", re.IGNORECASE)

_DURATION_PATTERN = re.compile(
    r"\b(?:for\s+)?\d+\s*(?:days?|weeks?|months?|years?)\b"
    r"|\b\d+[-]\d+\s*(?:days?|weeks?|months?)\b",
    re.IGNORECASE,
)

_ROUTE_PATTERN = re.compile(
    r"\b(?:PO|P\.O\.|oral|by\s+mouth|topical|intravenous|IV|intramuscular|IM|"
    r"subcutaneous|SC|subcut(?:aneous)?|sublingual|buccal|inhaled|nasal|"
    r"ophthalmic|otic|rectal|vaginal)\b",
    re.IGNORECASE,
)

_MEDICINE_LINE_PATTERN = re.compile(
    r"(?P<form>Tab|Cap|Capsule|Syrup|Syp|Inj|Injection|Drops|Ointment|Cream|Gel|Patch|Inhaler)?\s*"
    r"(?P<name>[A-Za-z][A-Za-z0-9+\- ]{1,30}?)\s+"
    r"(?P<dosage>\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|IU|units?))?"
    r"(?:\s+|\b)"
    r"(?P<frequency>\d-\d-\d|OD|BD|TDS|QDS|QID|TID|BID|SID|SOS|PRN|STAT|"
    r"(?:once|twice|thrice)(?:\s+(?:a|per)\s+day)?)?"
    r"(?:\s+x\s*|\s+)?"
    r"(?P<duration>\d+\s*(?:day|days|week|weeks|month|months))?",
    re.IGNORECASE,
)

_LAB_TEST_PATTERN = re.compile(
    r"\b(?:HbA1c|hemoglobin|haemoglobin|Hb|RBC|WBC|CBC|platelet|"
    r"glucose|blood\s+sugar|fasting\s+sugar|pp\s+sugar|blood\s+glucose|blood\s+pressure|creatinine|urea|"
    r"BUN|sodium|potassium|chloride|bicarbonate|calcium|magnesium|"
    r"phosphate|albumin|bilirubin|ALT|AST|SGPT|SGOT|ALP|GGT|LDH|TSH|"
    r"T3|T4|PSA|CEA|CA-?125|cholesterol|triglycerides|HDL|LDL|VLDL|"
    r"INR|PT|aPTT|ESR|CRP|procalcitonin|ferritin|iron|transferrin|"
    r"vitamin\s+D|vitamin\s+B12|folate|uric\s+acid|eGFR|GFR|"
    r"lipid\s+profile|liver\s+function\s+test|LFT|KFT|"
    r"urine\s+culture|blood\s+culture|x-?ray|MRI|CT\s+scan|ultrasound|"
    r"ECG|EKG|echocardiogram|biopsy)\b",
    re.IGNORECASE,
)

_DATE_PATTERN = re.compile(
    r"\b(?:"
    r"\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}"                       # 12/08/2025, 12-08-25
    r"|\d{4}[/\-.]\d{1,2}[/\-.]\d{1,2}"                        # 2025-08-12
    r"|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)"
    r"[a-z]*\.?\s+\d{1,2},?\s+\d{4}"                            # Aug 12, 2025
    r"|\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)"
    r"[a-z]*\.?\s+\d{4}"                                        # 12 Aug 2025
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
    r"\b([A-Z][A-Za-z&.'\- ]{2,60}?\s(?:Hospital|Clinic|Medical\s+Centre|"
    r"Medical\s+Center|Nursing\s+Home|Healthcare|Diagnostics|Institute))\b"
)

_DIAGNOSIS_PATTERN = re.compile(
    r"\b(?:Diagnosis|Impression|Assessment|Clinical\s+Diagnosis)\s*[:\-]\s*"
    r"([^\n]{2,150})",
    re.IGNORECASE,
)

_INSTRUCTION_KEYWORDS: List[str] = [
    "take", "apply", "use", "administer", "swallow", "dissolve",
    "inject", "inhale", "avoid", "do not", "with food", "without food",
    "follow up", "review", "monitor", "fasting", "empty stomach",
]


# ---------------------------------------------------------------------------
# BioClinicalBERT model wrapper (singleton)
# ---------------------------------------------------------------------------

class _BioClinicalBERTModel:
    """Singleton wrapper around the HuggingFace token-classification pipeline."""

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
        except Exception as exc:  # noqa: BLE001
            logger.error("Failed to load BioClinicalBERT model: %s", exc, exc_info=True)
            self._pipeline = None
            self.model_loaded = False

        self._initialized = True

    def predict(self, text: str) -> List[Dict[str, Any]]:
        if self._pipeline is None:
            return []
        try:
            #return self._pipeline(text, truncation=True, max_length=settings.NLP_MAX_TOKEN_LENGTH)
            return self._pipeline(text)
        except Exception as exc:  # noqa: BLE001
            logger.error("BioClinicalBERT inference failed: %s", exc)
            raise NLPEngineError(f"NLP inference failed: {exc}") from exc


def get_nlp_model() -> _BioClinicalBERTModel:
    return _BioClinicalBERTModel()


# ---------------------------------------------------------------------------
# NLPService
# ---------------------------------------------------------------------------

class NLPService:
    """
    Public NLP entity-extraction service.

    extract_entities(text) runs BioClinicalBERT token classification
    (if the model loaded successfully) plus a deterministic regex layer
    that fills in fields the base NER model doesn't cover out of the
    box (patient/doctor/hospital/age/gender/dates/diagnosis/structured
    medicines/lab tests), then merges everything into the schema the
    API returns.
    """

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

    # -- public API -----------------------------------------------------

    def extract_entities(self, text: str, ocr_confidence: Optional[float] = None) -> Dict[str, Any]:
        """
        Extract structured medical entities from cleaned OCR text.

        Returns a dict matching the `MedicalEntities` schema fields.
        """
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

        for ent in raw_entities:
            label = ent.get("entity_group", ent.get("entity", "")).upper()
            word = ent.get("word", "").strip().replace("##", "")
            bucket = self._BERT_LABEL_MAP.get(label)
            if bucket and bucket in buckets and len(word) >= 2:
                buckets[bucket].add(self._normalize(word))

        diagnosis_items = self._extract_section_items(truncated, _DIAGNOSIS_SECTION_PATTERN)
        symptom_items = self._extract_section_items(truncated, _SYMPTOMS_SECTION_PATTERN)
        lab_items = self._extract_section_items(truncated, _LAB_SECTION_PATTERN)

        if diagnosis_items:
            for item in diagnosis_items:
                cleaned = self._clean_list_item(item)
                if cleaned and not _LAB_TEST_PATTERN.search(cleaned):
                    buckets["disease"].add(cleaned)
                    buckets["diagnosis"].add(cleaned)
        else:
            self._extract_keyword_bucket(truncated, _DISEASE_KEYWORDS, buckets["disease"])
            self._extract_diagnosis(truncated, buckets["diagnosis"])

        if symptom_items:
            for item in symptom_items:
                cleaned = self._clean_list_item(item)
                if cleaned:
                    buckets["symptoms"].add(cleaned)
        else:
            self._extract_keyword_bucket(truncated, _SYMPTOM_KEYWORDS, buckets["symptoms"])

        if any("pain" in symptom.lower() and symptom.lower() != "pain" for symptom in buckets["symptoms"]):
            buckets["symptoms"].discard("Pain")

        symptoms_list = sorted(buckets["symptoms"])
        to_remove: Set[str] = set()
        for symptom in symptoms_list:
            symptom_lower = symptom.lower()
            for other in symptoms_list:
                if symptom != other and symptom_lower in other.lower() and len(other) > len(symptom):
                    to_remove.add(symptom)
                    break
        buckets["symptoms"].difference_update(to_remove)

        self._extract_regex_bucket(truncated, _DOSAGE_PATTERN, buckets["dosage"], normalize_dosage=True)
        self._extract_frequency(truncated, buckets["frequency"])
        self._extract_regex_bucket(truncated, _DURATION_PATTERN, buckets["duration"])
        if lab_items:
            for item in lab_items:
                cleaned = self._clean_list_item(item)
                if cleaned and _LAB_TEST_PATTERN.search(cleaned):
                    buckets["lab_tests"].add(cleaned)
        else:
            for line in truncated.splitlines():
                cleaned = self._clean_list_item(line)
                if cleaned and _LAB_TEST_PATTERN.search(cleaned):
                    buckets["lab_tests"].add(cleaned)
        self._extract_regex_bucket(truncated, _DATE_PATTERN, buckets["dates"])


        medicines = self._extract_medicines(truncated)
        patient_name = self._extract_patient_name(truncated)
        doctor_name = self._extract_doctor_name(truncated)
        hospital = self._extract_hospital(truncated)
        age = self._extract_age(truncated)
        gender = self._extract_gender(truncated)

        needs_review = bool(
            ocr_confidence is not None and ocr_confidence < settings.REVIEW_CONFIDENCE_THRESHOLD
        )
        if not self._model.model_loaded:
            needs_review = True

        return {
            "patient_name": patient_name,
            "doctor_name": doctor_name,
            "hospital": hospital,
            "age": age,
            "gender": gender,
            "disease": sorted(buckets["disease"]),
            "symptoms": sorted(buckets["symptoms"]),
            "diagnosis": sorted(buckets["diagnosis"]),
            "medicines": [m.to_medicine() for m in medicines],
            "lab_tests": sorted(buckets["lab_tests"]),
            "dates": sorted(buckets["dates"]),
            "needs_review": needs_review,
        }

    # -- helpers ------------------------------------------------------------

    @staticmethod
    def _empty_entities(needs_review: bool = True) -> Dict[str, Any]:
        return {
            "patient_name": None, "doctor_name": None, "hospital": None,
            "age": None, "gender": None, "disease": [], "symptoms": [],
            "diagnosis": [], "medicines": [], "lab_tests": [], "dates": [],
            "needs_review": needs_review,
        }

    @staticmethod
    def _normalize(text: str) -> str:
        text = text.strip()
        return text[0].upper() + text[1:] if text else text

    @staticmethod
    def _extract_keyword_bucket(text: str, keywords: Set[str], bucket: Set[str]) -> None:
        lower = text.lower()
        for kw in keywords:
            if kw in lower:
                match = re.search(re.escape(kw), text, re.IGNORECASE)
                if match:
                    bucket.add(NLPService._normalize(match.group()))

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
    def _extract_section_items(text: str, header_pattern: re.Pattern) -> List[str]:
        items: List[str] = []
        collecting = False
        for raw_line in text.splitlines():
            line = raw_line.strip()
            if not line:
                continue
            match = header_pattern.match(line)
            if match:
                collecting = True
                tail = match.groupdict().get("tail", "").strip()
                if tail:
                    items.append(tail)
                continue
            if collecting:
                if any(pattern.match(line) for pattern in _ALL_SECTION_PATTERNS):
                    break
                items.append(line)
        return items

    @staticmethod
    def _clean_list_item(value: str) -> str:
        return re.sub(r"^\s*(?:[-*•]|\d+[.)])\s*", "", value).strip()

    @staticmethod
    def _extract_medicine_name(text: str) -> str:
        name = text.splitlines()[0].strip() if text else ""
        name = re.sub(
            r"^\s*(?:Tab|Tablet|Cap|Capsule|Syrup|Syp|Inj|Injection|Drops?|Ointment|Cream|Gel|Patch|Inhaler)\s+",
            "",
            name,
            flags=re.IGNORECASE,
        )
        name = re.sub(
            r"\b(?:Tab|Tablet|Cap|Capsule|Syrup|Syp|Inj|Injection|Drops?|Ointment|Cream|Gel|Patch|Inhaler)\b.*$",
            "",
            name,
            flags=re.IGNORECASE,
        )
        name = re.sub(
            r"\b\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|iu|units?)\b.*$",
            "",
            name,
            flags=re.IGNORECASE,
        )
        return name.strip(" ,:-")

    @staticmethod
    def _normalize_frequency(value: str) -> str:
        return re.sub(r"\s+", " ", value.strip()).upper().replace(".", "")

    @staticmethod
    def _extract_form(text: str) -> Optional[str]:
        match = _FORM_PATTERN.search(text)
        if not match:
            return None
        token = match.group(1).lower()
        return {
            "tab": "Tablet",
            "tablet": "Tablet",
            "cap": "Capsule",
            "capsule": "Capsule",
            "syp": "Syrup",
            "syrup": "Syrup",
            "inj": "Injection",
            "injection": "Injection",
            "cream": "Cream",
            "ointment": "Ointment",
            "drop": "Drops",
            "drops": "Drops",
            "spray": "Spray",
            "gel": "Gel",
            "powder": "Powder",
            "inhaler": "Inhaler",
            "patch": "Patch",
        }.get(token, match.group(1).title())

    @staticmethod
    def _extract_route(text: str, form: Optional[str] = None) -> Optional[str]:
        match = _ROUTE_PATTERN.search(text)
        if match:
            token = re.sub(r"\s+", " ", match.group(0).strip()).lower()
            return {
                "po": "Oral",
                "p.o.": "Oral",
                "oral": "Oral",
                "by mouth": "Oral",
                "iv": "Intravenous",
                "intravenous": "Intravenous",
                "im": "Intramuscular",
                "intramuscular": "Intramuscular",
                "sc": "Subcutaneous",
                "subcut": "Subcutaneous",
                "subcutaneous": "Subcutaneous",
                "topical": "Topical",
                "inhalation": "Inhalation",
                "inhaled": "Inhalation",
                "nasal": "Nasal",
                "ophthalmic": "Ophthalmic",
                "eye drops": "Ophthalmic",
                "rectal": "Rectal",
                "vaginal": "Vaginal",
            }.get(token, match.group(0).strip().title())

        lowered = text.lower()
        if "insulin" in lowered:
            return "Subcutaneous"
        if form == "Inhaler" or re.search(r"\b(?:inhalation|inhaled|neb(?:ulized)?|mdi|dpi)\b", text, re.IGNORECASE):
            return "Inhalation"
        if form in {"Tablet", "Capsule", "Syrup", "Powder"}:
            return "Oral"
        if form in {"Cream", "Ointment", "Gel", "Patch"}:
            return "Topical"
        if form == "Drops" and re.search(r"\b(?:eye|ophthalmic)\b", text, re.IGNORECASE):
            return "Ophthalmic"
        if form == "Drops" and re.search(r"\b(?:ear|otic)\b", text, re.IGNORECASE):
            return "Otic"
        if form == "Drops" and re.search(r"\b(?:nose|nasal)\b", text, re.IGNORECASE):
            return "Nasal"
        return None

    @staticmethod
    def _extract_frequency(text: str, bucket: Set[str]) -> None:
        for m in _FREQUENCY_PATTERN.finditer(text):
            bucket.add(m.group().strip().upper())

    @staticmethod
    def _extract_diagnosis(text: str, bucket: Set[str]) -> None:
        for m in _DIAGNOSIS_PATTERN.finditer(text):
            value = m.group(1).strip()
            if value:
                bucket.add(value)

    @staticmethod
    def _extract_medicines(text: str) -> List[_MedicineDraft]:
        """
        Structured medicine extraction: scan line-by-line for a medicine
        name + optional form/dosage/frequency/duration, using known drug
        names as an anchor to avoid false positives on ordinary prose.
        """
        medicines: List[_MedicineDraft] = []
        seen_names: Set[str] = set()

        lines = [line.strip() for line in text.split("\n")]
        for index, line in enumerate(lines):
            if not line:
                continue
            lower_line = line.lower()
            matched_drug = next((d for d in _COMMON_MEDICINES if d in lower_line), None)
            if not matched_drug:
                continue

            block_lines = [line]
            for offset in (1, 2):
                if index + offset < len(lines):
                    next_line = lines[index + offset].strip()
                    if next_line and not any(d in next_line.lower() for d in _COMMON_MEDICINES):
                        block_lines.append(next_line)

            block_text = "\n".join(block_lines)
            match = _MEDICINE_LINE_PATTERN.search(block_text)
            name = NLPService._extract_medicine_name(block_text) or matched_drug.title()
            if name.lower() in seen_names:
                continue
            seen_names.add(name.lower())

            dosage = None
            frequency = None
            frequency_human = None
            duration = None
            form = None
            route = None

            if match:
                dosage_match = _DOSAGE_PATTERN.search(block_text)
                dosage = dosage_match.group(0) if dosage_match else match.group("dosage")
                if dosage:
                    dosage = re.sub(r"(\d+)\s+(mg|mcg|g|ml|iu|units?)", r"\1\2", dosage, flags=re.IGNORECASE)
                frequency_match = _FREQUENCY_PATTERN.search(block_text)
                if frequency_match:
                    frequency = NLPService._normalize_frequency(frequency_match.group(0))
                    frequency_human = _FREQUENCY_HUMAN_MAP.get(frequency)
                duration_match = _DURATION_PATTERN.search(block_text)
                duration = duration_match.group(0) if duration_match else match.group("duration")
                if duration:
                    duration = re.sub(r"^\s*for\s+", "", duration, flags=re.IGNORECASE)
                form = match.group("form")
                if form:
                    form = form.title()

            if form is None:
                form = NLPService._extract_form(block_text)

            route = NLPService._extract_route(block_text, form=form)

            medicines.append(
                _MedicineDraft(
                    name=name,
                    dosage=dosage,
                    frequency=frequency,
                    frequency_human=frequency_human,
                    duration=duration,
                    form=form,
                    route=route,
                )
            )

        return medicines

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
        match = _HOSPITAL_PATTERN.search(text)
        return match.group(1).strip() if match else None

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
    """FastAPI dependency-style accessor for the NLP service."""
    return NLPService()
