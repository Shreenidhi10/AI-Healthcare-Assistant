# 🏥 Healthcare Backend API

A secure and scalable RESTful backend for an AI-powered Healthcare OCR and Medical Report Management System built with FastAPI. The backend provides OCR-based document processing, AI-driven medical entity extraction, patient-friendly prescription summaries, report simplification, translation, dashboard analytics, authentication, and notification management.

---

# Features

- JWT Authentication (Access & Refresh Tokens)
- Google OAuth Login
- User Registration & Login
- Patient Profile Management
- Medical History CRUD
- OCR Medical Report Processing
- AI-based Medical Entity Extraction
- Patient-Friendly Prescription Summary
- Medical Report Simplification
- Medical Report Translation
- Dashboard APIs
- Notification APIs
- Contact API
- Health Check API
- Swagger/OpenAPI Documentation
- SQLite (Development)
- Production-ready FastAPI architecture

---

# Tech Stack

- FastAPI
- Python 3.11+
- SQLAlchemy
- Pydantic
- SQLite
- JWT Authentication
- Google Auth Library
- Google Identity Services
- PaddleOCR
- HuggingFace Transformers
- AI-based Medical Entity Extraction
- Custom Medical NLP Pipeline
- Uvicorn

---

# Project Structure

backend/
```
app/
├── api/
├── core/
├── database/
├── models/
├── routers/
├── schemas/
├── services/
├── utils/
├── main.py
tests/
requirements.txt
README.md
```

---

# Installation

## Clone Repository

```bash
git clone <repository-url>
cd healthcare-backend/backend
```

## Create Virtual Environment

Windows

```bash
python -m venv .venv
.venv\Scripts\activate
```

Linux / macOS

```bash
python3 -m venv .venv
source .venv/bin/activate
```

---

## Install Dependencies

```bash
pip install -r requirements.txt
```

---

# Environment Variables

Create a `.env` file.

Example:

```env
ENV=development

SECRET_KEY=your_secret_key
REFRESH_SECRET_KEY=your_refresh_secret_key

ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

DATABASE_URL=sqlite:///./healthcare.db

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret

OCR_ALLOW_STUB_ENGINE=True
```

---

# Run the Application

```bash
uvicorn app.main:app --reload
```

Server

```
http://127.0.0.1:8000
```

Swagger

```
http://127.0.0.1:8000/docs
```

ReDoc

```
http://127.0.0.1:8000/redoc
```

---

# API Modules

## Authentication

- Register
- Login
- Google OAuth Login
- Refresh Token
- Logout
- Change Password
- User Profile
- Update Preferred Language

---

## Google OAuth

> **Important**
>
> The `/auth/google` endpoint expects a valid **Google ID Token**, **not** a Google Access Token. The frontend should send `credentialResponse.credential` obtained from Google Identity Services.

### Endpoint

```http
POST /api/v1/auth/google
```

### Request

```json
{
  "id_token": "<Google ID Token>"
}
```

### Success Response

```json
{
  "access_token": "<jwt_access_token>",
  "refresh_token": "<jwt_refresh_token>",
  "token_type": "bearer"
}
```

### Description

The frontend authenticates the user using **Google Identity Services (GIS)** and sends the Google ID Token (`credentialResponse.credential`) to this endpoint.

The backend:

1. Verifies the Google ID Token.
2. Validates the token audience using `GOOGLE_CLIENT_ID`.
3. Finds an existing user or creates a new user.
4. Generates JWT access and refresh tokens.
5. Returns JWT access and refresh tokens for authenticated API access.

---

# Frontend Integration

## Backend Base URL

```
http://127.0.0.1:8000/api/v1
```

## Prerequisites

The frontend must configure Google Identity Services (GIS) using the same `GOOGLE_CLIENT_ID` configured in the backend environment.

## Authentication Endpoints

| Method | Endpoint |
|---------|----------|
| POST | /auth/register |
| POST | /auth/login-json |
| POST | /auth/google |
| POST | /auth/refresh |
| POST | /auth/logout |
| GET | /auth/profile |

## Google Sign-In Flow

1. Authenticate the user using **Google Identity Services (GIS)**.
2. Obtain the Google ID Token:

```javascript
credentialResponse.credential
```

3. Send it to:

```http
POST /api/v1/auth/google
```

Request Body:

```json
{
  "id_token": "<Google ID Token>"
}
```

4. If the token is valid, the backend returns:

```json
{
  "access_token": "<jwt_access_token>",
  "refresh_token": "<jwt_refresh_token>",
  "token_type": "bearer"
}
```

