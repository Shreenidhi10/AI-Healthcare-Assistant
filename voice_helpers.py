import os
import shutil
import tempfile
import io
from typing import Dict, Any
from dotenv import load_dotenv
from groq import Groq
from gtts import gTTS

load_dotenv()

# Automatically configure static ffmpeg in PATH for Whisper on Windows
try:
    import imageio_ffmpeg
    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
    ffmpeg_dir = os.path.dirname(ffmpeg_exe)
    target_ffmpeg = os.path.join(ffmpeg_dir, "ffmpeg.exe")
    if not os.path.exists(target_ffmpeg):
        shutil.copyfile(ffmpeg_exe, target_ffmpeg)
    os.environ["PATH"] = ffmpeg_dir + os.pathsep + os.environ.get("PATH", "")
except Exception as e:
    print(f"[FFmpeg Setup Warning] {e}")

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "").strip()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()

groq_client = None
if GROQ_API_KEY and GROQ_API_KEY != "YOUR_GROQ_API_KEY":
    try:
        groq_client = Groq(api_key=GROQ_API_KEY)
        print("Groq API client initialized successfully.")
    except Exception as e:
        print(f"Groq Client Init Warning: {e}")

local_whisper_model = None

LANGUAGE_CODES = {
    "English": "en",
    "Hindi": "hi",
    "Marathi": "mr",
    "Tamil": "ta",
    "Telugu": "te",
    "Bengali": "bn",
    "Gujarati": "gu",
    "Kannada": "kn",
    "Malayalam": "ml",
    "Punjabi": "pa"
}

def get_local_whisper():
    global local_whisper_model
    if local_whisper_model is None:
        print("Loading local Whisper model ('base')...")
        import whisper
        local_whisper_model = whisper.load_model("base")
        print("Local Whisper model loaded successfully.")
    return local_whisper_model

def transcribe_audio_groq(file_bytes: bytes, filename: str = "audio.webm", language: str = "English") -> Dict[str, Any]:
    """Transcribes uploaded audio using Groq Whisper, with local Whisper fallback."""
    suffix = os.path.splitext(filename)[1] or ".webm"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(file_bytes)
        tmp_path = tmp.name

    lang_code = LANGUAGE_CODES.get(language, "en")

    try:
        # Try Groq API if client is initialized
        if groq_client:
            try:
                mime_sub = suffix.replace(".", "")
                if mime_sub == "webm":
                    mime_type = "audio/webm"
                elif mime_sub in ["mp4", "m4a"]:
                    mime_type = "audio/mp4"
                elif mime_sub == "wav":
                    mime_type = "audio/wav"
                else:
                    mime_type = "audio/webm"

                with open(tmp_path, "rb") as audio_file:
                    kwargs = {
                        "file": (filename, audio_file.read(), mime_type),
                        "model": "whisper-large-v3"
                    }
                    if lang_code and lang_code != "auto":
                        kwargs["language"] = lang_code

                    transcription = groq_client.audio.transcriptions.create(**kwargs)

                transcribed_text = transcription.text.strip()
                print(f"[Groq Whisper STT Output] ({language}): '{transcribed_text}'")

                return {
                    "text": transcribed_text,
                    "language": language
                }
            except Exception as groq_err:
                print(f"Groq STT failed ({groq_err}), falling back to local Whisper model...")

        # Fallback to local Whisper
        try:
            model = get_local_whisper()
            result = model.transcribe(
                tmp_path,
                task="transcribe",
                fp16=False,
                temperature=0
            )
            transcribed_text = result.get("text", "").strip()
            print(f"[Local Whisper STT Output] ({language}): '{transcribed_text}'")

            return {
                "text": transcribed_text,
                "language": language
            }
        except Exception as local_err:
            print(f"[Local Whisper STT Error]: {local_err}")
            raise RuntimeError(f"Transcription service unavailable: {local_err}")
    finally:
        if os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except Exception:
                pass

def translate_text(text: str, target_language: str, source_language: str = "auto") -> str:
    """Translates text between any languages preserving medical accuracy and markdown formatting."""
    if not text or not text.strip():
        return text

    target_code = LANGUAGE_CODES.get(target_language, target_language.lower()[:2] if len(target_language) <= 3 else "en")
    source_code = LANGUAGE_CODES.get(source_language, "auto" if source_language == "auto" else source_language.lower()[:2])

    if source_code == target_code and source_code != "auto":
        return text
    if target_code == "en" and source_code == "en":
        return text

    # Strategy 1: Google Translate public engine (POST for unlimited body size & multipart paragraphs)
    try:
        import requests
        url = "https://translate.googleapis.com/translate_a/single"
        params = {
            "client": "gtx",
            "sl": source_code,
            "tl": target_code,
            "dt": "t"
        }
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        r = requests.post(url, params=params, data={"q": text}, headers=headers, timeout=12)
        if r.status_code == 200:
            data = r.json()
            translated_parts = []
            if isinstance(data, list) and len(data) > 0 and isinstance(data[0], list):
                for part in data[0]:
                    if isinstance(part, list) and len(part) > 0 and part[0]:
                        translated_parts.append(str(part[0]))
            translated = "".join(translated_parts)
            if translated.strip():
                return translated
    except Exception as ge:
        print(f"[Google Translate Warning]: {ge}")

    # Strategy 2: Groq LLM Translation
    if groq_client:
        try:
            prompt = f"""You are an expert multilingual medical translator.
Translate the following text from {source_language} into {target_language}.
Rules:
1. Preserve exact medical meaning, clinical advice, dosages, and guidelines.
2. Retain all markdown formatting (###, bullet points, bolding).
3. Do NOT add preamble or explanations. Return ONLY the translation.

Text:
{text}"""
            response = groq_client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.0
            )
            res = response.choices[0].message.content.strip()
            if res:
                return res
        except Exception as e:
            print(f"[Groq Translation Error]: {e}")

    # Strategy 3: Local Ollama Translation
    try:
        import ollama
        prompt = f"Translate the following text into {target_language}. Return ONLY the translated text:\n\n{text}"
        resp = ollama.chat(
            model="gemma3:1b",
            messages=[{"role": "user", "content": prompt}]
        )
        return resp["message"]["content"].strip()
    except Exception:
        pass

    return text

def translate_to_english(text: str, source_language: str) -> str:
    """Translates source language query to English for RAG vector search."""
    return translate_text(text, target_language="English", source_language=source_language)

def translate_from_english(text: str, target_language: str) -> str:
    """Translates English RAG response to the target user language."""
    return translate_text(text, target_language=target_language, source_language="English")

def generate_tts_audio(text: str, language: str) -> io.BytesIO:
    """Generates MP3 audio stream for response text using gTTS."""
    lang_code = LANGUAGE_CODES.get(language, "en")
    
    # Strip markdown headers/bold tags for cleaner speech
    clean_text = text.replace("#", "").replace("*", "").replace(">", "").strip()
    if not clean_text:
        clean_text = "No response text available."

    tts = gTTS(text=clean_text, lang=lang_code, slow=False)
    mp3_fp = io.BytesIO()
    tts.write_to_fp(mp3_fp)
    mp3_fp.seek(0)
    return mp3_fp
