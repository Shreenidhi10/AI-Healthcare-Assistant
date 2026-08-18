# Medical History Backend Service

A standalone **Python FastAPI microservice** for prescription processing and medical history management.

It integrates:
- **PaddleOCR & PyMuPDF (`fitz`)**: For real text extraction from prescription images and PDFs.
- **Regex & Keyword Post-processing (`text_cleaner.py`)**: For clean reading-order reconstruction and pattern matching.
- **BioClinicalBERT (`nlp_service.py`)**: For clinical entity classification (medicines, dosage, frequency, duration, doctor name, patient name, diagnosis, lab tests).
- **MongoDB Atlas (`Motor` async driver)**: For persistence into the `medical_history` collection.

---

## 1. Directory Structure

```
backend/medical_history_backend/
│
├── app/
│   ├── config.py             # Centralised settings (.env loader, model paths, thresholds)
│   ├── database.py           # Async MongoDB Motor connection & fallback store
│   ├── history_routes.py     # Medical History REST API endpoints (/upload, GET, GET/:id, DELETE/:id)
│   ├── main.py               # FastAPI application entrypoint & startup lifecycles
│   ├── routes.py             # Base extraction routes (/extract, /health)
│   ├── schemas.py            # Pydantic data schemas for requests and responses
│   │
│   ├── services/             # Core Processing Services
│   │   ├── ocr_service.py    # PaddleOCR & PyMuPDF text extraction engine
│   │   ├── nlp_service.py    # BioClinicalBERT NER token classifier & regex matcher
│   │   └── pipeline.py       # Orchestrator (validate -> OCR -> clean -> NLP -> persist)
│   │
│   └── utils/                # I/O & Preprocessing Utilities
│       ├── exceptions.py     # Domain-specific exception hierarchy
│       ├── file_utils.py     # File validation & OpenCV/PyMuPDF decoding
│       ├── logger.py         # Standardised logging configuration
│       └── text_cleaner.py   # OCR text normalization & regex matchers
│
├── .env                      # Environment configuration
├── .env.example              # Template environment file
├── requirements.txt          # Python package dependencies
├── test_e2e.py               # Automated end-to-end API test script
└── README.md                 # Service documentation
```

---

## 2. Prerequisites & Installation

### Requirements
- Python **3.10+** (Python 3.12 recommended)
- MongoDB Atlas cluster URI (or local MongoDB instance)

### Installation Steps

1. Navigate to the backend directory:
   ```bash
   cd backend/medical_history_backend
   ```

2. (Optional) Create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   # On Windows (PowerShell):
   .\venv\Scripts\Activate.ps1
   # On Linux/macOS:
   source venv/bin/activate
   ```

3. Install required Python packages:
   ```bash
   pip install -r requirements.txt
   ```

---

## 3. Environment Variables (`.env`)

Create a `.env` file in `backend/medical_history_backend/` (or copy `.env.example`):

```env
# Application Settings
ENV=development
APP_NAME="Medical AI API"
APP_VERSION="1.0.0"

# MongoDB Atlas Connection
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/?retryWrites=true&w=majority
DB_NAME=healthcare_ai
COLLECTION_NAME=medical_history

# OCR Settings (PaddleOCR)
OCR_LANGUAGE=en
OCR_USE_ANGLE_CLS=True
OCR_USE_GPU=False
OCR_MIN_CONFIDENCE=0.50

# NLP Settings (BioClinicalBERT)
NLP_MODEL_NAME=emilyalsentzer/Bio_ClinicalBERT
NLP_MAX_TOKEN_LENGTH=512
NLP_MAX_INPUT_CHARS=4000

# Upload Constraints
MAX_FILE_SIZE_MB=25
ALLOWED_EXTENSIONS=.jpg,.jpeg,.png,.pdf
ALLOWED_MIME_TYPES=image/jpeg,image/png,application/pdf
```

---

## 4. Running the Service

Start the FastAPI application with `uvicorn`:

```bash
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

The service will start on **`http://localhost:8000`**.

### Swagger UI & Postman Testing
- **Interactive Swagger Documentation**: Open `http://localhost:8000/docs` in your browser to test endpoints interactively.
- **OpenAPI Schema**: `http://localhost:8000/openapi.json`

---

## 5. REST API Endpoints

