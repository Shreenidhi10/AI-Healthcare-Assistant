import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { adaptToResultData, convertResultDataToMarkdown, localizedHeaders } from "@/lib/dataAdapter";
import { ResultHeader } from "./results/ResultHeader";
import { ResultContent } from "./results/ResultContent";
import { downloadFileSafe } from "@/utils/mobileDownloadHelper";

export function ResultPanel({ language = "hi", isTranslating = false, resultData = null }) {
  const [copied, setCopied] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // Clean data adapter: finalResult is ALWAYS a single structured object regardless of source
  const finalResult = adaptToResultData(resultData, language);
  const headers = localizedHeaders[language] || localizedHeaders['hi'];

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3000);
  };

  const handleCopy = async () => {
    try {
      const markdown = convertResultDataToMarkdown(finalResult, language);
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy", err);
    }
  };

  const handleShare = async () => {
    const markdown = convertResultDataToMarkdown(finalResult, language);
    if (navigator.share) {
      try {
        await navigator.share({
          title: "AI Simplified Result",
          text: markdown,
        });
      } catch (err) {
        if (err.name !== "AbortError") {
          handleCopy();
          showToast("Result copied. Share anywhere.");
        }
      }
    } else {
      handleCopy();
      showToast("Result copied. Share anywhere.");
    }
  };

  const handleDownload = async () => {
    const markdown = convertResultDataToMarkdown(finalResult, language);
    await downloadFileSafe("HEALTHBUDDY-medical-summary.txt", markdown, "text/plain;charset=utf-8");
  };

  return (
    <Card className="relative flex flex-col flex-1 min-h-0 overflow-hidden transition-all duration-500 animate-in fade-in slide-in-from-bottom-4 shadow-xl rounded-2xl bg-card border border-primary/20">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-foreground text-background px-4 py-2 rounded-full text-sm font-medium shadow-lg border animate-in fade-in slide-in-from-top-4">
          {toastMessage}
        </div>
      )}

      {/* Header stays fixed at the top of the card */}
      <ResultHeader 
        copied={copied} 
        onCopy={handleCopy} 
        onShare={handleShare} 
        onDownload={handleDownload} 
      />

      {/* Content Area scrolls internally */}
      <div className="flex-1 min-h-0 bg-card overflow-y-auto custom-scrollbar">
        <ResultContent 
          isTranslating={isTranslating} 
          resultData={finalResult} 
          headers={headers} 
        />
      </div>
    </Card>
  );
}
