from fastapi import APIRouter, HTTPException

from app.schemas.contact import ContactRequest
from app.services.email_service import get_messages, save_message
from app.utils.validators import validate_name

router = APIRouter(
    prefix="/contact",
    tags=["Contact"]
)


@router.get("/")
def list_messages():
    return {
        "success": True,
        "messages": get_messages()
    }


@router.post("/")
def contact(contact: ContactRequest):

    if not validate_name(contact.name):
        raise HTTPException(
            status_code=400,
            detail="Name should contain only alphabets."
        )

    save_message(contact.model_dump())

    return {
        "success": True,
        "message": "Thank you for contacting us."
    }