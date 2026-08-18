from typing import List

from app.schemas.ocr import Medicine
from app.schemas.prescription_summary import (
    MedicineSummary,
    PrescriptionSummaryResponse,
)


class PrescriptionSummaryService:
    """
    Generates a patient-friendly prescription summary
    from OCR + Med7 extracted medicines.
    """

    @staticmethod
    def generate_summary(
        patient_name: str,
        medicines: List[Medicine],
    ) -> PrescriptionSummaryResponse:

        medicine_summary: List[MedicineSummary] = []
        instructions: List[str] = []
        warnings: List[str] = []
        summary_lines: List[str] = []

        for med in medicines:

            medicine_summary.append(
                MedicineSummary(
                    name=med.name,
                    dosage=med.dosage,
                    frequency=med.frequency_human or med.frequency,
                    duration=med.duration,
                    route=med.route,
                )
            )

            line = med.name

            if med.dosage:
                line += f" ({med.dosage})"

            if med.frequency_human:
                line += f" - {med.frequency_human}"
            elif med.frequency:
                line += f" - {med.frequency}"

            if med.duration:
                line += f" for {med.duration}"

            if med.route:
                line += f" via {med.route}"

            summary_lines.append(line)

            if med.frequency_human:
                instructions.append(
                    f"Take {med.name} {med.frequency_human.lower()}."
                )
            elif med.frequency:
                instructions.append(
                    f"Take {med.name} {med.frequency.lower()}."
                )

            if med.route:
                instructions.append(
                    f"Route: {med.route}"
                )

        # Remove duplicate instructions
        instructions = list(dict.fromkeys(instructions))

        warnings = [
            "Complete the prescribed course.",
            "Do not skip doses.",
            "Consult your doctor if symptoms persist.",
        ]

        if summary_lines:
            summary = (
                "Prescription contains the following medicines:\n\n"
                + "\n".join(summary_lines)
            )
        else:
            summary = "No medicines were detected in the prescription."

        return PrescriptionSummaryResponse(
            patient_name=patient_name or "Unknown",
            document_type="Prescription",
            medicines=medicine_summary,
            instructions=instructions,
            warnings=warnings,
            follow_up="Follow your doctor's advice and attend follow-up visits if prescribed.",
            summary=summary,
        )