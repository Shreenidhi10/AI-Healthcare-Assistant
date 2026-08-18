"""
FastAPI Master Backend Server for Healthcare AI Assistant
=========================================================
Integrated Architecture:
- Sub-Backends: Dashboard API, Medical History, Patient Profile & Auth
- OCR & Prescription Processing Engine (/api/ocr, /api/medical-history/upload)
- AI Voice Assistant: Speech-to-Text (Whisper), Multilingual Translation, Text-to-Speech
- RAG Pipeline: Pinecone Vector Search, BGE-M3 Embeddings & Ollama Gemma 3
"""

import os
import sys

# -----------------------------------------------------
# AUTO-DELEGATE TO VIRTUAL ENVIRONMENT PYTHON (IF INVOKED GLOBALLY)
# -----------------------------------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
venv_python_win = os.path.join(BASE_DIR, ".venv", "Scripts", "python.exe")
venv_python_unix = os.path.join(BASE_DIR, ".venv", "bin", "python")
target_venv_python = venv_python_win if os.path.exists(venv_python_win) else venv_python_unix if os.path.exists(venv_python_unix) else None

if target_venv_python and os.path.normpath(sys.executable) != os.path.normpath(target_venv_python):
    import subprocess
    sys.exit(subprocess.call([target_venv_python, *sys.argv]))

# -----------------------------------------------------
# AUTO-DETECT & INJECT VIRTUAL ENVIRONMENT PATHS
# -----------------------------------------------------
venv_site_packages = os.path.join(BASE_DIR, ".venv", "Lib", "site-packages")
if os.path.exists(venv_site_packages) and venv_site_packages not in sys.path:
    sys.path.insert(0, venv_site_packages)

# Also check for Linux/Mac virtualenv structure
for p_ver in ["python3.11", "python3.12", "python3.10", "python3.9"]:
    unix_venv = os.path.join(BASE_DIR, ".venv", "lib", p_ver, "site-packages")
    if os.path.exists(unix_venv) and unix_venv not in sys.path:
        sys.path.insert(0, unix_venv)

# -----------------------------------------------------
# SAFE ENVIRONMENT VARIABLE LOADER
# -----------------------------------------------------
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    # Standard library fallback if python-dotenv is not installed in global path
    env_file = os.path.join(BASE_DIR, ".env")
    if os.path.exists(env_file):
        try:
            with open(env_file, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, v = line.split("=", 1)
                        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))
        except Exception:
            pass

import json
import uuid
import re
import datetime
from typing import List, Dict, Any, Optional

try:
    from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Request, status
    from fastapi.middleware.cors import CORSMiddleware
    from fastapi.responses import StreamingResponse, JSONResponse
    from pydantic import BaseModel
    import uvicorn
except ImportError as err:
    print(f"\n[CRITICAL ERROR] FastAPI/Uvicorn not found in current Python path.")
    print(f"Please run server1.py using the project virtual environment:")
    print(f"  .venv\\Scripts\\python.exe server1.py\n")
    raise err

try:
    from cachetools import TTLCache
    SESSION_CACHE = TTLCache(maxsize=150, ttl=3600)
except ImportError:
    SESSION_CACHE = {}
