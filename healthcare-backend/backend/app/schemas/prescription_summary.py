from typing import List, Optional

from pydantic import BaseModel, Field


class MedicineSummary(BaseModel):
    """Single medicine information."""

    name: str = Field(..., example="Paracetamol")

    strength: Optional[str] = Field(
        default=None,
        example="500 mg"
    )

    dosage: Optional[str] = Field(
        default=None,
        example="1 Tablet"
    )

    frequency: Optional[str] = Field(
        default=None,
        example="Twice Daily"
    )

    # Added for compatibility with the NLP pipeline
    frequency_human: Optional[str] = Field(
        default=None,
        example="Twice Daily"
    )

    duration: Optional[str] = Field(
        default=None,
        example="5 Days"
    )

    route: Optional[str] = Field(
        default=None,
        example="Oral"
    )


class PrescriptionSummaryRequest(BaseModel):
    """
    Request body for generating a patient-friendly
    prescription summary.
    """

    patient_name: Optional[str] = Field(
        default="Unknown",
        example="John Doe"
    )

    medicines: List[MedicineSummary] = Field(
        default_factory=list
    )


class PrescriptionSummaryResponse(BaseModel):
    """Patient-friendly prescription summary."""

    patient_name: Optional[str] = Field(
        default="Unknown",
        example="John Doe"
    )

    document_type: str = Field(
        default="Prescription",
        example="Prescription"
    )

    medicines: List[MedicineSummary] = Field(
        default_factory=list
    )

    instructions: List[str] = Field(
        default_factory=list,
        example=[
            "Take after food.",
            "Complete the full course."
        ]
    )

    warnings: List[str] = Field(
        default_factory=list,
        example=[
            "Do not skip doses.",
            "Consult your doctor if symptoms persist."
        ]
    )

    follow_up: Optional[str] = Field(
        default="Follow doctor's advice.",
        example="Follow doctor's advice."
    )

    summary: str = Field(
        default="No summary generated.",
        example=(
            "Patient should take Paracetamol 500 mg twice daily "
            "after food for five days."
        )
    )