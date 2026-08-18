import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Languages } from "lucide-react";
import { priorityLanguages, allNllbLanguages } from "@/pages/landing/nllbLanguages";
import { useLanguage } from "@/contexts/LanguageContext";
import toast from "react-hot-toast";

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filteredLanguages = search
    ? allNllbLanguages.filter((lang) =>
        lang.label.toLowerCase().includes(search.toLowerCase())
      )
    : priorityLanguages;

  function handleSelect(option) {
    setLanguage(option);
    setOpen(false);
    setSearch("");
    toast.success(`Language set to ${option.label}! 🌐`);
  }

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        className="border-outline-variant text-on-surface bg-surface-container-lowest hover:bg-surface-container rounded-full text-xs font-bold px-3 py-1.5 shadow-xs"
        onClick={() => setOpen(!open)}
      >
        <Languages className="h-3.5 w-3.5 mr-1.5 text-primary" />
        <span className="truncate max-w-[100px]">{language?.label?.split(" ")[0] || "English"}</span>
      </Button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-floating overflow-hidden z-50 animate-fade-in">
          <div className="p-2 border-b border-outline-variant/60">
            <input
              type="text"
              placeholder="Search language..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-surface-container-low border border-outline-variant rounded-xl text-on-surface focus:outline-none focus:border-primary"
              autoFocus
            />
          </div>
          <div className="max-h-64 overflow-y-auto p-1 space-y-0.5">
            {filteredLanguages.length === 0 && (
              <p className="px-4 py-3 text-xs text-on-surface-variant text-center">No languages found</p>
            )}
            {filteredLanguages.map((option) => (
              <button
                key={option.code}
                onClick={() => handleSelect(option)}
                className={`block w-full text-left px-3 py-2 text-xs font-semibold rounded-xl transition-colors ${
                  language?.code === option.code
                    ? "bg-primary-fixed text-on-primary-fixed font-bold"
                    : "text-on-surface hover:bg-surface-container-low"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}