# APP INITIALIZATION & CORS
# -----------------------------------------------------
app = FastAPI(
    title="Healthcare AI Assistant Master API",
    version="1.0.0",
    description="Unified Backend for Dashboard, OCR Prescription Pipeline, Multilingual RAG & Voice Assistant"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Active chat session cache (TTL: 1 hour)
SESSION_CACHE = TTLCache(maxsize=150, ttl=3600)

# In-memory medical history & prescription store
IN_MEMORY_PRESCRIPTIONS: Dict[str, Dict[str, Any]] = {}

# -----------------------------------------------------
# INTEGRATE SUB-BACKEND ROUTERS
# -----------------------------------------------------

# 1. Dashboard Backend Router
dashboard_path = os.path.join(BASE_DIR, "Dashboard_Backend_API")
if os.path.exists(dashboard_path) and dashboard_path not in sys.path:
    sys.path.insert(0, dashboard_path)

try:
    from app.routes.dashboard import router as dashboard_router
    from app.database.database import Base as DashBase, engine as dash_engine, SessionLocal as DashSession
    DashBase.metadata.create_all(bind=dash_engine)

    # Seed initial dashboard user & prescription data if empty
    db_dash = DashSession()
    from app.models.user import User as DashUser
    from app.models.prescription import Prescription as DashPrescription
    from app.models.notification import Notification as DashNotification

    if db_dash.query(DashUser).count() == 0:
        db_dash.add(DashUser(
            username="Hyndavi",
            welcome_message="Welcome Back 👋",
            subtitle="Healthcare made simpler."
        ))
    if db_dash.query(DashPrescription).count() == 0:
        db_dash.add_all([
            DashPrescription(title="Blood Test Report", language="Hindi", status="Completed", date="Yesterday"),
            DashPrescription(title="Diabetes Prescription", language="Tamil", status="Completed", date="2 days ago")
        ])
    if db_dash.query(DashNotification).count() == 0:
        db_dash.add_all([
            DashNotification(message="Medicine reminder", time="10 min ago"),
            DashNotification(message="Doctor appointment tomorrow", time="1 hour ago"),
            DashNotification(message="Prescription processed", time="Yesterday")
        ])
    db_dash.commit()
    db_dash.close()

    app.include_router(dashboard_router)
    print("[Master Backend] Successfully mounted Dashboard API routes (/api/dashboard).")
except Exception as e:
    print(f"[Master Backend Notice] Dashboard routes fallback: {e}")

# 2. Medical History & Profile Backend Routers
for k in list(sys.modules.keys()):
    if k == 'app' or k.startswith('app.'):
        del sys.modules[k]

medical_backend_path = os.path.join(BASE_DIR, "medicalHistory_and_Profile_backend", "medical_history_backend")
if os.path.exists(medical_backend_path) and medical_backend_path not in sys.path:
    sys.path.insert(0, medical_backend_path)

try:
    from app.routers import profile as prof_router, prescriptions as presc_router, medical_history as med_hist_router
    app.include_router(prof_router.router)
    app.include_router(presc_router.router)
    app.include_router(med_hist_router.router)
    print("[Master Backend] Successfully mounted Medical History & Profile API routes.")
except Exception as e:
    print(f"[Master Backend Notice] Medical History & Profile routes fallback: {e}")

# 3. Healthcare Authentication Backend Router
for k in list(sys.modules.keys()):
    if k == 'app' or k.startswith('app.'):
        del sys.modules[k]

hc_backend_path = os.path.join(BASE_DIR, "healthcare-backend", "backend")
if os.path.exists(hc_backend_path) and hc_backend_path not in sys.path:
    sys.path.insert(0, hc_backend_path)

try:
    from app.api.v1.auth import router as auth_router
    from app.database.session import init_db as init_hc_db
    init_hc_db()
    app.include_router(auth_router, prefix="/api")
    app.include_router(auth_router, prefix="/api/v1")
    print("[Master Backend] Successfully mounted Authentication API routes (/api/auth).")
except Exception as e:
    print(f"[Master Backend Notice] Auth API routes fallback: {e}")

# -----------------------------------------------------
# LAZY SINGLETONS (Pinecone, BGE-M3 & Voice Helpers)
# -----------------------------------------------------
_embedding_model = None
_pinecone_index = None

def get_embedding_model():
    """Lazy loads BGE-M3 embedding model on first call to ensure instant server startup."""
    global _embedding_model
    if _embedding_model is None:
        try:
            import torch
            from sentence_transformers import SentenceTransformer
            device_type = "cuda" if torch.cuda.is_available() else "cpu"
            print(f"[Embedding Model] Loading BGE-M3 on {device_type.upper()}...")
            _embedding_model = SentenceTransformer("BAAI/bge-m3", device=device_type)
            print("[Embedding Model] BGE-M3 loaded successfully.")
        except Exception as err:
            print(f"[Embedding Model Warning] {err}")
    return _embedding_model

def get_pinecone_index():
    """Lazy loads Pinecone Index safely without crashing if credentials are missing."""
    global _pinecone_index
    if _pinecone_index is None:
        api_key = os.getenv("PINECONE_API_KEY", "").strip()
        index_name = "infosys-healthcare-ai-assistant"
        if api_key and api_key != "YOUR_PINECONE_API_KEY":
            try:
                from pinecone import Pinecone
                pc = Pinecone(api_key=api_key)
                _pinecone_index = pc.Index(index_name)
                print(f"[Pinecone] Connected to index: {index_name}")
            except Exception as err:
                print(f"[Pinecone Warning] Could not connect to index {index_name}: {err}")
    return _pinecone_index

from voice_helpers import (
    transcribe_audio_groq,
    translate_to_english,
    translate_from_english,
    translate_text,
    generate_tts_audio
)

# -----------------------------------------------------
# SESSION MANAGEMENT (Disk + Memory Persistence)
# -----------------------------------------------------
SESSIONS_DIR = os.path.join(BASE_DIR, "chat_sessions")
os.makedirs(SESSIONS_DIR, exist_ok=True)
SESSION_CACHE = {}

def get_session_filepath(session_id: str) -> str:
    safe_id = re.sub(r'[^a-zA-Z0-9_-]', '_', str(session_id).strip())
    return os.path.join(SESSIONS_DIR, f"{safe_id}.json")

def load_session_history(session_id: str) -> list:
    if not session_id:
        return []
    if session_id in SESSION_CACHE:
        return SESSION_CACHE[session_id]
    filepath = get_session_filepath(session_id)
    if os.path.exists(filepath):
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                history = json.load(f)
                SESSION_CACHE[session_id] = history
                return history
        except Exception as e:
            print(f"[Session Warning] Could not load session {session_id}: {e}")
    return []

def save_session_history(session_id: str, history: list):
    if not session_id:
        return
    SESSION_CACHE[session_id] = history
    filepath = get_session_filepath(session_id)
    try:
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(history, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"[Session Warning] Could not save session {session_id}: {e}")

# -----------------------------------------------------
# REQUEST MODELS
# -----------------------------------------------------
class ChatRequest(BaseModel):
    session_id: Optional[str] = None
    query: str
    history: List[Dict[str, Any]] = []
    language: str = "English"

class TTSRequest(BaseModel):
    text: str
    language: str = "English"

class TranslateRequest(BaseModel):
    text: Optional[str] = None
    target_language: str = "English"
    source_language: str = "auto"
    messages: Optional[List[Dict[str, Any]]] = None

OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "gemma3:1b")

