import { useState, useRef, useEffect } from "react";
import Tesseract from "tesseract.js";
import UploadSection from "./components/UploadSection";
import ImagePreview from "./components/ImagePreview";
import OCRResult from "./components/OCRResult";
import Spinner from "./components/Spinner";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import toast from "react-hot-toast";
import { renderPdfToCanvases } from "./utils/pdfProcessor";
import { enhanceImageForOcr, canvasToBlob } from "./utils/imageEnhancer";
import { generateSampleCanvas } from "./utils/samplePrescriptions";
import { useLanguage } from "@/contexts/LanguageContext";

const TESSERACT_TO_NLLB = {
  eng: { code: "eng_Latn", label: "English" },
  hin: { code: "hin_Deva", label: "हिंदी (Hindi)" },
  ben: { code: "ben_Beng", label: "বাংলা (Bengali)" },
  mar: { code: "mar_Deva", label: "मराठी (Marathi)" },
  tam: { code: "tam_Taml", label: "தமிழ் (Tamil)" },
  tel: { code: "tel_Telu", label: "తెలుగు (Telugu)" },
  kan: { code: "kan_Knda", label: "ಕನ್ನಡ (Kannada)" },
  guj: { code: "guj_Gujr", label: "ગુજરાતી (Gujarati)" },
  mal: { code: "mal_Mlym", label: "മലയാളം (Malayalam)" },
  pan: { code: "pan_Guru", label: "ਪੰਜਾਬੀ (Punjabi)" },
};

const NLLB_PREFIX_TO_TESSERACT = {
  eng: "eng",
  hin: "hin",
  ben: "ben",
  mar: "mar",
  tam: "tam",
  tel: "tel",
  kan: "kan",
  guj: "guj",
  mal: "mal",
  pan: "pan",
};

