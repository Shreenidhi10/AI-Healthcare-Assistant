import { createContext, useContext, useState } from "react";
import { priorityLanguages } from "@/pages/landing/nllbLanguages";
import { getTranslatedText } from "@/services/appTranslations";

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    try {
      const saved = localStorage.getItem("healthbuddy_selected_language");
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return priorityLanguages[0];
  });
  const [translations, setTranslations] = useState({});
  const [translating, setTranslating] = useState(false);

  const handleSetLanguage = (newLang) => {
    setLanguage(newLang);
    try {
      localStorage.setItem("healthbuddy_selected_language", JSON.stringify(newLang));
    } catch (_) {}
  };

  function t(text) {
    if (!text || typeof text !== "string") return text;
    if (!language || language.code === "eng_Latn") return text;

    // 1. Check local high-precision dictionary
    const localTranslation = getTranslatedText(text, language.code);
    if (localTranslation && localTranslation !== text) {
      return localTranslation;
    }

    // 2. Check dynamic runtime translations cache
    if (translations[text]) {
      return translations[text];
    }

    return text;
  }

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage: handleSetLanguage,
        translations,
        setTranslations,
        translating,
        setTranslating,
        t,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    return {
      language: priorityLanguages[0],
      setLanguage: () => {},
      translations: {},
      setTranslations: () => {},
      translating: false,
      setTranslating: () => {},
      t: (text) => text,
    };
  }
  return context;
}