### 1. Upload & Process Prescription
- **Route**: `POST /api/medical-history/upload`
- **Content-Type**: `multipart/form-data`
- **Body**: `file` (image/jpeg, image/png, application/pdf)
- **Description**: Uploads prescription file, runs PaddleOCR text extraction, regex cleaning, and BioClinicalBERT NLP entity extraction, persists structured document to MongoDB `medical_history` collection, and returns saved JSON.

#### Sample Request (cURL):
```bash
curl -X POST "http://localhost:8000/api/medical-history/upload" \
  -H "accept: application/json" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@/path/to/prescription.pdf"
```

#### Sample Response (`201 Created`):
```json
{
  "success": true,
  "message": "Prescription processed and saved successfully.",
  "data": {
    "id": "6a69eff5446eab529f097d07",
    "userId": "demo-user",
    "filename": "prescription.pdf",
    "fileType": "pdf",
    "originalOCRText": "Rx: Tab Paracetamol 500mg\nTake 1 tablet after meals for fever.\nDr. Sharma",
    "ocrConfidence": 1.0,
    "language": "en",
    "medication": "Paracetamol",
    "doctor": "Dr. Sharma",
    "doctorName": "Dr. Sharma",
    "patientName": "",
    "hospital": "",
    "medicines": [
      {
        "name": "Paracetamol",
        "dosage": "500mg",
        "frequency": "after meals",
        "frequency_human": "after meals",
        "duration": "",
        "form": "tablet",
        "route": "oral"
      }
    ],
    "disease": [],
    "diagnosis": [],
    "symptoms": ["fever"],
    "labTests": [],
    "status": ["Processed"],
    "processingStatus": "completed",
    "processingTime": 1.45,
    "ocrTime": 1.10,
    "nlpTime": 0.35,
    "createdAt": "2026-07-29T17:45:00.000Z",
    "updatedAt": "2026-07-29T17:45:00.000Z"
  }
}
```

---

### 2. List All Medical History Records
- **Route**: `GET /api/medical-history`
- **Description**: Returns all saved prescription records from MongoDB sorted newest first.

#### Sample Response (`200 OK`):
```json
{
  "success": true,
  "count": 1,
  "data": [
    {
      "id": "6a69eff5446eab529f097d07",
      "userId": "demo-user",
      "filename": "prescription.pdf",
      "medication": "Paracetamol",
      "doctorName": "Dr. Sharma",
      "originalOCRText": "Rx: Tab Paracetamol 500mg...",
      "createdAt": "2026-07-29T17:45:00.000Z"
    }
  ]
}
```

---

### 3. Get Prescription Details by ID
- **Route**: `GET /api/medical-history/{id}`
- **Description**: Retrieves a single prescription record by MongoDB ObjectId.

#### Sample Response (`200 OK`):
```json
{
  "success": true,
  "data": {
    "id": "6a69eff5446eab529f097d07",
    "filename": "prescription.pdf",
    "originalOCRText": "Rx: Tab Paracetamol 500mg\nTake 1 tablet after meals for fever.\nDr. Sharma",
    "medicines": [
      {
        "name": "Paracetamol",
        "dosage": "500mg"
      }
    ],
    "doctorName": "Dr. Sharma"
  }
}
```

---

### 4. Delete Record by ID
- **Route**: `DELETE /api/medical-history/{id}`
- **Description**: Deletes a prescription record from MongoDB by ObjectId.

#### Sample Response (`200 OK`):
```json
{
  "success": true,
  "message": "Record deleted successfully."
}
```

---

## 6. Execution Flow Architecture

```
Upload Request (POST /api/medical-history/upload)
        ↓
File Validation (validate_upload - file_utils.py)
        ↓
PaddleOCR / PyMuPDF Image & Text Extraction (extract_text - ocr_service.py)
        ↓
Regex Text Cleaning & Confidence Filtering (clean_ocr_text - text_cleaner.py)
        ↓
BioClinicalBERT NLP & Entity Classification (extract_entities - nlp_service.py)
        ↓
Document Structuring & Metadata Assembly (history_routes.py)
        ↓
MongoDB Persistence ('medical_history' collection - database.py)
        ↓
JSON Response Output (ExtractResponse schema - schemas.py)
```

---

## 7. Automated E2E Testing

Run the included automated verification script to test all REST APIs against live MongoDB:

```bash
python test_e2e.py
```
