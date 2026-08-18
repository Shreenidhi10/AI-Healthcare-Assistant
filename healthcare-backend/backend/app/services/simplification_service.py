"""
app/services/simplification_service.py — Medical Text Simplification (Phase 7).

Converts a MedicalReport's OCR text + structured entities into
patient-friendly language while preserving medical accuracy: medicine
names, dosages, and numbers are never altered, only the surrounding
sentence structure and terminology are simplified.

Two complementary techniques, both rule-based (no external model
download required, unlike a transformer paraphraser, which is a
natural drop-in swap later — see nlp_service.py for the precedent of
graceful degradation used throughout this app):

  1. Term substitution: a curated medical-jargon -> plain-English
     dictionary (case-insensitive, word-boundary aware) covering the
     terms this app's own NLP entity extractor recognizes (see
     nlp_service.py's keyword banks), so the two modules stay in sync.
  2. Structured summary: a short, templated "what this means for you"
     paragraph built directly from the extracted entities (diagnosis,
     medicines + dosage/frequency, doctor, hospital, follow-up dates),
     which is far more reliable for patient comprehension than trying
     to paraphrase noisy OCR text sentence-by-sentence.

The final simplified_text is the structured summary followed by the
term-substituted version of the raw OCR text, so nothing from the
original document is silently dropped.
"""
from __future__ import annotations

import re
from typing import Any, Dict, List

from app.core.logging_config import get_logger

logger = get_logger(__name__)

# Medical jargon -> plain-language replacements. Word-boundary matched,
# case-insensitive. Kept intentionally conservative: only well-established
# lay equivalents, never a rewording that could change clinical meaning.
_TERM_MAP: Dict[str, str] = {
    "hypertension": "high blood pressure",
    "hypertensive": "having high blood pressure",
    "hypotension": "low blood pressure",
    "diabetes mellitus": "diabetes (high blood sugar)",
    "diabetes": "diabetes (high blood sugar)",
    "hyperglycemia": "high blood sugar",
    "hypoglycemia": "low blood sugar",
    "myocardial infarction": "heart attack",
    "cardiac arrest": "the heart stopping",
    "cerebrovascular accident": "stroke",
    "pyrexia": "fever",
    "pneumonia": "a lung infection (pneumonia)",
    "urinary tract infection": "a bladder/urine infection",
    "uti": "a bladder/urine infection",
    "gastroenteritis": "a stomach and intestine infection",
    "upper respiratory tract infection": "a common cold-type infection",
    "asthma": "asthma (a breathing condition)",
    "copd": "a long-term lung condition (COPD)",
    "anemia": "low red blood cell count (anemia)",
    "arthritis": "joint pain and swelling (arthritis)",
    "osteoporosis": "weak, brittle bones (osteoporosis)",
    "dermatitis": "skin inflammation",
    "conjunctivitis": "eye inflammation (pink eye)",
    "analgesic": "pain reliever",
    "antipyretic": "fever reducer",
    "antibiotic": "infection-fighting medicine (antibiotic)",
    "antihistamine": "allergy medicine",
    "antiemetic": "anti-nausea medicine",
    "nsaid": "anti-inflammatory pain medicine",
    "oral": "by mouth",
    "p.o.": "by mouth",
    "iv": "through a vein (IV)",
    "i.v.": "through a vein (IV)",
    "b.i.d.": "twice a day",
    "bid": "twice a day",
    "t.i.d.": "three times a day",
    "tid": "three times a day",
    "q.i.d.": "four times a day",
    "qid": "four times a day",
    "o.d.": "once a day",
    "od": "once a day",
    "prn": "as needed",
    "p.r.n.": "as needed",
    "hs": "at bedtime",
    "stat": "immediately",
    "npo": "nothing to eat or drink",
    "cbc": "complete blood count (a blood test)",
    "lft": "liver function test",
    "kft": "kidney function test",
    "bp": "blood pressure",
    "hb": "hemoglobin (blood iron-carrying protein) level",
}

# Longest terms first so "diabetes mellitus" matches before "diabetes".
_TERM_PATTERN = re.compile(
    r"\b(" + "|".join(re.escape(t) for t in sorted(_TERM_MAP, key=len, reverse=True)) + r")\b",
    re.IGNORECASE,
)


def _substitute_terms(text: str) -> str:
    if not text:
        return text

    def _replace(match: "re.Match[str]") -> str:
        return _TERM_MAP[match.group(0).lower()]

    return _TERM_PATTERN.sub(_replace, text)


def _format_medicine_line(medicine: Dict[str, Any]) -> str:
    name = medicine.get("name") or "a medicine"
    parts = [f"Take {name}"]
    if medicine.get("dosage"):
        parts.append(f"({medicine['dosage']})")
    if medicine.get("frequency_human") or medicine.get("frequency"):
        parts.append(medicine.get("frequency_human") or medicine.get("frequency"))
    if medicine.get("route"):
        parts.append(_substitute_terms(medicine["route"]))
    if medicine.get("duration"):
        parts.append(f"for {medicine['duration']}")
    return " ".join(parts) + "."


def build_structured_summary(entities: Dict[str, Any]) -> str:
    """Build a short 'what this means for you' paragraph from extracted entities."""
    lines: List[str] = []

    diagnosis = entities.get("diagnosis") or []
    disease = entities.get("disease") or []
    conditions = list(dict.fromkeys([*diagnosis, *disease]))  # dedupe, preserve order
    if conditions:
        plain_conditions = [_substitute_terms(c) for c in conditions]
        lines.append("What was found: " + ", ".join(plain_conditions) + ".")

    symptoms = entities.get("symptoms") or []
    if symptoms:
        lines.append("Symptoms noted: " + ", ".join(_substitute_terms(s) for s in symptoms) + ".")

    medicines = entities.get("medicines") or []
    if medicines:
        lines.append("Your medicines:")
        for med in medicines:
            med_dict = med if isinstance(med, dict) else med.__dict__
            lines.append("- " + _format_medicine_line(med_dict))

    lab_tests = entities.get("lab_tests") or []
    if lab_tests:
        lines.append("Tests mentioned: " + ", ".join(_substitute_terms(t) for t in lab_tests) + ".")

    doctor = entities.get("doctor_name")
    hospital = entities.get("hospital") or entities.get("hospital_clinic")
    if doctor or hospital:
        doctor_label = None
        if doctor:
            doctor_label = doctor if str(doctor).lower().startswith("dr") else f"Dr. {doctor}"
        who = " at ".join(filter(None, [doctor_label, hospital]))
        if who:
            lines.append(f"Prescribed by: {who}.")

    dates = entities.get("dates") or []
    if dates:
        lines.append("Important dates: " + ", ".join(dates) + ".")

    if not lines:
        lines.append(
            "We couldn't confidently identify structured details in this document. "
            "Please review the full text below or consult your healthcare provider."
        )

    return "\n".join(lines)


class SimplificationService:
    """Stateless service: converts (ocr_text, entities) -> patient-friendly text."""

    def simplify(self, ocr_text: str, entities: Dict[str, Any]) -> str:
        summary = build_structured_summary(entities)
        simplified_original = _substitute_terms(ocr_text) if ocr_text else ""

        parts = ["SUMMARY (in plain language):", summary]
        if simplified_original.strip():
            parts += ["", "FULL TEXT (simplified terms):", simplified_original]
        result = "\n".join(parts)
        logger.info("Simplified report: %d chars -> %d chars", len(ocr_text or ""), len(result))
        return result


def get_simplification_service() -> SimplificationService:
    return SimplificationService()