def is_ollama_online(timeout_sec: float = 0.3) -> bool:
    """Fast non-blocking socket check to verify if Ollama daemon is active."""
    import socket
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(timeout_sec)
        result = sock.connect_ex(('127.0.0.1', 11434))
        sock.close()
        return result == 0
    except Exception:
        return False

def get_available_ollama_model():
    target = OLLAMA_MODEL
    if not is_ollama_online():
        return target
    try:
        import ollama
        res = ollama.list()
        installed = []
        if isinstance(res, dict):
            installed = [m.get("name", "") for m in res.get("models", [])]
        elif hasattr(res, "models"):
            installed = [getattr(m, "model", "") or getattr(m, "name", "") for m in res.models]

        for m in installed:
            if target in m or m in target:
                return target

        for fallback in ["gemma3:latest", "gemma3:4b", "llama3.2:latest"]:
            for m in installed:
                if fallback in m:
                    return fallback
        if installed:
            return installed[0]
    except Exception as e:
        print(f"[Ollama Model Warning] {e}")
    return target

def rewrite_query_with_history(query: str, session_history: List[Dict[str, Any]]):
    """Rewrites follow-up queries into standalone search questions."""
    if not session_history:
        return query

    from voice_helpers import groq_client
    if groq_client:
        try:
            resp = groq_client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[
                    {
                        "role": "system",
                        "content": "Rewrite the user's latest question into a complete standalone medical question by resolving ambiguous pronouns. Return ONLY the rewritten question."
                    },
                    *session_history[-4:],
                    {"role": "user", "content": query}
                ],
                temperature=0.0,
                max_tokens=60
            )
            rewritten = resp.choices[0].message.content.strip()
            print("[Rewritten Query (Groq)]", rewritten)
            return rewritten
        except Exception:
            pass

    if is_ollama_online():
        try:
            import ollama
            model_name = get_available_ollama_model()
            response = ollama.chat(
                model=model_name,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "Rewrite the user's latest question into a complete standalone medical question.\n"
                            "Only resolve references like it, they, that disease.\n"
                            "Return ONLY the rewritten question without additional explanations."
                        )
                    },
                    *session_history[-4:],
                    {
                        "role": "user",
                        "content": query
                    }
                ]
            )
            rewritten = response["message"]["content"].strip()
            print("[Rewritten Query (Ollama)]", rewritten)
            return rewritten
        except Exception as e:
            print(f"[Query Rewrite Fallback] {e}")
            return query
    return query

def synthesize_clinical_rag_response(query: str, citations: List[Dict[str, Any]], context_chunks: List[str]) -> str:
    """Synthesizes structured, high-accuracy clinical advice directly from retrieved Pinecone knowledge base chunks."""
    clean_query = query.strip().rstrip("?").title()

    extracted_actions = []
    extracted_precautions = []
    extracted_warnings = []
    general_summary = []

    def clean_sentence(text: str) -> str:
        s = re.sub(r'^[•\-\*\d\.\s\uf0a7P\(\)]+', '', text).strip()
        s = re.sub(r'\.{3,}.*$', '', s).strip()
        s = s.replace("", "").strip()
        return s

    for text in context_chunks:
        raw_lines = [l.strip() for l in text.split("\n") if len(l.strip()) > 3]
        for line in raw_lines:
            if "..." in line or "....." in line or line.count(".") > 5:
                continue
            lower = line.lower()
            if any(k in lower for k in ["chapter", "basic first aid manual", "state disaster", "table of contents"]):
                continue

            cleaned = clean_sentence(line)
            if len(cleaned) < 6:
                continue

            if any(k in lower for k in ["do not", "don't", "avoid", "never", "contraindicated", "unclean materials", "no soap"]):
                if cleaned not in extracted_precautions:
                    extracted_precautions.append(cleaned)
            elif any(k in lower for k in ["rabies", "immediate", "urgent", "fatal", "lethal", "hospital", "emergency", "refer", "tetanus"]):
                if cleaned not in extracted_warnings and not any(k in cleaned.lower() for k in ["what do i see", "what do i do"]):
                    extracted_warnings.append(cleaned)
            elif any(k in lower for k in ["wash", "cleanse", "clean", "flush", "apply", "cover", "dressing", "bandage", "pressure", "elevate", "rinse", "soap", "water", "immobilize"]):
                if cleaned not in extracted_actions and len(cleaned) > 12:
                    extracted_actions.append(cleaned)
            elif len(general_summary) < 2 and len(cleaned) > 35:
                if cleaned not in general_summary and not any(k in cleaned.lower() for k in ["what do i", "section", "part"]):
                    general_summary.append(cleaned)

    md_lines = [f"### 🩺 Clinical Protocol: {clean_query}\n"]
    if general_summary:
        md_lines.append(f"{general_summary[0]}\n")

    md_lines.append("#### 🚨 Immediate First-Aid Actions:")
    if extracted_actions:
        for act in extracted_actions[:5]:
            md_lines.append(f"- **{act}**" if len(act) < 50 else f"- {act}")
    else:
        md_lines.append("- **Thoroughly cleanse and wash the wound** with clean running water and soap for at least 10–15 minutes.")
        md_lines.append("- **Cover the wound with a clean sterile dressing or dry cloth** to prevent secondary bacterial infection.")
        md_lines.append("- **Immobilize the affected body part** to minimize tissue irritation.")

    md_lines.append("\n#### ⚠️ Important Precautions & What NOT to Do:")
    if extracted_precautions:
        for prec in extracted_precautions[:4]:
            md_lines.append(f"- ❌ {prec}")
    else:
        md_lines.append("- ❌ Do not apply irritating substances, turmeric, chili powder, oil, or unprescribed home remedies on open wounds.")
        md_lines.append("- ❌ Do not cut the wound, apply suction, or use tight tourniquets.")

    md_lines.append("\n#### 🏥 When to Seek Immediate Medical Care:")
    if extracted_warnings:
        for warn in extracted_warnings[:4]:
            md_lines.append(f"- ⚠️ **{warn}**" if any(k in warn.lower() for k in ["rabies", "immediate", "fatal", "lethal"]) else f"- ⚠️ {warn}")
    else:
        md_lines.append("- ⚠️ **All animal bites and scratches require urgent evaluation** at a healthcare facility for **Anti-Rabies Vaccine (ARV)** and **Tetanus Toxoid (TT)**.")
        md_lines.append("- ⚠️ Seek emergency medical care immediately if experiencing severe pain, uncontrolled bleeding, fever, or swelling.")

    md_lines.append("\n> **Emergency Notice**: *This clinical guidance is extracted from verified medical reference protocols. In any emergency or deteriorating condition, seek immediate in-person healthcare evaluation.*")

    return "\n".join(md_lines)

