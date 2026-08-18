import React, { useState } from "react";
import toast from "react-hot-toast";

export default function TelehealthCallModal({ isOpen, onClose, doctorName = "Dr. Sarah Jenkins" }) {
  if (!isOpen) return null;

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [activeTab, setActiveTab] = useState("telemetry"); // telemetry | chat | notes
  const [messages, setMessages] = useState([
    { sender: "doctor", text: "Hello Alex! I see your blood pressure is looking very stable today (118/76). How have you been feeling?", time: "10:01 AM" }
  ]);
  const [chatInput, setChatInput] = useState("");

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const userMsg = { sender: "user", text: chatInput, time: "Just now" };
    setMessages((prev) => [...prev, userMsg]);
    setChatInput("");

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { sender: "doctor", text: "Got it! Keep taking your Lisinopril 10mg every morning with breakfast. Let's review the ECG in 2 weeks.", time: "Just now" }
      ]);
    }, 1200);
  };

  const handleEndCall = () => {
    toast.success("Telehealth consultation session ended. Clinical summary saved! 🩺");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div 
        className="bg-surface-container-lowest w-full max-w-4xl h-[90vh] rounded-3xl border border-outline-variant shadow-floating flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="bg-primary text-white px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 bg-secondary-fixed rounded-full animate-ping"></span>
            <div>
              <h3 className="font-manrope text-base font-bold flex items-center gap-2">
                <span>Telehealth Call with {doctorName}</span>
                <span className="px-2 py-0.5 bg-white/20 text-[10px] font-mono rounded-full">Encrypted HD</span>
              </h3>
              <p className="text-[11px] text-primary-fixed-dim">Session ID: #MED-TLH-78291 • Duration: 04:12</p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Video & Telemetry Split Screen */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 min-h-0 bg-black">
          
          {/* Main Doctor Video Feed */}
          <div className="lg:col-span-2 relative bg-surface-container-highest flex items-center justify-center overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=800&auto=format&fit=crop&q=80"
              alt="Doctor Video"
              className="w-full h-full object-cover opacity-95"
            />
            
            {/* Doctor Name Tag Overlay */}
            <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md text-white px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-2 text-xs font-bold">
              <span className="material-symbols-outlined text-sm text-secondary-fixed">verified</span>
              <span>{doctorName} (Cardiology)</span>
            </div>

            {/* Patient Self Video PiP */}
            <div className="absolute bottom-4 right-4 w-32 h-24 sm:w-44 sm:h-32 rounded-2xl overflow-hidden border-2 border-white shadow-2xl bg-black">
              {isVideoOff ? (
                <div className="w-full h-full bg-slate-800 flex items-center justify-center text-white text-xs">
                  Camera Off
                </div>
              ) : (
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80"
                  alt="Patient Self View"
                  className="w-full h-full object-cover"
                />
              )}
              <div className="absolute bottom-1 left-2 text-[10px] text-white font-bold bg-black/60 px-1.5 rounded">
                You (Alex)
              </div>
            </div>
          </div>

          {/* Side Panel: Telemetry & Live Chat */}
          <div className="hidden lg:flex flex-col bg-surface-container-lowest border-l border-outline-variant">
            {/* Tab Switches */}
            <div className="flex border-b border-outline-variant bg-surface-container-low text-xs font-bold">
              <button
                onClick={() => setActiveTab("telemetry")}
                className={`flex-1 py-3 text-center border-b-2 transition-colors ${
                  activeTab === "telemetry"
                    ? "border-primary text-primary bg-white"
                    : "border-transparent text-on-surface-variant hover:text-on-surface"
                }`}
              >
                Live Vitals
              </button>
              <button
                onClick={() => setActiveTab("chat")}
                className={`flex-1 py-3 text-center border-b-2 transition-colors ${
                  activeTab === "chat"
                    ? "border-primary text-primary bg-white"
                    : "border-transparent text-on-surface-variant hover:text-on-surface"
                }`}
              >
                Live Chat
              </button>
            </div>

            {/* Telemetry Tab Content */}
            {activeTab === "telemetry" && (
              <div className="p-4 space-y-3 flex-1 overflow-y-auto">
                <div className="p-3 rounded-2xl bg-secondary-container/40 border border-secondary-fixed-dim">
                  <div className="flex justify-between items-center text-xs font-bold text-on-secondary-container mb-1">
                    <span>Blood Pressure</span>
                    <span className="material-symbols-outlined text-sm">monitor_heart</span>
                  </div>
                  <p className="font-manrope text-2xl font-bold text-on-surface">118 / 76 <span className="text-xs font-normal">mmHg</span></p>
                  <p className="text-[11px] text-secondary font-bold mt-1">✓ Optimal resting zone</p>
                </div>

                <div className="p-3 rounded-2xl bg-surface-container-low border border-outline-variant">
                  <div className="flex justify-between items-center text-xs font-bold text-on-surface-variant mb-1">
                    <span>Heart Rate (Live ECG)</span>
                    <span className="material-symbols-outlined text-sm text-error">favorite</span>
                  </div>
                  <p className="font-manrope text-2xl font-bold text-on-surface">68 <span className="text-xs font-normal">bpm</span></p>
                  <p className="text-[11px] text-on-surface-variant mt-1">Normal sinus rhythm</p>
                </div>

                <div className="p-3 rounded-2xl bg-surface-container-low border border-outline-variant">
                  <div className="flex justify-between items-center text-xs font-bold text-on-surface-variant mb-1">
                    <span>Active Rx Being Reviewed</span>
                    <span className="material-symbols-outlined text-sm text-primary">medication</span>
                  </div>
                  <p className="text-xs font-bold text-on-surface">Lisinopril 10mg</p>
                  <p className="text-[11px] text-on-surface-variant">Daily with food • Adherence: 100%</p>
                </div>
              </div>
            )}

            {/* Chat Tab Content */}
            {activeTab === "chat" && (
              <div className="flex flex-col flex-1 min-h-0">
                <div className="flex-1 p-3 space-y-2 overflow-y-auto text-xs">
                  {messages.map((m, i) => (
                    <div
                      key={i}
                      className={`p-2.5 rounded-2xl max-w-[85%] ${
                        m.sender === "user"
                          ? "bg-primary text-white ml-auto"
                          : "bg-surface-container-low text-on-surface mr-auto border border-outline-variant"
                      }`}
                    >
                      <p>{m.text}</p>
                      <span className="text-[9px] opacity-70 block mt-1 text-right">{m.time}</span>
                    </div>
                  ))}
                </div>
                <form onSubmit={handleSendMessage} className="p-2 border-t border-outline-variant flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Type message to doctor..."
                    className="flex-1 bg-surface-container-low border border-outline-variant rounded-full px-3 py-1.5 text-xs outline-none focus:border-primary"
                  />
                  <button type="submit" className="p-2 bg-primary text-white rounded-full">
                    <span className="material-symbols-outlined text-sm">send</span>
                  </button>
                </form>
              </div>
            )}

          </div>

        </div>

        {/* Video Control Bar */}
        <div className="bg-surface-container-lowest border-t border-outline-variant px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className={`p-3 rounded-full border transition-colors ${
                isMuted ? "bg-error text-white border-error" : "bg-surface-container hover:bg-surface-variant text-on-surface"
              }`}
              title={isMuted ? "Unmute Mic" : "Mute Mic"}
            >
              <span className="material-symbols-outlined text-xl">
                {isMuted ? "mic_off" : "mic"}
              </span>
            </button>

            <button
              onClick={() => setIsVideoOff(!isVideoOff)}
              className={`p-3 rounded-full border transition-colors ${
                isVideoOff ? "bg-error text-white border-error" : "bg-surface-container hover:bg-surface-variant text-on-surface"
              }`}
              title={isVideoOff ? "Turn Video On" : "Turn Video Off"}
            >
              <span className="material-symbols-outlined text-xl">
                {isVideoOff ? "videocam_off" : "videocam"}
              </span>
            </button>
          </div>

          {/* End Call Button */}
          <button
            onClick={handleEndCall}
            className="flex items-center gap-2 bg-error text-white font-bold px-6 py-2.5 rounded-full hover:bg-error/90 transition-all shadow-md active:scale-95"
          >
            <span className="material-symbols-outlined text-xl">call_end</span>
            <span className="text-xs">End Consultation</span>
          </button>
        </div>

      </div>
    </div>
  );
}
