from sqlalchemy import Column, Integer, String
from app.database.database import Base

class Prescription(Base):
    __tablename__ = "prescriptions"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    language = Column(String)
    status = Column(String)
    date = Column(String)