import React from "react";
import { Copy, Share, Download, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ResultHeader({ copied, onCopy, onShare, onDownload }) {
  return (
    <div className="flex flex-row flex-shrink-0 items-center justify-between py-4 px-6 border-b border-border bg-muted/30">
      <div className="flex items-center gap-2 text-primary font-semibold">
        <span className="w-5 h-5 flex items-center justify-center animate-pulse">🤖</span>
        <span className="font-display">Healthcare Simplified Result</span>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onCopy}
          title="Copy to clipboard"
          className="text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
        >
          {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onShare}
          title="Share result"
          className="text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
        >
          <Share className="w-5 h-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onDownload}
          title="Download as text"
          className="text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
        >
          <Download className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}