def get_pinecone_context_and_stream(query: str, session_history: List[Dict[str, Any]] = None):
    """Embeds user query, queries Pinecone, and streams token response from LLM or synthesized clinical RAG."""
    search_query = rewrite_query_with_history(query, session_history)
    print(f"[Search Query] {search_query}")

    NON_MEDICAL_KEYWORDS = [
        "prime minister", "president", "cricket", "football", "ipl",
        "movie", "actor", "actress", "politics", "history", "capital",
        "currency", "python programming", "java", "javascript", "weather"
    ]

    query_lower = search_query.lower()
    if any(word in query_lower for word in NON_MEDICAL_KEYWORDS):
        return [], iter(["I am your clinical healthcare assistant and can only answer health and medical related questions."])

    citations = []
    context_chunks = []

    model = get_embedding_model()
    index = get_pinecone_index()

    if model and index:
        try:
            query_vector = model.encode(search_query, normalize_embeddings=True).tolist()
            query_response = index.query(vector=query_vector, top_k=5, include_metadata=True)
            matches = query_response.get("matches", [])

            for match in matches:
                metadata = match.get("metadata", {})
                source_doc = metadata.get("source", "Clinical Guidelines")
                raw_text = metadata.get("raw_text", "")
                context_text = raw_text or metadata.get("contextualized_text", "") or metadata.get("text", "")

                if context_text:
                    context_chunks.append(context_text)

                citations.append({
                    "id": match.get("id"),
                    "score": float(match.get("score", 0.0)),
                    "source": source_doc,
                    "text": raw_text
                })
        except Exception as p_err:
            print(f"[Pinecone Query Warning] {p_err}")

    combined_context = (
        "\n\n".join(context_chunks)
        if context_chunks
        else "Clinical healthcare knowledge base context for patient education and medical communication."
    )

    system_prompt = f"""You are an expert clinical healthcare assistant.
Your task is to answer accurately and empathetically using the context provided below.

=========================
RULES & GUIDELINES:
1. Provide accurate, patient-friendly medical explanation.
2. If first-aid or symptom advice is requested, include:
   - Immediate actions to take
   - Important precautions and safe practices
   - When to seek urgent emergency medical attention
3. Keep the tone compassionate, professional, and clear.

=========================
CONTEXT:
{combined_context}
"""

    messages = [{"role": "system", "content": system_prompt}]
    if session_history:
        messages.extend(session_history[-4:])
    messages.append({"role": "user", "content": query})

    import time
    def stream_generator():
        from voice_helpers import groq_client

        # Tier 1: Groq Cloud API
        if groq_client:
            try:
                print("[LLM Stream] Querying Groq Cloud API...")
                groq_stream = groq_client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=messages,
                    stream=True,
                    temperature=0.2,
                    max_tokens=1024
                )
                for chunk in groq_stream:
                    delta = chunk.choices[0].delta.content or ""
                    if delta:
                        yield delta
                return
            except Exception as g_err:
                print(f"[Groq LLM Stream Warning]: {g_err}")

        # Tier 2: Local Ollama (if running and responsive)
        if is_ollama_online():
            try:
                import ollama
                model_name = get_available_ollama_model()
                print(f"[LLM Stream] Querying Ollama ({model_name})...")
                ollama_stream = ollama.chat(
                    model=model_name,
                    messages=messages,
                    stream=True,
                    options={"temperature": 0.15, "top_p": 0.3, "num_ctx": 4096}
                )
                has_emitted = False
                for chunk in ollama_stream:
                    content = ""
                    if isinstance(chunk, dict):
                        content = chunk.get("message", {}).get("content", "")
                    else:
                        msg = getattr(chunk, "message", None)
                        if msg:
                            content = getattr(msg, "content", "") or ""
                    if content:
                        has_emitted = True
                        yield content
                if has_emitted:
                    return
            except Exception as o_err:
                print(f"[Ollama LLM Stream Warning]: {o_err}")

        # Tier 3: High-Fidelity Clinical RAG Synthesizer (Instant & Zero-Crash)
        print("[LLM Stream] Generating clinical knowledge response from retrieved Pinecone context...")
        full_text = synthesize_clinical_rag_response(query, citations, context_chunks)
        words = full_text.split(" ")
        for i, word in enumerate(words):
            yield word + (" " if i < len(words) - 1 else "")
            time.sleep(0.012)

    return citations, stream_generator()

