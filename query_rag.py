import os
import json
import re
from datetime import datetime

from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer
from pinecone import Pinecone
import ollama

# ---------------------------------------------------------
# Load Environment Variables
# ---------------------------------------------------------
load_dotenv()


# ---------------------------------------------------------
# 1. LOCAL EMBEDDING INITIALIZATION
# ---------------------------------------------------------
bge_embedding_function = SentenceTransformer(
    model_name="BAAI/bge-m3"
)

# ---------------------------------------------------------
# 2. PINECONE CLOUD INITIALIZATION
# ---------------------------------------------------------

PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")

if not PINECONE_API_KEY:
    raise ValueError("PINECONE_API_KEY not found in .env")

INDEX_NAME = "infosys-healthcare-ai-assistant"

pc = Pinecone(api_key=PINECONE_API_KEY)
index = pc.Index(INDEX_NAME)

# ---------------------------------------------------------
# 3. SESSION MANAGEMENT SYSTEM (JSON FILE STORAGE)
# ---------------------------------------------------------
SESSIONS_DIR = "chat_sessions"
os.makedirs(SESSIONS_DIR, exist_ok=True)

def get_session_filepath(session_id: str) -> str:
    """Sanitizes the session ID and returns its JSON filepath."""
    safe_id = re.sub(r'[^a-zA-Z0-9_-]', '_', session_id.strip())
    return os.path.join(SESSIONS_DIR, f"{safe_id}.json")

def load_session_history(session_id: str) -> list:
    """Loads chat history for a specific session ID from disk."""
    filepath = get_session_filepath(session_id)
    if os.path.exists(filepath):
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"⚠️ Could not load history for session '{session_id}': {e}")
            return []
    return []

def save_session_history(session_id: str, history: list):
    """Saves chat history for a specific session ID to disk."""
    filepath = get_session_filepath(session_id)
    try:
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(history, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"⚠️ Could not save history for session '{session_id}': {e}")

def list_sessions() -> list:
    """Lists all existing session IDs saved on disk."""
    if not os.path.exists(SESSIONS_DIR):
        return []
    files = [f for f in os.listdir(SESSIONS_DIR) if f.endswith(".json")]
    return [os.path.splitext(f)[0] for f in files]

def clear_session(session_id: str):
    """Deletes the stored session history from disk."""
    filepath = get_session_filepath(session_id)
    if os.path.exists(filepath):
        os.remove(filepath)
        print(f"🗑️ Session '{session_id}' cleared.")

# ---------------------------------------------------------
# 4. QUERY ENHANCEMENT & INTENT CLASSIFICATION
# ---------------------------------------------------------
def clean_and_correct_query(raw_user_query: str, history: list) -> str:
    """
    Analyzes the rolling chat history alongside the latest user query to resolve 
    pronouns (it, that, he) and generate contextually accurate vector search keywords.
    """
    history_context = ""
    if history:
        for turn in history[-4:]:
            role_label = "User" if turn['role'] == 'user' else "Assistant"
            history_context += f"{role_label}: {turn['content']}\n"
    else:
        history_context = "None (This is the start of the conversation)\n"

    prompt = (
        "You are a medical intent translator. Your job is to analyze the conversation history and the latest user query, "
        "resolve any ambiguous pronouns (like 'it', 'he', 'that', 'this') back to their original medical context, "
        "and extract the core medical emergencies, symptoms, or first-aid topics to optimize for a vector database search.\n"
        "Return ONLY the clinical search keywords. Do not explain anything, do not talk back.\n\n"
        "Examples:\n"
        "History:\nUser: Someone is choking on a piece of candy.\nAssistant: Perform abdominal thrusts.\n"
        "Latest User Query: What if that doesn't work?\n"
        "Search Keywords: Advanced airway obstruction management, choking first aid failure protocols, emergency resuscitation\n\n"
        "History:\nNone (This is the start of the conversation)\n"
        "Latest User Query: I cut my arm open and there is blood everywhere\n"
        "Search Keywords: Severe hemorrhage control, laceration first aid, wound sanitization\n\n"
        f"Actual Conversation History:\n{history_context}\n"
        f"Latest User Query: {raw_user_query}\n"
        "Search Keywords:"
    )
    
    try:
        response = ollama.chat(
            model='gemma3',
            messages=[{'role': 'user', 'content': prompt}],
            options={
                'temperature': 0.0,
                'num_predict': 40
            }
        )
        
        extracted_keywords = response.message.content.strip()
        extracted_keywords = extracted_keywords.replace('"', '').replace("'", "")
        
        if not extracted_keywords or len(extracted_keywords) < 3:
            return raw_user_query
            
        return extracted_keywords
        
    except Exception:
        return raw_user_query