export default function Upload() {
  const { language, setLanguage, t } = useLanguage();

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [fileType, setFileType] = useState(null);
  const [activeFileName, setActiveFileName] = useState("");
  const [activeFileSize, setActiveFileSize] = useState("");

  // Multi-page PDF state
  const [pdfCanvases, setPdfCanvases] = useState([]);
  const [activePage, setActivePage] = useState(0);
  const [pageThumbnails, setPageThumbnails] = useState([]);

  // Preprocessing & Image filter state
  const [imageFilters, setImageFilters] = useState({
    rotation: 0,
    grayscale: false,
    highContrast: false,
    invert: false,
  });

  // OCR Execution & Result state
  const [ocrLanguage, setOcrLanguage] = useState(() => {
    if (language?.code) {
      const prefix = language.code.split("_")[0];
      return NLLB_PREFIX_TO_TESSERACT[prefix] || "eng";
    }
    return "eng";
  });
  const [ocrResult, setOcrResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState("");

  // Sync with global language changes
  useEffect(() => {
    if (language?.code) {
      const prefix = language.code.split("_")[0];
      const tessCode = NLLB_PREFIX_TO_TESSERACT[prefix] || "eng";
      setOcrLanguage(tessCode);
    }
  }, [language]);

  const handleLanguageChange = (newTessCode) => {
    setOcrLanguage(newTessCode);
    const nllbMatch = TESSERACT_TO_NLLB[newTessCode];
    if (nllbMatch) {
      setLanguage(nllbMatch);
      toast.success(`Language set to ${nllbMatch.label}! 🌐`);
    }
  };

  // Master file selection handler
  const handleImageChange = async (event) => {
    const selectedFile = event.target.files[0];
    if (!selectedFile) return;

    setImageFile(selectedFile);
    setFileType(selectedFile.type);
    setActiveFileName(selectedFile.name);
    setActiveFileSize((selectedFile.size / (1024 * 1024)).toFixed(2) + " MB");
    setError("");
    setOcrResult("");
    setProgress(0);
    setPdfCanvases([]);
    setPageThumbnails([]);
    setActivePage(0);

    const isPdf = selectedFile.type === "application/pdf" || selectedFile.name.toLowerCase().endsWith(".pdf");

    if (isPdf) {
      setImagePreview(null);
      setStatusMessage("Rendering PDF pages for OCR...");
      try {
        const { canvases, numPages, pageThumbnails: thumbs } = await renderPdfToCanvases(selectedFile, 2.5);
        setPdfCanvases(canvases);
        setPageThumbnails(thumbs);
        toast.success(`Loaded ${numPages} PDF page${numPages > 1 ? "s" : ""}`);
      } catch (err) {
        console.error("PDF render error:", err);
        toast.error("Could not render PDF. Please try an image format.");
      }
    } else {
      const url = URL.createObjectURL(selectedFile);
      setImagePreview(url);
    }
  };

  // 1-Click Sample Prescription Loader
  const handleLoadSample = (sample) => {
    setError("");
    setOcrResult("");
    setProgress(0);
    setActiveFileName(sample.title);
    setActiveFileSize("Sample Rx");
    setFileType("image/png");

    const canvas = generateSampleCanvas(sample);
    setPdfCanvases([canvas]);
    setPageThumbnails([canvas.toDataURL("image/png", 0.6)]);
    setActivePage(0);
    setImagePreview(canvas.toDataURL("image/png"));

    canvasToBlob(canvas).then((blob) => {
      const file = new File([blob], `${sample.id}.png`, { type: "image/png" });
      setImageFile(file);
    });

    // Auto load sample text
    setOcrResult(sample.text);
    toast.success(`Loaded sample: ${sample.title}`);
  };

  // Filter change handler
  const handleFilterChange = (newFilters) => {
    setImageFilters((prev) => ({ ...prev, ...newFilters }));
  };

  // Master OCR Extraction Trigger
  const handleExtractText = async () => {
    if (!imageFile && (!pdfCanvases || pdfCanvases.length === 0) && !imagePreview) {
      toast.error("Please upload an image or PDF prescription first.");
      return;
    }

    setLoading(true);
    setProgress(10);
    setStatusMessage("Preparing document canvas & optimizing DPI for OCR...");
    setError("");
    setOcrResult("");

    try {
      let canvasesToOcr = [];

      if (pdfCanvases && pdfCanvases.length > 0) {
        canvasesToOcr = pdfCanvases;
      } else if (imagePreview || imageFile) {
        // Create canvas from image element
        const img = new Image();
        img.crossOrigin = "anonymous";
        const imgLoaded = new Promise((res, rej) => {
          img.onload = () => res();
          img.onerror = (e) => rej(e);
        });
        img.src = imagePreview || URL.createObjectURL(imageFile);
        await imgLoaded;

        // Apply preprocessing filters
        const enhancedCanvas = enhanceImageForOcr(img, {
          rotation: imageFilters.rotation,
          grayscale: imageFilters.grayscale,
          contrast: imageFilters.highContrast ? 1.45 : 1.0,
          invert: imageFilters.invert,
        });
        canvasesToOcr = [enhancedCanvas];
      }

      if (canvasesToOcr.length === 0) {
        throw new Error("No readable image frames available for OCR scanning.");
      }

      let aggregatedText = "";
      const totalPages = canvasesToOcr.length;

      for (let i = 0; i < totalPages; i++) {
        const currentCanvas = canvasesToOcr[i];
        const pageNum = i + 1;

        setStatusMessage(`Scanning page ${pageNum} of ${totalPages} (Language: ${ocrLanguage})...`);
        const baseProgress = 15 + Math.round((i / totalPages) * 75);
        setProgress(baseProgress);

        // Run Tesseract Optical Character Recognition
        const result = await Tesseract.recognize(currentCanvas, ocrLanguage, {
          logger: (m) => {
            if (m.status === "recognizing text" && typeof m.progress === "number") {
              const currentStep = Math.round(m.progress * (75 / totalPages));
              setProgress(Math.min(95, baseProgress + currentStep));
              setStatusMessage(`Scanning page ${pageNum}: Recognizing characters ${Math.round(m.progress * 100)}%`);
            }
          },
        });

        const pageText = result.data?.text ? result.data.text.trim() : "";
        if (pageText) {
          if (totalPages > 1) {
            aggregatedText += `--- PAGE ${pageNum} ---\n` + pageText + "\n\n";
          } else {
            aggregatedText += pageText + "\n";
          }
        }
      }

      const finalCleanText = aggregatedText.trim();

      if (!finalCleanText || finalCleanText.length < 5) {
        setError("No readable text could be recognized. Please check lighting, rotate if inverted, or try a clearer prescription photo.");
        toast.error("No readable text found");
        setLoading(false);
        return;
      }

      setProgress(98);
      setStatusMessage("Extracting structured medical entities, medicines & dosage schedule...");
      
      setTimeout(() => {
        setOcrResult(finalCleanText);
        setLoading(false);
        setProgress(100);
        toast.success("Prescription OCR scan completed successfully!");
      }, 250);
    } catch (err) {
      console.error("OCR Extraction Error:", err);
      setError(`Extraction failed: ${err.message || "Unknown error"}. Make sure the image is sharp and legible.`);
      toast.error("OCR Scan failed. Please retry.");
      setLoading(false);
      setProgress(0);
    }
  };

  return (
    <div className="w-full max-w-full space-y-6 animate-fade-in text-on-surface">
      <div className="w-full max-w-full">
        <Card className="border-outline-variant bg-surface-container-lowest shadow-card overflow-hidden rounded-3xl">
          <CardContent className="p-4 sm:p-7 space-y-6">
            
            {/* Upload Section with Drag & Drop, Samples & Controls */}
            <UploadSection
              onImageChange={handleImageChange}
              onExtract={handleExtractText}
              onLoadSample={handleLoadSample}
              selectedLanguage={ocrLanguage}
              onLanguageChange={handleLanguageChange}
              imageFilters={imageFilters}
              onFilterChange={handleFilterChange}
              activeFileName={activeFileName}
              activeFileSize={activeFileSize}
              isProcessing={loading}
            />

            {/* Document / Canvas Preview */}
            <ImagePreview
              image={imagePreview}
              fileType={fileType}
              canvases={pdfCanvases}
              activePage={activePage}
              onPageChange={setActivePage}
              pageThumbnails={pageThumbnails}
              filters={imageFilters}
            />

            {/* Loading / Progress Animation */}
            {loading && (
              <div className="my-6 p-5 rounded-2xl bg-surface-container-low border border-primary/30 space-y-3 animate-fade-in">
                <Spinner />
                <Progress value={progress} className="h-2 bg-surface-container-high" />
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-primary">{statusMessage || "Extracting text..."}</span>
                  <span className="text-on-surface-variant">{progress}%</span>
                </div>
              </div>
            )}

            {/* Error Notification */}
            {error && (
              <div className="rounded-2xl border border-error/30 bg-error-container/40 p-4 text-on-error-container text-xs flex items-start gap-2.5 shadow-sm">
                <span className="text-error font-bold text-sm">⚠️</span>
                <div>
                  <p className="font-bold text-error">OCR Extraction Notice</p>
                  <p className="mt-0.5">{error}</p>
                </div>
              </div>
            )}

            {/* Structured OCR Results & Medical Cards */}
            <OCRResult result={ocrResult} onResultChange={setOcrResult} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}