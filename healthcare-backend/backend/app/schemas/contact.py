from pydantic import BaseModel, EmailStr, Field


class ContactRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=50)
    email: EmailStr
    message: str = Field(..., min_length=10, max_length=500)


class ContactResponse(BaseModel):
    success: bool
    message: str