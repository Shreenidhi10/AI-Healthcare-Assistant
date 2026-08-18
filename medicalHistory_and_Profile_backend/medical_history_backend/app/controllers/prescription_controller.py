"""
app/controllers/prescription_controller.py — Controller logic for Prescriptions & Stats APIs.
"""
from __future__ import annotations

import datetime
import logging
import uuid
from typing import Any, Dict, List, Optional
from fastapi import HTTPException
from app.database import _in_memory_medical_history

logger = logging.getLogger("app.controllers.prescription")


async def list_prescriptions(
    search: Optional[str] = None,
    language: Optional[str] = None,
    doctor: Optional[str] = None,
    status: Optional[str] = None,
    sort: Optional[str] = "-createdAt",
) -> List[Dict[str, Any]]:
    results = []
    
    for item in _in_memory_medical_history.values():
        doc = dict(item)
        
        if language and doc.get("language") != language:
            continue
            
        if doctor and doctor.lower() not in doc.get("doctorName", "").lower():
            continue
            
        if status and status not in doc.get("status", []):
            continue
            
        if search:
            s_lower = search.lower()
            med_match = s_lower in doc.get("medication", "").lower()
            doc_match = s_lower in doc.get("doctorName", "").lower()
            text_match = s_lower in doc.get("originalOCRText", "").lower()
            if not (med_match or doc_match or text_match):
                continue
                
        results.append(doc)
        
    sort_field = "createdAt"
    sort_dir = -1
    if sort:
        if sort.startswith("-"):
            sort_field = sort[1:]
            sort_dir = -1
        else:
            sort_field = sort
            sort_dir = 1
            
    results.sort(key=lambda x: x.get(sort_field, ""), reverse=(sort_dir == -1))
    return results[:200]


async def get_stats() -> Dict[str, Any]:
    total = len(_in_memory_medical_history)
    pending = sum(1 for item in _in_memory_medical_history.values() if "Pending Review" in item.get("status", []))
    verified = sum(1 for item in _in_memory_medical_history.values() if "Verified" in item.get("status", []))
    active = sum(1 for item in _in_memory_medical_history.values() if "Active" in item.get("status", []))

    latest_doc = max(_in_memory_medical_history.values(), key=lambda x: x.get("createdAt", ""), default=None)
    latest_date = latest_doc.get("createdAt") if latest_doc else datetime.datetime.utcnow().isoformat()

    return {
        "totalPrescriptions": total,
        "pendingReviews": pending,
        "verifiedRecords": verified,
        "activeTreatments": active,
        "latestUpdate": str(latest_date),
    }


async def get_prescription(doc_id: str) -> Dict[str, Any]:
    item = _in_memory_medical_history.get(doc_id)
    if not item:
        raise HTTPException(status_code=404, detail="Prescription not found")
    return dict(item)


async def create_prescription(body: Dict[str, Any]) -> Dict[str, Any]:
    now = datetime.datetime.utcnow().isoformat() + "Z"
    doc_id = uuid.uuid4().hex
    
    doc = {
        "id": doc_id,
        "userId": "demo-user",
        "filename": body.get("filename", "prescription.pdf"),
        "fileType": body.get("fileType", "pdf"),
        "originalOCRText": body.get("originalOCRText", f"Rx: {body.get('medication', '')}"),
        "ocrConfidence": body.get("ocrConfidence", 1.0),
        "language": body.get("language", "en"),
        "medication": body.get("medication", ""),
        "doctor": body.get("doctor", body.get("doctorName", "")),
        "doctorName": body.get("doctorName", body.get("doctor", "")),
        "patientName": body.get("patientName", ""),
        "hospital": body.get("hospital", ""),
        "medicines": body.get("medicines", []),
        "disease": body.get("disease", []),
        "diagnosis": body.get("diagnosis", []),
        "symptoms": body.get("symptoms", []),
        "labTests": body.get("labTests", []),
        "status": body.get("status", ["Processed"]),
        "processingStatus": "completed",
        "createdAt": now,
        "updatedAt": now,
    }

    _in_memory_medical_history[doc_id] = doc
    return doc


async def delete_prescription(doc_id: str) -> None:
    if doc_id in _in_memory_medical_history:
        del _in_memory_medical_history[doc_id]
    else:
        raise HTTPException(status_code=404, detail="Prescription not found")
