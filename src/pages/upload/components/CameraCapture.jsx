import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Camera, X, RefreshCw, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";

function CameraCapture({ onCapture, onClose }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [facingMode, setFacingMode] = useState("environment"); // 'environment' (back) or 'user' (front)
  const [snapshotBlob, setSnapshotBlob] = useState(null);
  const [snapshotUrl, setSnapshotUrl] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const startStream = async (mode = "environment") => {
    setIsLoading(true);
    setError("");

    // Stop previous tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }

    try {
      const constraints = {
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsLoading(false);
    } catch (err) {
      console.warn("Camera ideal constraints failed, falling back to basic:", err);
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true });
        streamRef.current = fallbackStream;
        if (videoRef.current) {
          videoRef.current.srcObject = fallbackStream;
          videoRef.current.play();
        }
        setIsLoading(false);
      } catch (finalErr) {
        console.error("Camera access error:", finalErr);
        setError("Camera permission denied or camera not available. Please allow camera access in your browser settings.");
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    startStream(facingMode);
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [facingMode]);

  const flipCamera = () => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");

    // Fill white background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          const file = new File([blob], `prescription-cam-${Date.now()}.jpg`, {
            type: "image/jpeg",
          });
          setSnapshotBlob(file);
          setSnapshotUrl(URL.createObjectURL(blob));
        }
      },
      "image/jpeg",
      0.95
    );
  };

  const retakePhoto = () => {
    if (snapshotUrl) {
      URL.revokeObjectURL(snapshotUrl);
    }
    setSnapshotBlob(null);
    setSnapshotUrl(null);
    startStream(facingMode);
  };

  const confirmPhoto = () => {
    if (snapshotBlob) {
      onCapture(snapshotBlob);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-3xl bg-slate-900 border border-slate-700 p-5 shadow-2xl text-slate-100 space-y-4">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Camera className="text-emerald-400 h-5 w-5" />
            <h3 className="text-base font-bold text-white">
              Medical Document Camera Scanner
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Camera or Snapshot View */}
        <div className="relative rounded-2xl overflow-hidden bg-black aspect-[4/3] flex items-center justify-center border border-slate-800">
          {error ? (
            <div className="p-6 text-center text-rose-300 space-y-2">
              <AlertCircle size={32} className="mx-auto text-rose-400" />
              <p className="text-xs font-semibold">{error}</p>
            </div>
          ) : snapshotUrl ? (
            <img
              src={snapshotUrl}
              alt="Snapshot"
              className="w-full h-full object-contain"
            />
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {/* Prescription Framing Overlay Box */}
              <div className="absolute inset-4 border-2 border-emerald-400/60 rounded-xl pointer-events-none flex flex-col justify-between p-3">
                <span className="text-[10px] font-bold text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded w-fit">
                  Align Prescription Here
                </span>
                <span className="text-[10px] text-slate-300 text-center bg-black/60 px-2 py-0.5 rounded">
                  Hold steady in good light for best OCR accuracy
                </span>
              </div>
            </>
          )}

          {isLoading && !error && !snapshotUrl && (
            <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center text-xs text-emerald-400 gap-2">
              <RefreshCw size={24} className="animate-spin" />
              <span>Starting camera stream...</span>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between gap-3 pt-2">
          {!snapshotUrl ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={flipCamera}
                className="border-slate-700 bg-slate-800 text-xs text-slate-200"
              >
                <RefreshCw size={14} className="mr-1.5" />
                Switch Camera ({facingMode === "environment" ? "Back" : "Front"})
              </Button>

              <Button
                type="button"
                onClick={capturePhoto}
                disabled={isLoading || !!error}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-5 shadow-lg"
              >
                <Camera size={15} className="mr-1.5" />
                Capture Prescription
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={retakePhoto}
                className="border-slate-700 bg-slate-800 text-xs text-slate-200"
              >
                <RefreshCw size={14} className="mr-1.5" /> Retake
              </Button>

              <Button
                type="button"
                onClick={confirmPhoto}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-5 shadow-lg"
              >
                <CheckCircle2 size={15} className="mr-1.5" /> Use This Photo for OCR
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default CameraCapture;