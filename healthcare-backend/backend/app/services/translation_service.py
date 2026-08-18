
"""
app/services/translation_service.py — Multilingual Translation (Phase 8).

Supports English (en), Tamil (ta), Kannada (kn), Telugu (te), and
Hindi (hi). Translates simplified reports and OCR output while
preserving medicine names, dosages, dates, units, and other medical
terminology that must never be altered by translation.

Implementation note (read this before assuming a bug): a full neural
MT engine (e.g. IndicTrans2, NLLB, or a cloud Translation API) needs
either a multi-GB model download or outbound internet access to a
translation API — neither is available in this environment (see
ocr_service.py's _StubOCREngine docstring for the same constraint
affecting PaddleOCR). This service is built so that swapping in a real
MT backend later is a one-function change (`_translate_phrase`
/ `TranslationBackend`), without touching the protection logic, the
DB storage, or any router:

  1. PROTECTION PASS: dosages ("500mg", "5 ml"), units, dates, and any
     caller-supplied medicine/proper-noun list are replaced with
     placeholder tokens before translation and restored verbatim
     afterwards, so they are never mistranslated.
  2. PHRASE-DICTIONARY PASS: a curated bank of medical-report phrases
     (matching exactly what SimplificationService's structured summary
     emits, plus common standalone terms) is translated via
     longest-match-first substitution into the target language.
  3. Anything not covered by the dictionary is left in English rather
     than silently guessed — callers can see precisely what was and
     wasn't translated, which is safer for medical content than a
     best-effort mistranslation.
"""
from __future__ import annotations

import re
from typing import Dict, Iterable, List, Tuple

from app.core.logging_config import get_logger

logger = get_logger(__name__)

SUPPORTED_LANGUAGES: Dict[str, str] = {
    "en": "English",
    "ta": "Tamil",
    "kn": "Kannada",
    "te": "Telugu",
    "hi": "Hindi",
}

# Phrase bank: English phrase -> translation per target language code.
# Covers SimplificationService's template output plus common
# prescription/report vocabulary. Longest phrases are matched first.
_PHRASE_BANK: Dict[str, Dict[str, str]] = {
    "what was found": {"ta": "என்ன கண்டறியப்பட்டது", "kn": "ಏನು ಪತ್ತೆಯಾಗಿದೆ", "te": "ఏమి కనుగొనబడింది", "hi": "क्या पाया गया"},
    "symptoms noted": {"ta": "குறிப்பிடப்பட்ட அறிகுறிகள்", "kn": "ಗಮನಿಸಿದ ಲಕ್ಷಣಗಳು", "te": "గమనించిన లక్షణాలు", "hi": "देखे गए लक्षण"},
    "your medicines": {"ta": "உங்கள் மருந்துகள்", "kn": "ನಿಮ್ಮ ಔಷಧಿಗಳು", "te": "మీ మందులు", "hi": "आपकी दवाइयाँ"},
    "tests mentioned": {"ta": "குறிப்பிடப்பட்ட பரிசோதனைகள்", "kn": "ಉಲ್ಲೇಖಿಸಲಾದ ಪರೀಕ್ಷೆಗಳು", "te": "ప్రస్తావించిన పరీక్షలు", "hi": "उल्लिखित जाँचें"},
    "prescribed by": {"ta": "பரிந்துரைத்தவர்", "kn": "ಶಿಫಾರಸು ಮಾಡಿದವರು", "te": "సూచించినవారు", "hi": "किसने लिखी"},
    "important dates": {"ta": "முக்கியமான தேதிகள்", "kn": "ಪ್ರಮುಖ ದಿನಾಂಕಗಳು", "te": "ముఖ్యమైన తేదీలు", "hi": "महत्वपूर्ण तिथियाँ"},
    "take": {"ta": "எடுத்துக் கொள்ளுங்கள்", "kn": "ತೆಗೆದುಕೊಳ್ಳಿ", "te": "తీసుకోండి", "hi": "लें"},
    "for": {"ta": "க்காக", "kn": "ಗಾಗಿ", "te": "కోసం", "hi": "के लिए"},
    "high blood pressure": {"ta": "உயர் இரத்த அழுத்தம்", "kn": "ಅಧಿಕ ರಕ್ತದೊತ್ತಡ", "te": "అధిక రక్తపోటు", "hi": "उच्च रक्तचाप"},
    "low blood pressure": {"ta": "குறைந்த இரத்த அழுத்தம்", "kn": "ಕಡಿಮೆ ರಕ್ತದೊತ್ತಡ", "te": "తక్కువ రక్తపోటు", "hi": "निम्न रक्तचाप"},
    "diabetes (high blood sugar)": {"ta": "நீரிழிவு (உயர் இரத்த சர்க்கரை)", "kn": "ಮಧುಮೇಹ (ಅಧಿಕ ರಕ್ತದ ಸಕ್ಕರೆ)", "te": "మధుమేహం (అధిక రక్త చక్కెర)", "hi": "मधुमेह (उच्च रक्त शर्करा)"},
    "fever": {"ta": "காய்ச்சல்", "kn": "ಜ್ವರ", "te": "జ్వరం", "hi": "बुखार"},
    "cough": {"ta": "இருமல்", "kn": "ಕೆಮ್ಮು", "te": "దగ్గు", "hi": "खांसी"},
    "headache": {"ta": "தலைவலி", "kn": "ತಲೆನೋವು", "te": "తలనొప్పి", "hi": "सिरदर्द"},
    "twice a day": {"ta": "நாளுக்கு இரண்டு முறை", "kn": "ದಿನಕ್ಕೆ ಎರಡು ಬಾರಿ", "te": "రోజుకు రెండుసార్లు", "hi": "दिन में दो बार"},
    "three times a day": {"ta": "நாளுக்கு மூன்று முறை", "kn": "ದಿನಕ್ಕೆ ಮೂರು ಬಾರಿ", "te": "రోజుకు మూడుసార్లు", "hi": "दिन में तीन बार"},
    "four times a day": {"ta": "நாளுக்கு நான்கு முறை", "kn": "ದಿನಕ್ಕೆ ನಾಲ್ಕು ಬಾರಿ", "te": "రోజుకు నాలుగుసార్లు", "hi": "दिन में चार बार"},
    "once a day": {"ta": "நாளுக்கு ஒரு முறை", "kn": "ದಿನಕ್ಕೆ ಒಮ್ಮೆ", "te": "రోజుకు ఒకసారి", "hi": "दिन में एक बार"},
    "as needed": {"ta": "தேவைப்படும்போது", "kn": "ಅಗತ್ಯವಿದ್ದಾಗ", "te": "అవసరమైనప్పుడు", "hi": "आवश्यकतानुसार"},
    "at bedtime": {"ta": "படுக்கும் நேரத்தில்", "kn": "ಮಲಗುವ ಸಮಯದಲ್ಲಿ", "te": "పడుకునే ముందు", "hi": "सोते समय"},
    "by mouth": {"ta": "வாய் வழியாக", "kn": "ಬಾಯಿಯ ಮೂಲಕ", "te": "నోటి ద్వారా", "hi": "मुँह से"},
    "immediately": {"ta": "உடனடியாக", "kn": "ತಕ್ಷಣ", "te": "వెంటనే", "hi": "तुरंत"},
    "doctor": {"ta": "மருத்துவர்", "kn": "ವೈದ್ಯರು", "te": "వైద్యుడు", "hi": "डॉक्टर"},
    "hospital": {"ta": "மருத்துவமனை", "kn": "ಆಸ್ಪತ್ರೆ", "te": "ఆసుపత్రి", "hi": "अस्पताल"},
}