5. Store the returned JWT tokens securely.
6. Include the access token in every protected API request.

Authorization Header:

```http
Authorization: Bearer <access_token>
```

---

## Patient Profile

- Get Profile
- Update Profile

---

## Medical History

- Create Medical History
- List Medical History
- Update Medical History
- Delete Medical History

---

## OCR & Medical Reports

- Upload Medical Report
- OCR Extraction
- AI Medical Entity Extraction
- Patient-Friendly Prescription Summary
- List Reports
- Get Report
- Delete Report
- Simplified Report
- Translate Report

---

# Patient-Friendly Prescription Summary

After OCR and AI-based medical entity extraction, the backend automatically generates a structured, patient-friendly prescription summary. The summary converts extracted medical information into simple instructions that are easier for patients and caregivers to understand.

The generated summary includes:

- Patient Name
- Document Type
- Medicines
- Dosage
- Frequency
- Duration
- Route of Administration
- Medication Instructions
- General Warnings
- Follow-up Advice
- Easy-to-read Prescription Summary

Example Response

```json
{
  "prescription_summary": {
    "patient_name": "Ramesh Kumar",
    "document_type": "Prescription",
    "medicines": [
      {
        "name": "Metformin",
        "dosage": "500 mg",
        "frequency": "Twice Daily",
        "duration": "30 days",
        "route": "Oral"
      }
    ],
    "instructions": [
      "Take Metformin twice daily."
    ],
    "warnings": [
      "Complete the prescribed course.",
      "Do not skip doses.",
      "Consult your doctor if symptoms persist."
    ],
    "follow_up": "Follow your doctor's advice and attend follow-up visits if prescribed.",
    "summary": "Prescription contains the following medicines..."
  }
}
```

---

## Simplification

- Simplify Medical Text

---

## Translation

- Translate Medical Text

---

## Dashboard

- Dashboard Summary
- Notifications
- Mark Notification Read

---

## Languages

- Supported Languages

---

## Contact

- Contact Form
- Contact Messages

---

## Health

- Health Check Endpoint

---

# Authentication

Protected APIs require JWT authentication.

Authorization Header

```
Authorization: Bearer <access_token>
```

---

# Running Tests

Run all tests

```bash
pytest
```

Run with coverage

```bash
pytest --cov=app
```

---

# Swagger Testing

Swagger UI

```
http://127.0.0.1:8000/docs
```

The backend has been verified using Swagger UI.

Verified Modules

- Health
- Contact
- Authentication (JWT)
- Patient Profile
- Medical History
- OCR Reports
- AI Medical Entity Extraction
- Patient-Friendly Prescription Summary
- Simplification
- Translation
- Languages
- Dashboard
- Notifications

> **Note:** Google OAuth endpoint has been implemented and is ready for frontend integration testing.

---

# Test Summary

## Swagger Verification

| Item | Status |
|------|--------|
| Total APIs | 31 |
| End-to-End Tests | 64 |
| Passed | ✅ 64 |
| Failed | ❌ 0 |

---

# Issues Fixed During Testing

- UUID validation improved
- OCR fallback engine implemented
- OCR report deletion dependency fix
- Production JWT validation
- Production OCR safety validation
- Patient-Friendly Prescription Summary integration
- Prescription summary persistence in database
- OCR response schema updated with prescription summary

---

# Production Configuration

Before deploying:

- Configure secure JWT secrets.
- Configure Google OAuth credentials.
- Use PostgreSQL or MySQL instead of SQLite.
- Install PaddleOCR and required model files.
- Disable the OCR stub engine.
- Enable HTTPS.

Set:

```env
ENV=production

SECRET_KEY=your_secret_key
REFRESH_SECRET_KEY=your_refresh_secret_key

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

OCR_ALLOW_STUB_ENGINE=False
```

---

# Development Notes

Development uses:

- SQLite Database
- Stub OCR (optional)
- Custom Medical NLP Pipeline
- Patient-Friendly Prescription Summary
- FastAPI Swagger UI

Production should use:

- PostgreSQL/MySQL
- Alembic Migrations
- Real OCR Engine
- Secure Environment Variables
- HTTPS
- Logging & Monitoring

---

# API Response Codes

| Code | Meaning |
|------|----------|
| 200 | Success |
| 201 | Created |
| 204 | Deleted |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 422 | Validation Error |
| 500 | Internal Server Error |

---

# License

This project is intended for educational and healthcare application development purposes.

---

# Author

Healthcare Backend API

Built using FastAPI ❤️