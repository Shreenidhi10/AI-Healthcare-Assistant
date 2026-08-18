from app.database.database import SessionLocal
from app.models.user import User
from app.models.prescription import Prescription
from app.models.notification import Notification

db = SessionLocal()

# ---------- USER ----------
if db.query(User).count() == 0:
    user = User(
        username="Hyndavi",
        welcome_message="Welcome Back 👋",
        subtitle="Healthcare made simpler."
    )
    db.add(user)

# ---------- PRESCRIPTIONS ----------
if db.query(Prescription).count() == 0:
    db.add_all([
        Prescription(
            title="Blood Test Report",
            language="Hindi",
            status="Completed",
            date="Yesterday"
        ),
        Prescription(
            title="Diabetes Prescription",
            language="Tamil",
            status="Completed",
            date="2 days ago"
        )
    ])

# ---------- NOTIFICATIONS ----------
if db.query(Notification).count() == 0:
    db.add_all([
        Notification(
            message="Medicine reminder",
            time="10 min ago"
        ),
        Notification(
            message="Doctor appointment tomorrow",
            time="1 hour ago"
        ),
        Notification(
            message="Prescription processed",
            time="Yesterday"
        )
    ])

db.commit()
db.close()

print("✅ Sample data inserted successfully!")