import { useState } from "react";
// @ts-ignore
import { ResultPanel } from "@/components/healthcare/ResultPanel";
import { ActionToolbar } from "@/components/healthcare/ActionToolbar";

export function Workspace() {
  const [selectedLanguage, setSelectedLanguage] = useState("hi");
  const [resultLanguage, setResultLanguage] = useState("hi");
  const [isTranslating, setIsTranslating] = useState(false);

  // Upload Module Integration
  // OCR Integration
  // Simplification Integration
  // Translation Integration
  const [resultData, _setResultData] = useState(null);

  const handleTranslate = () => {
    setIsTranslating(true);
    setTimeout(() => {
      setResultLanguage(selectedLanguage);
      setIsTranslating(false);
    }, 1000);
  };

  const handleSimplify = () => {
    setIsTranslating(true);
    setTimeout(() => {
      setResultLanguage('en');
      setIsTranslating(false);
    }, 1000);
  };

  return (
    <div className="container max-w-[85%] py-8 h-[calc(100vh-8rem)] flex flex-col">
      <ActionToolbar
        language={selectedLanguage}
        onLanguageChange={setSelectedLanguage}
        onTranslate={handleTranslate}
        onSimplify={handleSimplify}
      />
      <ResultPanel 
        language={resultLanguage} 
        isTranslating={isTranslating} 
        resultData={resultData}
      />
    </div>
  );
}
