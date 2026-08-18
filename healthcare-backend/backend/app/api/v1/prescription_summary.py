from fastapi import APIRouter, HTTPException

from app.schemas.prescription_summary import (
    PrescriptionSummaryRequest,
    PrescriptionSummaryResponse,
)

from app.services.prescription_summary_service import (
    PrescriptionSummaryService,
)

router = APIRouter()


@router.post(
    "/prescription-summary",
    response_model=PrescriptionSummaryResponse,
    summary="Generate Patient Friendly Prescription Summary",
)
async def generate_prescription_summary(
    request: PrescriptionSummaryRequest,
):
    """
    Generate a patient-friendly prescription summary
    from the extracted medicines.
    """

    # ---------------- DEBUG ----------------
    print("=" * 60)
    print("Prescription Summary API Called")
    print("Patient Name :", request.patient_name)
    print("Medicines Received :", request.medicines)
    print("Medicine Count :", len(request.medicines))
    print("=" * 60)
    # ---------------------------------------

    try:

        summary = PrescriptionSummaryService.generate_summary(
            patient_name=request.patient_name,
            medicines=request.medicines,
        )

        print("Summary Generated Successfully")

        return summary

    except Exception as e:

        print("ERROR:", str(e))

        raise HTTPException(
            status_code=500,
            detail=str(e),
        )