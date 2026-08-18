import { HeartPulse, ShieldCheck, Languages, BrainCircuit } from "lucide-react";
import { Link } from "react-router-dom";

export default function AuthLayout({
  title,
  subtitle,
  children,
}) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background font-sans">

      {/* Left Section */}
      <div className="hidden lg:flex flex-col justify-center bg-primary text-white p-16 relative overflow-hidden">
        {/* Subtle glow */}
        <div className="absolute right-0 top-0 w-96 h-96 bg-primary-container rounded-full blur-3xl opacity-20 -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>

        <div className="max-w-lg relative z-10">

          <Link to="/" className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-white text-primary flex items-center justify-center shadow-md">
              <span className="material-symbols-outlined text-3xl font-bold" style={{ fontVariationSettings: "'FILL' 1" }}>
                vital_signs
              </span>
            </div>
            <div>
              <h1 className="text-3xl font-extrabold font-manrope tracking-tight text-white leading-tight">
                HEALTHBUDDY
              </h1>
              <span className="text-xs font-semibold text-primary-fixed uppercase tracking-wider">
                Healthcare AI Assistant
              </span>
            </div>
          </Link>

          <p className="text-base text-primary-fixed leading-relaxed mb-10">
            Intelligent medical assistant empowering patients with verified clinical translations, voice RAG, and instant vital tracking.
          </p>

          <div className="space-y-6">

            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-secondary-fixed flex-shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white font-manrope">HIPAA & SAIF-Grade Security</h3>
                <p className="text-primary-fixed text-xs mt-0.5">
                  End-to-end encrypted storage for electronic health records.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-secondary-fixed flex-shrink-0">
                <Languages className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white font-manrope">10+ Regional Indian Languages</h3>
                <p className="text-primary-fixed text-xs mt-0.5">
                  Full voice and text support in Hindi, Tamil, Telugu, Marathi, and more.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-secondary-fixed flex-shrink-0">
                <BrainCircuit className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white font-manrope">Grounded AI Clinical Triage</h3>
                <p className="text-primary-fixed text-xs mt-0.5">
                  RAG-backed knowledge base verified with clinical guidance.
                </p>
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center justify-center p-6">

        <div className="w-full max-w-md bg-card rounded-3xl shadow-2xl p-10">

          <h2 className="text-3xl font-bold text-foreground mb-2">
            {title}
          </h2>

          <p className="text-muted-foreground mb-8">
            {subtitle}
          </p>

          {children}

          <div className="mt-8 pt-6 border-t border-border text-center text-sm text-muted-foreground">
            <div className="flex justify-center gap-6">
              <a href="#" className="hover:text-primary">
                Privacy Policy
              </a>

              <a href="#" className="hover:text-primary">
                Terms
              </a>

              <a href="#" className="hover:text-primary">
                Support
              </a>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}