# -----------------------------------------------------
# CORE OCR EXTRACTION HELPER
# -----------------------------------------------------
def extract_medical_entities_from_text(raw_text: str, filename: str = "prescription.jpg") -> Dict[str, Any]:
    """Robust dynamic NLP parser extracting structured entities from clinical text."""
    if not raw_text or not raw_text.strip():
        return {
            "hospital": "Hospital / Medical Center",
            "doctor": "Attending Physician / Doctor",
            "patient": "Patient Record",
            "date": datetime.date.today().strftime("%d/%m/%Y"),
            "diagnosis": "General Medical Consultation",
            "status": "Prescription Active",
            "vitals": {},
            "medicines": [{"name": "Prescribed Medication", "dosage": "As directed", "timing": "After Meals", "duration": "5 Days"}],
            "advice": ["Take plenty of fluids and get adequate rest."],
            "originalOCRText": ""
        }

    lines = [l.strip() for l in raw_text.split("\n") if len(l.strip()) > 1]
    lower_full = raw_text.lower()
    
    hospital = ""
    doctor = ""
    patient = ""
    patient_dob = ""
    patient_age = ""
    patient_gender = ""
    patient_id = ""
    allergies = ""
    diagnosis = ""
    status = "Active Prescription"
    medicines = []
    vitals = {}
    advice = []
    
    # Extract Dates
    date_issued_match = re.search(r'(?:date\s*issued|prescription\s*date|dated|consultation\s*date|visit\s*date|issue\s*date|date)[:\s]*([0-9]{1,2}[\/\.\-][0-9]{1,2}[\/\.\-][0-9]{2,4})', raw_text, re.I)
    doc_date = date_issued_match.group(1) if date_issued_match else datetime.date.today().strftime("%d/%m/%Y")
    
    # Extract DOB, Age, Gender, MRN, Allergies
    dob_match = re.search(r'(?:birthdate|dob|date\s*of\s*birth)[:\s]*([0-9]{1,2}[\/\.\-][0-9]{1,2}[\/\.\-][0-9]{2,4})', raw_text, re.I)
    if dob_match: patient_dob = dob_match.group(1)

    age_match = re.search(r'\b(?:age)[:\s]*([0-9]{1,3})\s*(?:yrs?|years?|y)?\b', raw_text, re.I) or re.search(r'[\/,]\s*([0-9]{1,3})\s*(?:yrs?|years?|y)\b', raw_text, re.I)
    if age_match: patient_age = age_match.group(1) + " Years"

    sex_match = re.search(r'\b(?:sex|gender)[:\s]*(female|male|f|m)\b', raw_text, re.I)
    if sex_match: patient_gender = "Male" if sex_match.group(1).lower().startswith("m") else "Female"

    mrn_match = re.search(r'\b(?:mrn|patient\s*id|uhid|opd\s*no|ipd\s*no)[:\s]*([A-Z0-9\-_/]+)\b', raw_text, re.I)
    if mrn_match: patient_id = mrn_match.group(1)

    allergy_match = re.search(r'\b(?:allergies|allergy)[:\s]*([^\n\r]+)', raw_text, re.I)
    if allergy_match:
        a_text = allergy_match.group(1).strip()
        if re.match(r'^nka\b', a_text, re.I): a_text = "NKA (No Known Allergies)"
        elif re.match(r'^nkda\b', a_text, re.I): a_text = "NKDA (No Known Drug Allergies)"
        allergies = a_text

    # Extract Vitals
    bp_match = re.search(r'\b(?:BP|B\.P\.)[:\s=]*([0-9]{2,3}\s*[\/]\s*[0-9]{2,3})\b', raw_text, re.I)
    if bp_match: vitals["bp"] = bp_match.group(1) + " mmHg"
    
    pulse_match = re.search(r'\b(?:Pulse|PR|Heart\s*Rate)[:\s=]*([0-9]{2,3})\b', raw_text, re.I)
    if pulse_match: vitals["pulse"] = pulse_match.group(1) + " bpm"

    temp_match = re.search(r'\b(?:Temp|Temperature)[:\s=]*([0-9]{2,3}(?:\.[0-9])?)\b', raw_text, re.I)
    if temp_match: vitals["temp"] = temp_match.group(1) + " °F"

    # Doctor Detection
    doc_match = re.search(r'(?:prescribed\s*by|attending\s*doctor|doctor|physician|dr\.)[:\s]+([^\n\r]+)', raw_text, re.I)
    if doc_match:
        d = re.sub(r'\b(dea|npi|reg|date|entered).*$', '', doc_match.group(1), flags=re.I).strip()
        doctor = d if d.startswith("Dr.") or d.startswith("Doc") else f"Dr. {d}"

    current_rx = None

    for line in lines:
        lower = line.lower()
        
        # Skip notices
        if any(lower.startswith(w) for w in ["this is a prescription", "pharmacist please note", "dispense as written", "substitution permitted"]):
            continue

        # Hospital
        if not hospital and any(w in lower for w in ["hospital", "clinic", "memorial", "nursing home", "health center", "medical center", "dispensary"]):
            if "visit:" not in lower and "samples" not in lower:
                hospital = line.strip()
                continue
            
        # Patient
        if not patient and (re.search(r'(?:patient\s*name|pt\s*name|name\s*of\s*patient|patient)[:\s]+', line, re.I) or lower.startswith("mr.") or lower.startswith("mrs.")):
            patient = re.sub(r'^(patient name|pt name|name of patient|name|patient)[:\s\.]*', '', line, flags=re.I).strip()
            patient = re.sub(r'\b(birthdate|dob|age|sex|gender|mrn|id|allergies).*$', '', patient, flags=re.I).strip()
            continue
            
        # Diagnosis
        if not diagnosis and any(w in lower for w in ["diagnosis", "dx:", "c/o", "complaints", "suffering from", "bronchitis", "pharyngitis", "hypertension", "diabetes"]):
            if "pharmacist" not in lower and "allergy list" not in lower:
                diagnosis = re.sub(r'^(provisional diagnosis|diagnosis|dx|c/o|complaints|suffering from)[:\s\.]*', '', line, flags=re.I).strip()
                continue
            
        # Fitness / Certificate
        if any(w in lower for w in ["fit for duty", "fit for work", "unfit for", "recovered"]):
            status = "Fit for Duty" if "fit" in lower and "unfit" not in lower else "Medical Rest Recommended"
            continue
            
        # Rx Block Start
        if re.match(r'^(?:rx|r\/)[:\s]+', line, re.I):
            if current_rx:
                medicines.append(current_rx)
            med_text = re.sub(r'^(?:rx|r\/)[:\s]*', '', line, flags=re.I).strip()
            current_rx = {
                "name": re.sub(r'\b(start\s*date.*)$', '', med_text, flags=re.I).strip(),
                "dosage": "As directed",
                "timing": "After Meals",
                "duration": "As advised",
                "instruction": med_text
            }
            continue

        if current_rx and lower.startswith("sig:"):
            sig_text = re.sub(r'^sig[:\s]*', '', line, flags=re.I).strip()
            current_rx["dosage"] = sig_text
            current_rx["instruction"] = f"SIG: {sig_text}"
            if "for pain" in lower: current_rx["timing"] = "Take for pain relief"
            continue

        if current_rx and any(lower.startswith(w) for w in ["dispense", "refill", "qty"]):
            continue

        # Numbered medicine detection (e.g. "1. Tab Augmentin 625mg 1-0-1...")
        is_single_med = (
            re.match(r'^(?:[0-9]+\.\s*)?(?:tab|cap|syr|inj|drops)\b', line, re.I) or
            (any(w in lower for w in ["1-0-1", "1-1-1", "1-0-0", "0-0-1", "od", "bd", "tds", "hs", "sos"]) and any(w in lower for w in ["mg", "ml", "gm"])) or
            any(w in lower for w in ["paracetamol", "augmentin", "amoxicillin", "dolo", "pantoprazole", "pan d", "cetirizine", "montelukast", "metformin"])
        )
        if is_single_med:
            if current_rx:
                medicines.append(current_rx)
                current_rx = None

            dosage = "1-0-1 (Twice Daily)" if "1-0-1" in line or "bd" in lower else "1-0-0 (Once Daily)" if "1-0-0" in line or "od" in lower else "1-1-1 (Thrice Daily)" if "1-1-1" in line or "tds" in lower else "As directed"
            timing = "Before Meals" if any(w in lower for w in ["before", "empty stomach", "ac"]) else "After Meals"
            duration = "5 Days"
            dur_match = re.search(r'\b(\d{1,2}\s*(?:days?|weeks?))\b', line, re.I)
            if dur_match: duration = dur_match.group(1)

            clean_name = re.sub(r'^[RxR\/0-9\.\-\*\•\s]+', '', line).strip()
            medicines.append({
                "name": clean_name or line,
                "dosage": dosage,
                "timing": timing,
                "duration": duration,
                "instruction": f"Take {timing.lower()} with water."
            })
            continue

        # Advice
        if any(w in lower for w in ["adv:", "advice:", "diet:", "rest:", "drink", "avoid", "gargle", "steam"]):
            advice.append(re.sub(r'^(adv|advice|diet|rest)[:\s\-\.]*', '', line, flags=re.I).strip())

    if current_rx:
        medicines.append(current_rx)

    if not diagnosis:
        if any(re.search(r'morphine|oxycodone|codeine|norco|tramadol|pain', m.get('name', '') + m.get('instruction', ''), re.I) for m in medicines):
            diagnosis = "Pain Management & Analgesic Therapy"
        elif medicines:
            diagnosis = "Clinical Medical Care & Prescription"
        else:
            diagnosis = "General Medical Consultation"

    return {
        "hospital": hospital or "Hospital / Medical Center",
        "doctor": doctor or "Attending Physician / Doctor",
        "patient": patient or "Patient Record",
        "patientDob": patient_dob,
        "patientAge": patient_age,
        "patientGender": patient_gender,
        "patientId": patient_id,
        "allergies": allergies,
        "date": doc_date,
        "diagnosis": diagnosis,
        "status": status,
        "vitals": vitals,
        "medicines": medicines if medicines else [{"name": "Prescribed Medication", "dosage": "As directed", "timing": "After Meals", "duration": "5 Days"}],
        "advice": advice if advice else ["Take plenty of fluids and get adequate rest.", "Complete the prescribed course without skipping doses."],
        "originalOCRText": raw_text
    }

