"""
app/utils/exceptions.py — Custom exception hierarchy.

Typed exceptions let the global FastAPI exception handlers (see
app/main.py) return precise HTTP status codes and consistent JSON
error bodies, instead of leaking raw tracebacks to clients.
"""


class MedicalAIError(Exception):
    """Base class for all application-level errors."""

    def __init__(self, message: str, status_code: int = 500):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


# ---- File / upload errors -------------------------------------------------


class InvalidFileError(MedicalAIError):
    """Raised when an uploaded file fails validation (type, size, corruption)."""

    def __init__(self, message: str):
        super().__init__(message, status_code=400)


class FileTooLargeError(MedicalAIError):
    def __init__(self, message: str):
        super().__init__(message, status_code=413)


class UnsupportedFileTypeError(MedicalAIError):
    def __init__(self, message: str):
        super().__init__(message, status_code=415)


class PDFConversionError(MedicalAIError):
    """Raised when a PDF cannot be rendered into page images."""

    def __init__(self, message: str):
        super().__init__(message, status_code=422)


class ImagePreprocessingError(MedicalAIError):
    def __init__(self, message: str):
        super().__init__(message, status_code=422)


# ---- OCR errors -------------------------------------------------------


class OCREngineError(MedicalAIError):
    """Raised when PaddleOCR itself fails to initialize or run."""

    def __init__(self, message: str):
        super().__init__(message, status_code=500)


class NoTextDetectedError(MedicalAIError):
    """Raised when OCR runs successfully but finds no text at all."""

    def __init__(self, message: str = "No text could be detected in the document."):
        super().__init__(message, status_code=422)


# ---- NLP errors -------------------------------------------------------


class NLPEngineError(MedicalAIError):
    """Raised when the BioClinicalBERT NER pipeline fails to initialize or run."""

    def __init__(self, message: str):
        super().__init__(message, status_code=500)
