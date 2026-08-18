import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, MessageSquare, Trash2, Search, Send, Square, 
  ChevronDown, ChevronRight, BookOpen, Database, ShieldAlert, Loader2,
  Mic, MicOff, Volume2, VolumeX, Globe, X, History as HistoryIcon, Languages
} from 'lucide-react';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './Assistant.css';
import logo from '../../assets/logo1.png';

const API_BASE_URL = "/api";
const SESSIONS_STORAGE_KEY = "healthbuddy_ai_chat_sessions_v1";
const ACTIVE_SESSION_STORAGE_KEY = "healthbuddy_ai_active_session_v1";

const LANGUAGES = [
  { name: "English", code: "en" },
  { name: "Hindi", code: "hi" },
  { name: "Marathi", code: "mr" },
  { name: "Tamil", code: "ta" },
  { name: "Telugu", code: "te" },
  { name: "Bengali", code: "bn" },
  { name: "Gujarati", code: "gu" },
  { name: "Kannada", code: "kn" },
  { name: "Malayalam", code: "ml" },
  { name: "Punjabi", code: "pa" }
];

function createBlankSession(customTitle = "New Healthcare Chat") {
  const newId = "sess_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);
  return {
    id: newId,
    title: customTitle,
    messages: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function loadInitialSessions() {
  try {
    const raw = localStorage.getItem(SESSIONS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error("Failed to load chat sessions from localStorage:", err);
  }
  const defaultSess = createBlankSession();
  return { [defaultSess.id]: defaultSess };
}

function loadInitialActiveId(sessionsObj) {
  try {
    const saved = localStorage.getItem(ACTIVE_SESSION_STORAGE_KEY);
    if (saved && sessionsObj[saved]) {
      return saved;
    }
  } catch (_) {}
  const keys = Object.keys(sessionsObj);
  return keys[0] || null;
}

export default function Assistant() {
  const [sessions, setSessions] = useState(loadInitialSessions);
  const [currentSessionId, setCurrentSessionId] = useState(() => loadInitialActiveId(sessions));
  const [searchQuery, setSearchQuery] = useState("");
  const [inputQuery, setInputQuery] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isTranslatingChat, setIsTranslatingChat] = useState(false);
  const [systemStatus, setSystemStatus] = useState({ online: false, vectorCount: 0 });
  const [expandedCitations, setExpandedCitations] = useState({});
  const [selectedLanguage, setSelectedLanguage] = useState("English");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Voice Recording & TTS States
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [playingAudioIndex, setPlayingAudioIndex] = useState(null);
  const currentAudioRef = useRef(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const abortControllerRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Save sessions to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
    } catch (err) {
      console.error("Failed to persist sessions to localStorage:", err);
    }
  }, [sessions]);

  // Save current active session ID
  useEffect(() => {
    try {
      if (currentSessionId) {
        localStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, currentSessionId);
      }
    } catch (_) {}
  }, [currentSessionId]);

  // Ensure currentSessionId is valid
  useEffect(() => {
    if (!sessions[currentSessionId]) {
      const keys = Object.keys(sessions);
      if (keys.length > 0) {
        setCurrentSessionId(keys[0]);
      } else {
        const fresh = createBlankSession();
        setSessions({ [fresh.id]: fresh });
        setCurrentSessionId(fresh.id);
      }
    }
  }, [sessions, currentSessionId]);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/status`);
        const data = await res.json();
        if (data.status === "online") {
          setSystemStatus({ online: true, vectorCount: data.vector_count });
        } else {
          setSystemStatus({ online: false, vectorCount: 0 });
        }
      } catch (err) {
        setSystemStatus({ online: false, vectorCount: 0 });
      }
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sessions, currentSessionId, isGenerating, isTranscribing, isTranslatingChat]);

  const activeSession = sessions[currentSessionId] || { title: "New Healthcare Chat", messages: [] };

  const handleLanguageChange = async (newLang) => {
    setSelectedLanguage(newLang);

    // If there are existing messages in the conversation, dynamically translate all questions and answers!
    if (activeSession && activeSession.messages && activeSession.messages.length > 0) {
      setIsTranslatingChat(true);
      try {
        const response = await fetch(`${API_BASE_URL}/translate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: activeSession.messages,
            target_language: newLang,
            source_language: "auto"
          })
        });

        if (response.ok) {
          const data = await response.json();
          if (data.messages && data.messages.length > 0) {
            setSessions(prev => {
              const current = prev[currentSessionId];
              if (!current) return prev;
              return {
                ...prev,
                [currentSessionId]: {
                  ...current,
                  messages: data.messages,
                  updatedAt: new Date().toISOString()
                }
              };
            });
          }
        }
      } catch (err) {
        console.error("Language translation error:", err);
      } finally {
        setIsTranslatingChat(false);
      }
    }
  };

  const handleNewChat = () => {
    if (activeSession && (!activeSession.messages || activeSession.messages.length === 0)) {
      setIsMobileSidebarOpen(false);
      return;
    }
    const newSession = createBlankSession();
    setSessions(prev => ({
      ...prev,
      [newSession.id]: newSession
    }));
    setCurrentSessionId(newSession.id);
    setIsMobileSidebarOpen(false);
  };

  const handleDeleteSession = (id, e) => {
    e.stopPropagation();
    setSessions(prev => {
      const updated = { ...prev };
      delete updated[id];
      const remainingKeys = Object.keys(updated);
      if (remainingKeys.length === 0) {
        const fresh = createBlankSession();
        updated[fresh.id] = fresh;
        setCurrentSessionId(fresh.id);
      } else if (currentSessionId === id) {
        setCurrentSessionId(remainingKeys[remainingKeys.length - 1]);
      }
      return updated;
    });
  };

  const toggleCitation = (msgIndex) => {
    setExpandedCitations(prev => ({
      ...prev,
      [msgIndex]: !prev[msgIndex]
    }));
  };

  // --------------------------------------------------
  // Voice Recording (STT via Whisper)
  // --------------------------------------------------
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await handleAudioUpload(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Microphone permission is required for voice input.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleAudioUpload = async (audioBlob) => {
    setIsTranscribing(true);
    try {
      const formData = new FormData();
      formData.append("file", audioBlob, "voice_input.webm");
      formData.append("language", selectedLanguage);

      const response = await fetch(`${API_BASE_URL}/transcribe`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Transcription failed.");

      const data = await response.json();
      if (data.text) {
        handleSendMessage(data.text);
      }
    } catch (err) {
      console.error("STT Error:", err);
      alert("Failed to transcribe voice input. Please try again.");
    } finally {
      setIsTranscribing(false);
    }
  };

  // --------------------------------------------------
  // Text-to-Speech (TTS via gTTS)
  // --------------------------------------------------
  const handlePlayTTS = async (text, msgIdx) => {
    if (playingAudioIndex === msgIdx) {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
      setPlayingAudioIndex(null);
      return;
    }

    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }

    try {
      setPlayingAudioIndex(msgIdx);
      const response = await fetch(`${API_BASE_URL}/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: text,
          language: selectedLanguage
        })
      });

      if (!response.ok) throw new Error("TTS Request failed.");

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      currentAudioRef.current = audio;

      audio.onended = () => {
        setPlayingAudioIndex(null);
        currentAudioRef.current = null;
      };

      audio.onerror = () => {
        setPlayingAudioIndex(null);
        currentAudioRef.current = null;
      };

      await audio.play();
    } catch (err) {
      console.error("TTS Error:", err);
      setPlayingAudioIndex(null);
    }
  };

  // --------------------------------------------------
  // Chat Execution (NDJSON Stream)
  // --------------------------------------------------
  const handleSendMessage = async (customQuery = null) => {
    const queryText = customQuery || inputQuery;
    if (!queryText.trim() || isGenerating) return;

    const targetSessionId = currentSessionId;
    setInputQuery("");
    setIsGenerating(true);

    const currentSess = sessions[targetSessionId] || createBlankSession();
    const isFirstMessage = (currentSess.messages || []).length === 0;

    // Generate dynamic title from user question
    let newTitle = currentSess.title;
    if (isFirstMessage || currentSess.title === "New Healthcare Chat") {
      const clean = queryText.trim().replace(/^["'\s]+|["'\s]+$/g, "");
      newTitle = clean.length > 28 ? clean.substring(0, 28) + "..." : clean;
    }

    const userMsg = { role: "user", content: queryText, timestamp: new Date().toISOString() };
    const initialAssistantMsg = { role: "assistant", content: "", citations: [], timestamp: new Date().toISOString() };

    setSessions(prev => {
      const target = prev[targetSessionId] || createBlankSession(newTitle);
      return {
        ...prev,
        [targetSessionId]: {
          ...target,
          title: newTitle,
          updatedAt: new Date().toISOString(),
          messages: [...(target.messages || []), userMsg, initialAssistantMsg]
        }
      };
    });

    abortControllerRef.current = new AbortController();

    try {
      const historyPayload = (currentSess.messages || []).map(m => ({ role: m.role, content: m.content }));
      
      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: queryText,
          history: historyPayload,
          language: selectedLanguage,
          session_id: currentSess.backendSessionId || targetSessionId
        }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        let errorMsg = `Server error (${response.status})`;
        try {
          const errData = await response.json();
          if (errData && errData.detail) {
            errorMsg = `Server error: ${errData.detail}`;
          }
        } catch (_) {}
        throw new Error(errorMsg);
      }

      const contentType = response.headers.get("content-type") || "";

      if (contentType.includes("application/json")) {
        const data = await response.json();
        setSessions(prev => {
          const sess = prev[targetSessionId];
          if (!sess) return prev;
          const msgs = [...sess.messages];
          msgs[msgs.length - 1] = {
            ...msgs[msgs.length - 1],
            content: data.response,
            citations: data.citations || []
          };

          return {
            ...prev,
            [targetSessionId]: {
              ...sess,
              updatedAt: new Date().toISOString(),
              backendSessionId: data.session_id || sess.backendSessionId,
              messages: msgs
            }
          };
        });
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      const processLine = (line) => {
        if (!line.trim()) return;
        try {
          const data = JSON.parse(line);
          if (data.type === "session") {
            setSessions(prev => {
              const sess = prev[targetSessionId];
              if (!sess) return prev;
              return {
                ...prev,
                [targetSessionId]: {
                  ...sess,
                  backendSessionId: data.session_id
                }
              };
            });
            return;
          }

          if (data.type === "citations") {
            setSessions(prev => {
              const sess = prev[targetSessionId];
              if (!sess) return prev;
              const msgs = [...sess.messages];
              const lastIdx = msgs.length - 1;
              if (lastIdx >= 0) {
                msgs[lastIdx] = { ...msgs[lastIdx], citations: data.citations };
              }
              return { 
                ...prev, 
                [targetSessionId]: { 
                  ...sess, 
                  updatedAt: new Date().toISOString(),
                  messages: msgs 
                } 
              };
            });
          } else if (data.type === "token") {
            setSessions(prev => {
              const sess = prev[targetSessionId];
              if (!sess) return prev;
              const msgs = [...sess.messages];
              const lastIdx = msgs.length - 1;
              if (lastIdx >= 0) {
                msgs[lastIdx] = {
                  ...msgs[lastIdx],
                  content: (msgs[lastIdx].content || "") + data.content
                };
              }
              return { 
                ...prev, 
                [targetSessionId]: { 
                  ...sess, 
                  updatedAt: new Date().toISOString(),
                  messages: msgs 
                } 
              };
            });
          }
        } catch (e) {
          console.error("NDJSON parse error:", e);
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          if (buffer.trim()) processLine(buffer);
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop();

        for (const line of lines) {
          processLine(line);
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        const displayError = err.message && !err.message.includes("Failed to fetch")
          ? `⚠️ ${err.message}`
          : "⚠️ Cannot connect to RAG server. Please make sure backend server (server1.py) is running at http://localhost:8000.";

        setSessions(prev => {
          const sess = prev[targetSessionId];
          if (!sess) return prev;
          const msgs = [...sess.messages];
          const lastIdx = msgs.length - 1;
          if (lastIdx >= 0) {
            msgs[lastIdx] = {
              ...msgs[lastIdx],
              content: displayError
            };
          }
          return { ...prev, [targetSessionId]: { ...sess, messages: msgs } };
        });
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsGenerating(false);
    }
  };

  // Sort sessions chronologically (most recently updated on top) and filter by search
  const filteredSessions = Object.values(sessions)
    .filter(s => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      const titleMatch = (s.title || "").toLowerCase().includes(q);
      const msgMatch = (s.messages || []).some(m => (m.content || "").toLowerCase().includes(q));
      return titleMatch || msgMatch;
    })
    .sort((a, b) => {
      const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return timeB - timeA;
    });

  return (
    <div className="assistant-container">
      {/* Mobile Backdrop */}
      {isMobileSidebarOpen && (
        <div 
          className="assistant-sidebar-backdrop visible" 
          onClick={() => setIsMobileSidebarOpen(false)} 
        />
      )}

      {/* Sidebar (Chat History & Sessions) */}
      <aside className={`assistant-sidebar ${isMobileSidebarOpen ? 'open' : ''}`}>
        <div className="assistant-sidebar-header">
          <div className="assistant-sidebar-title-row">
            <div>
              <div className="assistant-brand-title">Healthcare AI Assistant</div>
              <div className="assistant-brand-subtitle">Multilingual Voice RAG System</div>
            </div>
            <button 
              className="assistant-sidebar-close-btn"
              onClick={() => setIsMobileSidebarOpen(false)}
              title="Close Menu"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <button className="assistant-new-chat-btn" onClick={handleNewChat}>
          <Plus size={16} /> New Chat
        </button>

        <div className="assistant-search-box">
          <Search size={14} className="assistant-search-icon" />
          <input 
            type="text" 
            placeholder="Search conversations..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="assistant-history-label">CONVERSATION HISTORY</div>

        <div className="assistant-history-list">
          {filteredSessions.length === 0 ? (
            <div style={{ fontSize: '0.78rem', color: '#727783', padding: '10px 4px', textAlign: 'center' }}>
              No conversations found
            </div>
          ) : (
            filteredSessions.map((s) => (
              <div 
                key={s.id} 
                className={`assistant-history-item ${s.id === currentSessionId ? 'active' : ''}`}
                onClick={() => {
                  setCurrentSessionId(s.id);
                  setIsMobileSidebarOpen(false);
                }}
                title={s.title}
              >
                <MessageSquare size={14} style={{ flexShrink: 0 }} />
                <span className="assistant-item-title">{s.title}</span>
                <button 
                  className="assistant-delete-btn" 
                  onClick={(e) => handleDeleteSession(s.id, e)}
                  title="Delete conversation"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="assistant-sidebar-footer">
          {systemStatus.online ? (
            <div className="assistant-status-indicator online">
              <Database size={13} /> System Online | {systemStatus.vectorCount} Vectors
            </div>
          ) : (
            <div className="assistant-status-indicator offline">
              <ShieldAlert size={13} /> RAG Database Offline
            </div>
          )}
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="assistant-main-content">
        <header className="assistant-top-header">
          <div className="assistant-header-left">
            <button 
              className="assistant-mobile-toggle-btn"
              onClick={() => setIsMobileSidebarOpen(prev => !prev)}
              title="Chat History & Sessions"
            >
              <HistoryIcon size={18} />
              <span className="assistant-mobile-toggle-text">Chats</span>
            </button>
            <div className="assistant-header-title">
              <h2>AI Multilingual Assistant</h2>
              <span>Rural Health, Clinical Protocols & Multilingual Communication</span>
            </div>
          </div>

          <div className="assistant-header-actions">
            <div className="assistant-language-selector">
              <Globe size={15} className="assistant-lang-icon" />
              <select 
                className="assistant-language-select"
                value={selectedLanguage}
                onChange={(e) => handleLanguageChange(e.target.value)}
                disabled={isTranslatingChat || isGenerating}
                title="Select language to translate conversation"
              >
                {LANGUAGES.map(lang => (
                  <option key={lang.code} value={lang.name}>
                    {lang.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </header>

        {isTranslatingChat && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            backgroundColor: '#d6e3ff',
            color: '#00478d',
            padding: '7px 14px',
            fontSize: '0.8rem',
            fontWeight: '700',
            borderBottom: '1px solid #a9c7ff'
          }}>
            <Loader2 size={15} className="animate-spin" />
            <span>Translating conversation into {selectedLanguage}...</span>
          </div>
        )}

        <div className="assistant-chat-viewport">
          {activeSession.messages.length === 0 ? (
            <div className="assistant-empty-state">
              <div className="assistant-empty-logo">
                <img src={logo} alt="Healthcare Logo" style={{ width: '110px', height: 'auto' }} />
              </div>
              <h3>Rural Healthcare AI Assistant</h3>
              <p>Ask health questions in English, Hindi, Marathi, Tamil, Telugu, or speak using the microphone!</p>
              
              <div className="assistant-prompt-suggestions">
                {[
                  "What should I do for viral fever & body pain?",
                  "How to manage blood pressure effectively?",
                  "What is the first aid for minor cuts & burns?",
                  "What are dengue warning signs and precautions?"
                ].map((prompt, pIdx) => (
                  <button 
                    key={pIdx} 
                    className="assistant-prompt-pill"
                    onClick={() => handleSendMessage(prompt)}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            activeSession.messages.map((msg, idx) => (
              <div key={idx} className={`assistant-message-row ${msg.role}`}>
                <div className="assistant-message-bubble">
                  {msg.role === "assistant" && msg.content && !msg.content.startsWith("⚠️") && (
                    <div className="assistant-meta" style={{ justifyContent: 'flex-end' }}>
                      <button 
                        className={`assistant-tts-btn ${playingAudioIndex === idx ? 'playing' : ''}`}
                        onClick={() => handlePlayTTS(msg.content, idx)}
                        title="Listen to response"
                      >
                        {playingAudioIndex === idx ? <VolumeX size={13} /> : <Volume2 size={13} />}
                        {playingAudioIndex === idx ? "Stop" : "Listen"}
                      </button>
                    </div>
                  )}

                  {msg.role === "assistant" ? (
                    <div className="assistant-message-text">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.content || "..."}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <div>{msg.content}</div>
                  )}

                  {/* Citations Drawer */}
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="assistant-citations-accordion">
                      <button 
                        className="assistant-citations-toggle"
                        onClick={() => toggleCitation(idx)}
                      >
                        <BookOpen size={13} />
                        {msg.citations.length} Clinical Reference Sources
                        {expandedCitations[idx] ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                      </button>

                      {expandedCitations[idx] && (
                        <div className="assistant-citations-list">
                          {msg.citations.map((cit, cIdx) => (
                            <div key={cIdx} className="assistant-citation-card">
                              <div className="assistant-citation-title">
                                📄 {cit.source || "Clinical Guidance"} (Match score: {((cit.score || 0.85) * 100).toFixed(1)}%)
                              </div>
                              <div className="assistant-citation-snippet">
                                {(cit.text || cit.snippet || "").substring(0, 300)}...
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar (Matching Exact Original Layout) */}
        <div className="assistant-bottom-deck">
          <div className="assistant-input-wrapper">
            <button 
              className={`assistant-mic-btn ${isRecording ? 'recording' : ''}`}
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isTranscribing || isGenerating || isTranslatingChat}
              title={isRecording ? "Stop Recording" : "Speak Query"}
            >
              {isTranscribing ? (
                <Loader2 size={18} className="animate-spin" />
              ) : isRecording ? (
                <MicOff size={18} />
              ) : (
                <Mic size={18} />
              )}
            </button>

            <input 
              type="text" 
              className="assistant-chat-input" 
              placeholder={isTranscribing ? "Transcribing voice audio..." : `Ask healthcare question in ${selectedLanguage}...`}
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              disabled={isGenerating || isTranscribing || isTranslatingChat}
            />

            {isGenerating ? (
              <button className="assistant-action-btn stop" onClick={handleStopGeneration}>
                <Square size={14} /> Stop
              </button>
            ) : (
              <button 
                className="assistant-action-btn send" 
                onClick={() => handleSendMessage()}
                disabled={!inputQuery.trim() || isTranscribing || isTranslatingChat}
              >
                <Send size={14} /> Ask AI
              </button>
            )}
          </div>
          
          <div style={{ fontSize: '0.72rem', color: '#727783', marginTop: '6px', textAlign: 'center' }}>
            <span>⚕️ <strong>Medical Disclaimer:</strong> AI-generated health assistance is for educational and communication purposes. Always consult a licensed healthcare professional for emergencies.</span>
          </div>
        </div>
      </main>
    </div>
  );
}
