/**
 * pdfProcessor.js - Robust Multi-Page PDF to Canvas Converter for OCR.
 * Uses pdfjs-dist with standard worker configuration and canvas fallback.
 */
import * as pdfjsLib from "pdfjs-dist";

// Configure pdfjs worker
try {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs`;
} catch (e) {
  console.warn("PDF.js worker initialization warning:", e);
}

/**
 * Converts a PDF File or Blob into an array of high-DPI HTML5 Canvases
 * @param {File|Blob} pdfFile - Uploaded PDF file
 * @param {number} scale - DPI scale factor (default 2.5 for crisp OCR text)
 * @returns {Promise<{ canvases: HTMLCanvasElement[], numPages: number, pageThumbnails: string[], extractedText: string }>}
 */
export async function renderPdfToCanvases(pdfFile, scale = 2.5) {
  const arrayBuffer = await pdfFile.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
    cMapUrl: "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/cmaps/",
    cMapPacked: true,
  });

  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;
  const canvases = [];
  const pageThumbnails = [];
  let extractedNativeText = "";

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale });

    // Create high-res canvas for OCR
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    // Fill white background to prevent transparent PDF artifacts
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({
      canvasContext: ctx,
      viewport,
      intent: "print",
    }).promise;

    canvases.push(canvas);

    // Create thumbnail data URL for UI preview
    try {
      const thumbCanvas = document.createElement("canvas");
      const thumbViewport = page.getViewport({ scale: 0.35 });
      thumbCanvas.width = thumbViewport.width;
      thumbCanvas.height = thumbViewport.height;
      const thumbCtx = thumbCanvas.getContext("2d");
      thumbCtx.fillStyle = "#ffffff";
      thumbCtx.fillRect(0, 0, thumbCanvas.width, thumbCanvas.height);
      await page.render({
        canvasContext: thumbCtx,
        viewport: thumbViewport,
      }).promise;
      pageThumbnails.push(thumbCanvas.toDataURL("image/jpeg", 0.8));
    } catch (_) {
      pageThumbnails.push(canvas.toDataURL("image/jpeg", 0.4));
    }

    // Try extracting native embedded text layer if available
    try {
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item) => item.str)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      if (pageText) {
        extractedNativeText += `--- Page ${pageNum} ---\n` + pageText + "\n\n";
      }
    } catch (err) {
      console.warn(`Could not extract native text layer from PDF page ${pageNum}:`, err);
    }
  }

  return {
    canvases,
    numPages,
    pageThumbnails,
    extractedNativeText: extractedNativeText.trim(),
  };
}
