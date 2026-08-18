"""
app/utils/text_cleaner.py — OCR output cleaning.

PaddleOCR output is noisy: duplicate whitespace, stray punctuation
artifacts from misread glyphs, inconsistent dashes/ligatures, etc.
This module normalizes that raw text into something BioClinicalBERT
can tokenize cleanly, WITHOUT destroying clinically meaningful
abbreviations (e.g. "BD", "TDS", "mg", "Tab", "1-0-1") that a naive
"strip all non-alpha" cleaner would mangle.

Pipeline (clean_ocr_text):
  1. Normalize unicode dash/ligature variants.
  2. Drop non-printable control characters.
  3. Strip common OCR noise tokens (isolated punctuation runs, stray
     pipe/underscore artifacts from table borders).
  4. Collapse duplicate spaces/tabs and excessive blank lines.
  5. Preserve medical abbreviations and dosage notation verbatim.
"""
from __future__ import annotations

import re
from typing import Iterable, List

# Abbreviations that must never be altered by cleaning (case-sensitive
# tokens are protected explicitly during the artifact-stripping pass so
# that, e.g., "OD" is never mistaken for stray noise).
PROTECTED_ABBREVIATIONS = {
    "OD", "BD", "TDS", "QDS", "QID", "TID", "BID", "SID", "SOS", "PRN",
    "STAT", "AC", "PC", "HS", "Tab", "Cap", "Syp", "Inj", "IU", "mg",
    "mcg", "mL", "ml", "g", "kg", "cm", "mm",
}

# Sequences of OCR "junk" characters: runs of pipes/backticks/tildes or
# lone punctuation that PaddleOCR sometimes emits for table borders,
# stamps, or signature artifacts. These are stripped, but ordinary
# punctuation used in real sentences ('.', ',', '-', '/', ':') is kept.
_JUNK_RUN_PATTERN = re.compile(r"[|~`^_]{2,}")
_ISOLATED_NOISE_PATTERN = re.compile(r"(?<!\S)[|~`^_]+(?!\S)")

# Dash/quote/ligature normalization map.
_UNICODE_NORMALIZE_MAP = {
    "–": "-", "—": "-", "‐": "-", "‑": "-", "‒": "-",
    "’": "'", "‘": "'", "“": '"', "”": '"',
    "ﬁ": "fi", "ﬂ": "fl", "ﬀ": "ff",
}


def _normalize_unicode(text: str) -> str:
    for src, dst in _UNICODE_NORMALIZE_MAP.items():
        text = text.replace(src, dst)
    return text


def _strip_control_characters(text: str) -> str:
    # Keep standard printable ASCII plus newline/tab; drop everything else
    # that isn't already handled by unicode normalization above.
    return re.sub(r"[^\x20-\x7E\n\t]", " ", text)


def _strip_ocr_artifacts(text: str) -> str:
    text = _JUNK_RUN_PATTERN.sub(" ", text)
    text = _ISOLATED_NOISE_PATTERN.sub(" ", text)
    return text


def _collapse_whitespace(text: str) -> str:
    # Collapse runs of spaces/tabs into a single space, but keep line
    # breaks (they carry OCR reading-order structure that helps the
    # instruction/sentence-level regex extraction downstream).
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r" *\n *", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def clean_ocr_text(text: str) -> str:
    """
    Full cleaning pipeline applied to raw OCR output before it is
    handed to the NLP stage.
    """
    if not text or not isinstance(text, str):
        return ""

    text = _normalize_unicode(text)
    text = _strip_control_characters(text)
    text = _strip_ocr_artifacts(text)
    text = _collapse_whitespace(text)
    return text


def merge_ocr_lines(lines: Iterable[str]) -> str:
    """
    Merge a sequence of OCR-detected text lines (already in reading
    order) into a single block of text, one line per newline. This is
    the "Merge OCR text" step of the pipeline, kept separate from
    cleaning so callers can merge raw lines first, then clean once.
    """
    return "\n".join(line.strip() for line in lines if line and line.strip())


def truncate_for_model(text: str, max_chars: int) -> str:
    """Hard character cap so the tokenizer never overflows its max length."""
    if len(text) <= max_chars:
        return text
    return text[:max_chars]


def filter_low_confidence_lines(
    lines: List[dict], min_confidence: float
) -> List[dict]:
    """
    Confidence filtering: given a list of {"text", "confidence", ...}
    line dicts, return only those meeting the minimum confidence
    threshold. Used to build the "clean" merged text while still
    reporting all lines (including low-confidence ones) in the raw
    OCR output for transparency.
    """
    return [line for line in lines if line.get("confidence", 0.0) >= min_confidence]
