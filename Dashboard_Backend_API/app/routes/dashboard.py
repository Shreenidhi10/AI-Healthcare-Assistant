from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.database import SessionLocal
from app.models.user import User
from app.models.prescription import Prescription
from app.models.notification import Notification

router = APIRouter(
    prefix="/api/dashboard",
    tags=["Dashboard"]
)


# Database Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ---------------- USER ----------------
@router.get("/user")
def get_user(db: Session = Depends(get_db)):
    user = db.query(User).first()

    return {
        "username": user.username,
        "welcome_message": user.welcome_message,
        "subtitle": user.subtitle
    }


# ---------------- PRESCRIPTIONS ----------------
@router.get("/recent-prescriptions")
def get_recent_prescriptions(db: Session = Depends(get_db)):
    prescriptions = db.query(Prescription).all()

    return prescriptions


# ---------------- HEALTH TIP ----------------
@router.get("/health-tip")
def get_health_tip():
    return {
        "tip": "Complete your prescribed medicines."
    }


# ---------------- NOTIFICATIONS ----------------
@router.get("/notifications")
def get_notifications(db: Session = Depends(get_db)):
    notifications = db.query(Notification).all()

    return notifications