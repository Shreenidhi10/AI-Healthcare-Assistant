"""
app/routers/medical_history.py — FastAPI router for Medical History Upload & CRUD APIs.
"""
from __future__ import annotations

import datetime
import logging
import uuid
from typing import Any, Dict
from fastapi import APIRouter, File, HTTPException, UploadFile, status
from app.database import _in_memory_medical_history
from app.services.pipeline import get_pipeline
from app.utils.exceptions import InvalidFileError, MedicalAIError

logger = logging.getLogger("app.routers.medical_history")

router = APIRouter(prefix="/api/medical-history", tags=["Medical History"])


@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_prescription(file: UploadFile = File(...)):
    logger.info("[MedHistory] Upload received: %s", file.filename)
    pipeline = get_pipeline()

    try:
        extract_res = await pipeline.run(file)
    except InvalidFileError as exc:
        logger.warning("[MedHistory] Invalid file: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
        ) from exc
    except MedicalAIError as exc:
        logger.error("[MedHistory] Processing error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)
        ) from exc

    entities = extract_res.entities
    now = datetime.datetime.utcnow().isoformat() + "Z"

    primary_medication = ""
    if entities.medicines:
        primary_medication = entities.medicines[0].name
    elif entities.disease:
        primary_medication = entities.disease[0]
    elif entities.diagnosis:
        primary_medication = entities.diagnosis[0]
    else:
        primary_medication = file.filename.rsplit(".", 1)[0].replace("_", " ").title()

    doctor = entities.doctor_name or ""
    status_tags = ["Processed"]
    if entities.needs_manual_review:
        status_tags.append("Needs Review")
    elif extract_res.ocr_confidence >= 0.85:
        status_tags.append("Verified")

    doc_id = uuid.uuid4().hex

    document: Dict[str, Any] = {
        "id": doc_id,
        "userId": "demo-user",
        "filename": extract_res.filename,
        "fileType": extract_res.file_type,
        "originalOCRText": extract_res.ocr_text,
        "ocrConfidence": extract_res.ocr_confidence,
        "language": "en",
        "medication": primary_medication,
        "doctor": doctor,
        "doctorName": doctor,
        "patientName": entities.patient_name or "",
        "hospital": entities.hospital_clinic or "",
        "medicines": [m.model_dump() for m in entities.medicines],
        "disease": entities.disease,
        "diagnosis": entities.diagnosis,
        "symptoms": entities.symptoms,
        "labTests": entities.lab_tests,
        "status": status_tags,
        "processingStatus": "completed",
        "processingTime": round(extract_res.timing_seconds.get("total", 0.0), 4),
        "ocrTime": round(extract_res.timing_seconds.get("ocr", 0.0), 4),
        "nlpTime": round(extract_res.timing_seconds.get("nlp", 0.0), 4),
        "createdAt": now,
        "updatedAt": now,
    }

    _in_memory_medical_history[doc_id] = document
    logger.info("[MedHistory] Saved record in-memory id=%s", doc_id)

    print(extract_res.timing_seconds)
    return {
        "success": True,
        "message": "Prescription processed and saved successfully.",
        "data": document,
    }


@router.get("")
@router.get("/")
async def list_medical_history():
    results = [dict(item) for item in _in_memory_medical_history.values()]
    results.sort(key=lambda x: x.get("createdAt", ""), reverse=True)
    return {"success": True, "count": len(results), "data": results}


@router.get("/{id}")
async def get_medical_history_by_id(id: str):
    if id in _in_memory_medical_history:
        item = dict(_in_memory_medical_history[id])
        return {"success": True, "data": item}
    raise HTTPException(status_code=404, detail="Medical history record not found")


@router.delete("/{id}")
async def delete_medical_history_by_id(id: str):
    if id in _in_memory_medical_history:
        del _in_memory_medical_history[id]
        return {"success": True, "message": "Medical history record deleted successfully."}
    
    raise HTTPException(status_code=404, detail="Medical history record not found")