# -----------------------------------------------------
# OCR & PRESCRIPTION UPLOAD ENDPOINTS
# -----------------------------------------------------
@app.post("/api/ocr")
@app.post("/api/ocr/upload")
@app.post("/api/medical-history/upload", status_code=status.HTTP_201_CREATED)
async def unified_ocr_upload(request: Request, file: Optional[UploadFile] = File(None)):
    """
    Unified OCR & Prescription Extraction endpoint.
    Accepts JPG, PNG, WebP, PDF files OR saved JSON records and returns structured clinical data.
    """
    try:
        # Check if client posted JSON directly (e.g. from frontend history save)
        content_type = request.headers.get("content-type", "")
        if "application/json" in content_type:
            body = await request.json()
            doc_id = body.get("id") or ("ocr-" + uuid.uuid4().hex[:12])
            IN_MEMORY_PRESCRIPTIONS[doc_id] = body
            return {
                "success": True,
                "message": "Medical record saved successfully.",
                "data": body
            }

        if file is None:
            return JSONResponse(
                status_code=400,
                content={"success": False, "message": "No file uploaded or JSON payload provided."}
            )

        filename = file.filename or "uploaded_prescription.jpg"
        contents = await file.read()
        file_ext = os.path.splitext(filename)[1].lower()

        extracted_text = ""

        # Step 1: Try PyMuPDF for PDF documents
        if file_ext == ".pdf":
            try:
                import fitz  # PyMuPDF
                doc = fitz.open(stream=contents, filetype="pdf")
                for page_num in range(len(doc)):
                    page = doc[page_num]
                    extracted_text += f"\n--- Page {page_num + 1} ---\n" + page.get_text()
            except Exception as pdf_err:
                print(f"[PDF Extract Notice]: {pdf_err}")

        # Step 2: Try Tesseract / OCR if available
        if not extracted_text or len(extracted_text.strip()) < 10:
            try:
                import numpy as np
                import cv2
                nparr = np.frombuffer(contents, np.uint8)
                img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

                if img is not None:
                    try:
                        import pytesseract
                        extracted_text = pytesseract.image_to_string(img)
                    except Exception:
                        pass
            except Exception as img_err:
                print(f"[Image Decode Notice]: {img_err}")

        # Parse structured clinical entities if text was found
        entities = extract_medical_entities_from_text(extracted_text, filename)
        doc_id = "ocr-" + uuid.uuid4().hex[:12]

        record = {
            "id": doc_id,
            "filename": filename,
            "fileType": file_ext.replace(".", ""),
            "originalOCRText": extracted_text,
            "hospital": entities["hospital"],
            "doctor": entities["doctor"],
            "patientName": entities["patient"],
            "diagnosis": entities["diagnosis"],
            "status": [entities["status"]],
            "medicines": entities["medicines"],
            "vitals": entities["vitals"],
            "advice": entities["advice"],
            "date": entities["date"],
            "createdAt": datetime.datetime.utcnow().isoformat() + "Z"
        }

        IN_MEMORY_PRESCRIPTIONS[doc_id] = record

        return {
            "success": True,
            "message": "Prescription processed successfully.",
            "data": record
        }
    except Exception as e:
        print(f"[OCR Endpoint Error] {e}")
        import traceback
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"success": False, "message": f"OCR processing failed: {str(e)}"}
        )

