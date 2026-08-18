import { Languages, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ActionToolbarProps {
  language: string;
  onLanguageChange: (value: string) => void;
  onTranslate: () => void;
  onSimplify: () => void;
}

export function ActionToolbar({ language, onLanguageChange, onTranslate, onSimplify }: ActionToolbarProps) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center justify-between w-full p-4 mb-6 rounded-2xl bg-card border border-primary/10 shadow-lg animate-in fade-in slide-in-from-top-4 duration-500">
      
      {/* Left Side: Language Selector */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-muted-foreground text-sm font-medium">
          <Languages className="w-4 h-4" />
          <span>Translate to</span>
        </div>
        
        <Select value={language} onValueChange={onLanguageChange}>
          <SelectTrigger className="w-[140px] h-11 bg-background border-border">
            <SelectValue placeholder="Select Language" />
          </SelectTrigger>
          <SelectContent className="max-h-72 overflow-y-auto">
            <SelectItem value="en">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase text-primary">EN</span>
                <span className="font-semibold">English</span>
              </div>
            </SelectItem>
            <SelectItem value="hi">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase text-muted-foreground">HI</span>
                <span>Hindi (हिन्दी)</span>
              </div>
            </SelectItem>
            <SelectItem value="bn">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase text-muted-foreground">BN</span>
                <span>Bengali (বাংলা)</span>
              </div>
            </SelectItem>
            <SelectItem value="mr">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase text-muted-foreground">MR</span>
                <span>Marathi (मराठी)</span>
              </div>
            </SelectItem>
            <SelectItem value="te">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase text-muted-foreground">TE</span>
                <span>Telugu (తెలుగు)</span>
              </div>
            </SelectItem>
            <SelectItem value="ta">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase text-muted-foreground">TA</span>
                <span>Tamil (தமிழ்)</span>
              </div>
            </SelectItem>
            <SelectItem value="kn">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase text-muted-foreground">KN</span>
                <span>Kannada (ಕನ್ನಡ)</span>
              </div>
            </SelectItem>
            <SelectItem value="gu">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase text-muted-foreground">GU</span>
                <span>Gujarati (ગુજરાતી)</span>
              </div>
            </SelectItem>
            <SelectItem value="ml">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase text-muted-foreground">ML</span>
                <span>Malayalam (മലയാളം)</span>
              </div>
            </SelectItem>
            <SelectItem value="pa">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase text-muted-foreground">PA</span>
                <span>Punjabi (ਪੰਜਾਬੀ)</span>
              </div>
            </SelectItem>
            <SelectItem value="or">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase text-muted-foreground">OR</span>
                <span>Odia (ଓଡ଼ିଆ)</span>
              </div>
            </SelectItem>
            <SelectItem value="es">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase text-muted-foreground">ES</span>
                <span>Spanish (Español)</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Right Side: Actions */}
      <div className="flex items-center gap-3 mt-4 md:mt-0">
        <Button onClick={onSimplify} variant="outline" className="h-11 flex items-center gap-2 hover:bg-secondary text-foreground">
          <Sparkles className="w-4 h-4" />
          Simplify
        </Button>
        <Button onClick={onTranslate} className="h-11 flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
          <Languages className="w-4 h-4" />
          Translate
        </Button>
      </div>

    </div>
  );
}
