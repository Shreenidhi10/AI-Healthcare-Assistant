import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  FileText,
  ChevronLeft,
  ChevronRight,
  Layers,
  Sparkles
} from "lucide-react";

function ImagePreview({
  image,
  fileType,
  canvases = [],
  activePage = 0,
  onPageChange,
  pageThumbnails = [],
  filters = {},
}) {
  const [zoom, setZoom] = useState(1);

  if (!image && (!canvases || canvases.length === 0)) return null;

  const isPdf = fileType === "application/pdf" || (canvases && canvases.length > 0);
  const totalPages = canvases ? canvases.length : 1;

  const handleZoomIn = () => setZoom((prev) => Math.min(2.5, prev + 0.25));
  const handleZoomOut = () => setZoom((prev) => Math.max(0.5, prev - 0.25));
  const handleResetZoom = () => setZoom(1);

  return (
    <Card className="mb-6 border border-slate-700 bg-slate-950/80 text-slate-100 overflow-hidden shadow-2xl rounded-2xl animate-in fade-in duration-300">
      {/* Top Preview Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-900 border-b border-slate-800 text-xs">
        <div className="flex items-center gap-2">
          {isPdf ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/20 text-emerald-300 font-semibold text-[11px] border border-emerald-500/30">
              <Layers size={13} /> Multi-Page PDF Document ({totalPages} {totalPages === 1 ? "Page" : "Pages"})
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-500/20 text-blue-300 font-semibold text-[11px] border border-blue-500/30">
              <FileText size={13} /> Prescription Image Scan
            </span>
          )}

          {/* Active filter tags */}
          {filters?.highContrast && (
            <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-medium border border-amber-500/30">
              High-Contrast Enhanced
            </span>
          )}
          {filters?.rotation > 0 && (
            <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px] font-medium border border-purple-500/30">
              Rotated {filters.rotation}°
            </span>
          )}
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleZoomOut}
            className="h-7 w-7 p-0 text-slate-300 hover:text-white hover:bg-slate-800"
            title="Zoom Out"
          >
            <ZoomOut size={14} />
          </Button>

          <span className="text-[11px] font-mono text-slate-400 px-1">
            {Math.round(zoom * 100)}%
          </span>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleZoomIn}
            className="h-7 w-7 p-0 text-slate-300 hover:text-white hover:bg-slate-800"
            title="Zoom In"
          >
            <ZoomIn size={14} />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleResetZoom}
            className="h-7 px-2 text-[11px] text-slate-300 hover:text-white hover:bg-slate-800"
          >
            Reset
          </Button>
        </div>
      </div>

      {/* Main Canvas / Image Viewport */}
      <CardContent className="p-4 flex flex-col items-center justify-center bg-black/50 overflow-auto min-h-[260px] max-h-[500px]">
        <div
          className="transition-transform duration-200 origin-center flex items-center justify-center"
          style={{ transform: `scale(${zoom})` }}
        >
          {isPdf && canvases && canvases[activePage] ? (
            <div
              className="rounded-xl overflow-hidden shadow-2xl border border-slate-700 bg-white"
              ref={(node) => {
                if (node && canvases[activePage]) {
                  node.innerHTML = "";
                  const canvasClone = canvases[activePage];
                  canvasClone.style.maxWidth = "100%";
                  canvasClone.style.height = "auto";
                  canvasClone.style.display = "block";
                  node.appendChild(canvasClone);
                }
              }}
            />
          ) : (
            <img
              src={image}
              alt="Prescription Scan Preview"
              className="max-w-full max-h-[460px] rounded-xl shadow-2xl border border-slate-700 object-contain bg-white"
            />
          )}
        </div>
      </CardContent>

      {/* Multi-Page PDF Carousel & Thumbnails Strip */}
      {isPdf && totalPages > 1 && (
        <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={activePage === 0}
              onClick={() => onPageChange(Math.max(0, activePage - 1))}
              className="h-8 px-2.5 border-slate-700 bg-slate-800 text-xs text-slate-200 disabled:opacity-40"
            >
              <ChevronLeft size={14} className="mr-1" /> Prev Page
            </Button>

            <span className="text-xs font-semibold text-emerald-400 px-2">
              Page {activePage + 1} of {totalPages}
            </span>

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={activePage === totalPages - 1}
              onClick={() => onPageChange(Math.min(totalPages - 1, activePage + 1))}
              className="h-8 px-2.5 border-slate-700 bg-slate-800 text-xs text-slate-200 disabled:opacity-40"
            >
              Next Page <ChevronRight size={14} className="ml-1" />
            </Button>
          </div>

          {/* Page Thumbnails */}
          {pageThumbnails && pageThumbnails.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto py-1">
              {pageThumbnails.map((thumb, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onPageChange(idx)}
                  className={`w-9 h-12 rounded-lg border-2 overflow-hidden transition-all shrink-0 ${
                    activePage === idx
                      ? "border-emerald-400 shadow-md shadow-emerald-950 scale-105"
                      : "border-slate-700 opacity-60 hover:opacity-100"
                  }`}
                >
                  <img src={thumb} alt={`Page ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

export default ImagePreview;