import { useEffect, useState } from "react";
import { Moon, Stethoscope, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AppHeader() {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("theme");
      if (saved === "light" || saved === "dark") return saved;
    }
    return "light";
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  return (
    <header className="border-b bg-card">
      <div className="container flex flex-col gap-2 py-6 sm:flex-row sm:items-center sm:justify-between sm:py-8">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Stethoscope className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h1 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">
              ClarityCare
            </h1>
            <p className="text-sm text-muted-foreground">
              Turn medical text into words your patients understand
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
          >
            {theme === "light" ? (
              <Moon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            ) : (
              <Sun className="h-5 w-5 text-amber-500" aria-hidden="true" />
            )}
          </Button>
        </div>
      </div>
    </header>
  );
}
