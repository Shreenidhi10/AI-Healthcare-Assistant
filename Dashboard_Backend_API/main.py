from fastapi import FastAPI
from app.routes.dashboard import router

from app.database.database import Base, engine

# Create all database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Dashboard Backend API",
    description="Backend APIs for AI Healthcare Communication Assistant",
    version="1.0.0"
)

app.include_router(router)


@app.get("/")
def home():
    return {
        "message": "Dashboard Backend API is running successfully!"
    }