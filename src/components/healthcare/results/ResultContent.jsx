import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export function ResultContent({ isTranslating, resultData, headers }) {
  if (isTranslating) {
    return (
      <div className="space-y-4 animate-pulse result-content p-6">
        <Skeleton className="h-7 w-3/4 mb-3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <div className="space-y-3 mt-6">
          <Skeleton className="h-5 w-1/4 mb-3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        <div className="space-y-3 mt-6">
          <Skeleton className="h-5 w-1/3 mb-3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    );
  }

  return (
    <div
      className="result-content text-foreground animate-in fade-in slide-in-from-bottom-2 duration-700 px-8 py-6 text-[18px] leading-[1.8]"
      style={{
        margin: '0',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        boxSizing: 'border-box'
      }}
    >
      {headers.title && (
        <h1 className="text-2xl font-display font-bold text-foreground mb-6 tracking-tight">
          {headers.title}
        </h1>
      )}

      {resultData.summary && (
        <p className="mb-6 text-muted-foreground">{resultData.summary}</p>
      )}

      {resultData.keyFindings?.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-display font-semibold text-primary mb-2">
            {headers.keyFindings}
          </h2>
          <div className="space-y-1 text-muted-foreground">
            {resultData.keyFindings.map((item, i) => (
              <div key={`kf-${i}`}>
                {item}
              </div>
            ))}
          </div>
        </div>
      )}

      {resultData.interpretation && (
        <div className="mb-6">
          <h2 className="text-lg font-display font-semibold text-primary mb-2">
            {headers.interpretation}
          </h2>
          <p className="text-muted-foreground">{resultData.interpretation}</p>
        </div>
      )}

      {resultData.recommendations?.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-display font-semibold text-primary mb-2">
            {headers.recommendations}
          </h2>
          <div className="space-y-1 text-muted-foreground">
            {resultData.recommendations.map((item, i) => (
              <div key={`rec-${i}`}>
                {item}
              </div>
            ))}
          </div>
        </div>
      )}

      {resultData.doctorAdvice?.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-display font-semibold text-primary mb-2">
            {headers.doctorAdvice}
          </h2>
          <div className="space-y-1 text-muted-foreground">
            {resultData.doctorAdvice.map((item, i) => (
              <div key={`da-${i}`}>
                {item}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