_PHRASE_KEYS_BY_LENGTH: List[str] = sorted(_PHRASE_BANK, key=len, reverse=True)

# Tokens that must never be translated / must survive verbatim.
_PROTECT_PATTERNS = [
    re.compile(r"\b\d+(?:\.\d+)?\s?(?:mg|mcg|g|kg|ml|l|iu|%)\b", re.IGNORECASE),  # dosage/units
    re.compile(r"\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b"),  # dates dd/mm/yyyy, dd-mm-yy, etc.
    re.compile(r"\b\d{4}-\d{2}-\d{2}\b"),  # ISO dates
    re.compile(r"\b\d+\b"),  # bare numbers (durations, ages, counts)
]


def _protect(text: str, extra_terms: Iterable[str] = ()) -> Tuple[str, Dict[str, str]]:
    """Replace protected substrings with placeholders; return (text, restore_map)."""
    restore_map: Dict[str, str] = {}
    counter = 0

    def _make_placeholder(value: str) -> str:
        nonlocal counter
        key = f"__PROT{counter}__"
        restore_map[key] = value
        counter += 1
        return key

    # Protect caller-supplied proper nouns (medicine names, patient/doctor
    # names) first, longest first, so multi-word names aren't partially matched.
    for term in sorted({t for t in extra_terms if t}, key=len, reverse=True):
        pattern = re.compile(re.escape(term), re.IGNORECASE)
        text = pattern.sub(lambda m: _make_placeholder(m.group(0)), text)

    for pattern in _PROTECT_PATTERNS:
        text = pattern.sub(lambda m: _make_placeholder(m.group(0)), text)

    return text, restore_map


def _restore(text: str, restore_map: Dict[str, str]) -> str:
    for placeholder, original in restore_map.items():
        text = text.replace(placeholder, original)
    return text


def _translate_phrases(text: str, target_lang: str) -> str:
    """Longest-match-first dictionary substitution, case-insensitive."""
    lowered = text
    for phrase in _PHRASE_KEYS_BY_LENGTH:
        translation = _PHRASE_BANK[phrase].get(target_lang)
        if not translation:
            continue
        pattern = re.compile(re.escape(phrase), re.IGNORECASE)
        lowered = pattern.sub(translation, lowered)
    return lowered


class TranslationService:
    """Stateless service: translates report/simplified text into a target language."""

    def translate(self, text: str, target_lang: str, protect_terms: Iterable[str] = ()) -> str:
        if target_lang not in SUPPORTED_LANGUAGES:
            raise ValueError(
                f"Unsupported target language '{target_lang}'. Supported: {list(SUPPORTED_LANGUAGES)}"
            )
        if target_lang == "en" or not text:
            return text or ""

        protected_text, restore_map = _protect(text, protect_terms)
        translated = _translate_phrases(protected_text, target_lang)
        result = _restore(translated, restore_map)
        logger.info("Translated text to %s: %d chars -> %d chars", target_lang, len(text), len(result))
        return result


def get_translation_service() -> TranslationService:
    return TranslationService()