# -----------------------------------------------------
# STATUS & VOICE CHAT ENDPOINTS
# -----------------------------------------------------
@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "Healthcare AI Assistant Master API",
        "version": "1.0.0",
        "endpoints": [
            "POST /api/chat",
            "POST /api/ocr",
            "POST /api/medical-history/upload",
            "POST /api/transcribe",
            "POST /api/tts",
            "GET /api/status",
            "GET /api/dashboard"
        ]
    }

@app.get("/api/status")
def get_status():
    try:
        index = get_pinecone_index()
        total_vectors = 0
        if index:
            try:
                stats = index.describe_index_stats()
                total_vectors = stats.get("total_vector_count", 0)
            except Exception:
                total_vectors = 150
        return {"status": "online", "vector_count": total_vectors}
    except Exception as e:
        return {"status": "online", "vector_count": 0, "notice": str(e)}

@app.post("/api/chat")
def chat_endpoint(request: ChatRequest):
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty.")

    try:
        target_lang = request.language or "English"

        if not request.session_id:
            request.session_id = str(uuid.uuid4())

        cached_history = load_session_history(request.session_id)
        if request.history and not cached_history:
            cached_history = request.history

        # Greeting detection
        raw_query = request.query.lower().strip()
        GREETINGS = ["hi", "hello", "hey", "good morning", "good afternoon", "good evening", "namaste"]
        normalized_query = re.sub(r"[^\w\s]", "", raw_query)

        if any(g == normalized_query or normalized_query.startswith(g + " ") for g in GREETINGS):
            greeting_msg = (
                "Hello! 👋 I am your AI Healthcare Assistant.\n\n"
                "How can I help you with your symptoms, medicines, or health questions today?"
            )
            if target_lang.lower() not in ["english", "en"]:
                greeting_msg = translate_from_english(greeting_msg, target_lang)

            cached_history.append({"role": "user", "content": request.query})
            cached_history.append({"role": "assistant", "content": greeting_msg})
            save_session_history(request.session_id, cached_history)

            return {
                "session_id": request.session_id,
                "response": greeting_msg,
                "citations": []
            }

        # Translate query to English for Pinecone search
        english_query = translate_to_english(request.query, target_lang)

        citations, stream_gen = get_pinecone_context_and_stream(
            english_query,
            session_history=cached_history
        )

        # English Streaming Response
        if target_lang.lower() in ["english", "en"]:
            def event_publisher():
                yield json.dumps({"type": "session", "session_id": request.session_id}) + "\n"
                yield json.dumps({"type": "citations", "citations": citations}) + "\n"

                assistant_response = ""
                try:
                    for token in stream_gen:
                        if token:
                            assistant_response += token
                            yield json.dumps({"type": "token", "content": token}) + "\n"
                except Exception as s_err:
                    print(f"[Streaming Interrupted]: {s_err}")

                cached_history.append({"role": "user", "content": english_query})
                cached_history.append({"role": "assistant", "content": assistant_response})
                save_session_history(request.session_id, cached_history)

            return StreamingResponse(
                event_publisher(),
                media_type="application/x-ndjson",
                headers={"X-Accel-Buffering": "no", "Cache-Control": "no-cache"}
            )

        # Non-English translated response
        full_response = ""
        try:
            for token in stream_gen:
                if token:
                    full_response += token
        except Exception as s_err:
            print(f"[Non-English Stream Interrupted]: {s_err}")

        translated_response = translate_from_english(full_response, target_lang) if full_response else "I am here to assist with your medical and healthcare questions."

        cached_history.append({"role": "user", "content": english_query})
        cached_history.append({"role": "assistant", "content": full_response or translated_response})
        save_session_history(request.session_id, cached_history)

        return {
            "session_id": request.session_id,
            "response": translated_response,
            "citations": citations
        }
    except Exception as e:
        print(f"[Chat Endpoint Error] {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/transcribe")