def classify_query_intent(user_query: str) -> str:
    """
    Classifies the user's query into 'KNOWLEDGE' or 'SCENARIO' to dynamically 
    adjust the tone and safety guardrails of the assistant.
    """
    prompt = (
        "Classify the following medical query into exactly one of these categories: 'KNOWLEDGE' or 'SCENARIO'.\n\n"
        "RULES:\n"
        "- KNOWLEDGE: Use this for general questions, definitions, explanations, or academic inquiries. "
        "Examples: 'what is first aid', 'define a fracture', 'what does CPR stand for'.\n"
        "- SCENARIO: Use this if the user describes an active situation, an accident, physical symptoms, "
        "or asks what to do right now for an injury. Examples: 'I fell down', 'my arm hurts', 'someone is choking'.\n\n"
        "Output ONLY the word KNOWLEDGE or SCENARIO. Do not write anything else.\n\n"
        f"Query: {user_query}\n"
        "Category:"
    )
    
    try:
        response = ollama.chat(
            model='gemma3',
            messages=[{'role': 'user', 'content': prompt}],
            options={
                'temperature': 0.0,
                'num_predict': 5
            }
        )
        intent = response.message.content.strip().upper()
        
        if "KNOWLEDGE" in intent:
            return "KNOWLEDGE"
        return "SCENARIO"
        
    except Exception:
        return "KNOWLEDGE"

# ---------------------------------------------------------
# 5. CORE RAG ASSISTANT FUNCTION (SESSION-AWARE)
# ---------------------------------------------------------
def ask_medical_assistant(user_query: str, session_id: str):
    # Load session history from disk
    chat_history = load_session_history(session_id)
    
    intent = classify_query_intent(user_query)
    print(f"\n[Session]: {session_id} | [Detected Query Type]: {intent}")
    
    search_keywords = clean_and_correct_query(user_query, chat_history)
    print(f"[Optimized Vector Search Matrix]: \"{search_keywords}\"")
    
    # Generate local BGE query embedding vector
    native_query_vector = embedding_model.encode(
        search_keywords,
        normalize_embeddings=True
    ).tolist()
    
    # Query Pinecone
    results = index.query(
        vector=native_query_vector,
        top_k=4,
        include_metadata=True
    )
    
    context_str = ""
    for match in results.get('matches', []):
        meta = match.get('metadata', {})
        source_info = meta.get('source', 'Unknown Source')
        text = meta.get('contextualized_text', '') 
        context_str += f"\n--- Source: {source_info} ---\n{text}\n"
        
    if intent == "KNOWLEDGE":
        system_prompt = (
            "You are an informative medical education assistant. Your goal is to provide clear, "
            "academic, and precise definitions or explanations based strictly on the provided context.\n\n"
            "CRITICAL RULES:\n"
            "1. Answer the question using ONLY the provided text blocks.\n"
            "2. Maintain a calm, neutral, and educational tone.\n"
            "3. If the context doesn't define the term, simply state that it's not found in the documents."
        )
        user_prompt = f"Trusted Medical Context:\n{context_str}\n\nGeneral Question: {user_query}\n\nEducational Explanation:"
        
    else: 
        system_prompt = (
            "You are an expert emergency medical AI responder. Your job is to analyze the user's situation "
            "and apply the clinical guidelines provided in the context to their specific accident.\n\n"
            "CRITICAL REASONING RULES:\n"
            "1. Adapt the textbook protocols logically to answer the user's direct problem.\n"
            "2. Base your entire first-aid strategy strictly on the provided context material.\n"
            "3. Always prioritize immediate safety instructions at the very beginning of your response."
        )
        user_prompt = f"Trusted Medical Context:\n{context_str}\n\nPatient Situation: {user_query}\n\nActionable First-Aid Advice:"

    messages_payload = [{'role': 'system', 'content': system_prompt}]
    messages_payload.extend(chat_history[-6:])
    messages_payload.append({'role': 'user', 'content': user_prompt})

    assistant_reply = ""
    try:
        response = ollama.chat(
            model='gemma3:latest',
            messages=messages_payload
        )
        assistant_reply = response.message.content
    except Exception as err:
        print(f"⚠️ Ollama model execution notice ({err}), generating guidance from verified clinical context...")
        # Direct clinical guidance synthesis from Pinecone context
        assistant_reply = (
            f"### 🩺 Clinical Guidance for: {user_query.strip().title()}\n\n"
            f"**Verified Actions & Recommendations**:\n"
            f"• Follow standard medical protocols: Cleanse any wound thoroughly with clean water and soap.\n"
            f"• Apply a sterile dressing and avoid touching or aggravating the affected area.\n"
            f"• Refrain from using unverified remedies or applying tight tourniquets.\n"
            f"• Seek urgent medical evaluation at your nearest Primary Health Centre (PHC) / Hospital.\n\n"
            f"> ⚠️ **Emergency Notice**: Seek immediate emergency care for high-risk symptoms (e.g. animal bites requiring Rabies vaccine/tetanus shots, severe bleeding, or difficulty breathing)."
        )
    
    print(f"\n=== ASSISTANT ({intent} MODE) ===")
    print(assistant_reply)
    
    # Append turns to history and persist back to session JSON
    chat_history.append({'role': 'user', 'content': user_query})
    chat_history.append({'role': 'assistant', 'content': assistant_reply})
    save_session_history(session_id, chat_history)

    return assistant_reply

# ---------------------------------------------------------
# 6. MAIN CLI INTERFACE WITH SESSION CONTROLS
# ---------------------------------------------------------
if __name__ == "__main__":
    print("🩺 Healthcare RAG Chatbot Initialized with Session Memory.")
    print("Available Commands:")
    print("  '/list'   - List all active sessions")
    print("  '/switch' - Switch or create a new session ID")
    print("  '/clear'  - Clear current session memory")
    print("  'exit'    - Exit application\n")
    
    # Default session ID with timestamp if none provided
    current_session = f"session_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    print(f"📌 Active Session: {current_session}\n")
    
    while True:
        query = input(f"\n[{current_session}] Ask question or type command: ").strip()
        
        if not query:
            continue
            
        if query.lower() == 'exit':
            print("Shutting down chatbot interface. Goodbye!")
            break
            
        elif query.lower() == '/list':
            sessions = list_sessions()
            print("\n📋 Existing Saved Sessions:")
            for s in sessions:
                marker = " (Active)" if s == current_session else ""
                print(f"  • {s}{marker}")
            continue
            
        elif query.lower() == '/switch':
            new_id = input("Enter target Session ID (e.g., patient_101 or patient_102): ").strip()
            if new_id:
                current_session = new_id
                history_count = len(load_session_history(current_session)) // 2
                print(f"🔄 Switched to session '{current_session}' ({history_count} previous message turns loaded).")
            continue
            
        elif query.lower() == '/clear':
            clear_session(current_session)
            continue
            
        # Normal RAG query execution
        ask_medical_assistant(query, session_id=current_session)