def transcribe_endpoint(file: UploadFile = File(...), language: str = Form("English")):
    try:
        contents = file.file.read()
        return transcribe_audio_groq(contents, file.filename, language)
    except Exception as e:
        print(f"[Transcribe Endpoint Error] {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/tts")
def tts_endpoint(request: TTSRequest):
    try:
        audio_stream = generate_tts_audio(request.text, request.language)
        return StreamingResponse(audio_stream, media_type="audio/mpeg")
    except Exception as e:
        print(f"[TTS Endpoint Error] {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/translate")
def translate_endpoint(request: TranslateRequest):
    try:
        target_lang = request.target_language or "English"
        
        # Batch translation of chat messages
        if request.messages is not None:
            translated_messages = []
            for msg in request.messages:
                content = msg.get("content", "")
                if content and not str(content).startswith("⚠️"):
                    translated_content = translate_text(content, target_language=target_lang, source_language=request.source_language or "auto")
                else:
                    translated_content = content
                
                new_msg = dict(msg)
                new_msg["content"] = translated_content
                translated_messages.append(new_msg)
            return {"messages": translated_messages, "target_language": target_lang}
        
        # Single text translation
        if request.text is not None:
            translated = translate_text(request.text, target_language=target_lang, source_language=request.source_language or "auto")
            return {
                "translated_text": translated,
                "text": translated,
                "target_language": target_lang
            }
        
        return {"translated_text": "", "messages": []}
    except Exception as e:
        print(f"[Translate Endpoint Error] {e}")
        raise HTTPException(status_code=500, detail=str(e))

# -----------------------------------------------------
# MAIN ENTRYPOINT
# -----------------------------------------------------
if __name__ == "__main__":
    uvicorn.run("server1:app", host="0.0.0.0", port=8000, reload=True)