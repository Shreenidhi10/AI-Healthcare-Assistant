import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { LandingInput } from "./LandingInput";
import { LandingAccordion } from "./LandingAccordion";
import { Mail, Phone, MapPin } from "lucide-react";
import { submitContactForm } from "@/services/contact";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

const translatedGreetings = [
  { lang: "Hindi", text: "आपका स्वास्थ्य, आपकी भाषा में" },
  { lang: "Marathi", text: "तुमचं आरोग्य, तुमच्या भाषेत" },
  { lang: "Tamil", text: "உங்கள் ஆரோக்கியம், உங்கள் மொழியில்" },
  { lang: "Telugu", text: "మీ ఆరోగ్యం, మీ భాషలో" },
  { lang: "Kannada", text: "ನಿಮ್ಮ ಆರೋಗ್ಯ, ನಿಮ್ಮ ಭಾಷೆಯಲ್ಲಿ" },
];

function useRotatingIndex(length, intervalMs) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setIndex((p) => (p + 1) % length), intervalMs);
    return () => clearInterval(id);
  }, [length, intervalMs]);
  return index;
}

function Hero() {
  const rotatingIndex = useRotatingIndex(translatedGreetings.length, 2600);
  const { t, translating } = useLanguage();
  const navigate = useNavigate();

  return (
    <section className="px-6 md:px-12 pt-16 pb-20 md:pt-24 md:pb-28 max-w-6xl mx-auto">
      <div className="grid md:grid-cols-2 gap-12 items-center">
        <div>
          <p className="text-xs tracking-[0.2em] uppercase text-[#2F6F5E] font-semibold mb-5">
            {t("Built for rural India")}
          </p>
          <h1 className="font-serif text-4xl md:text-5xl leading-tight text-[#1F2933]">
            {t("Medical advice, explained simply.")}
            <br />
            <span className="text-[#2F6F5E]">{t("In the language you speak.")}</span>
          </h1>
          <p className="mt-6 text-base md:text-lg text-[#4B5563] max-w-md">
            {t(
              "Prescriptions and diagnoses are written for doctors, not patients. Our assistant turns confusing medical text into plain language, then translates it into your regional language — so every patient understands their own care."
            )}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Button
              size="lg"
              className="bg-[#2F6F5E] hover:bg-[#255A4C]"
              onClick={() => navigate("/login")}
            >
              {t("Try it now")}
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="border-[#1F2933]/15 text-[#1F2933]"
              onClick={() =>
                document.getElementById("how-it-works").scrollIntoView({ behavior: "smooth" })
              }
            >
              {t("See how it works")}
            </Button>
          </div>
        </div>
        <Card className="p-8 shadow-sm border-[#1F2933]/10">
          <p className="text-xs uppercase tracking-wide text-[#9CA3AF] mb-4">
            Same message, {translatedGreetings.length} languages
          </p>
          <div className="h-24 flex items-center">
            <p key={rotatingIndex} className="font-serif text-2xl md:text-3xl text-[#1F2933]">
              {translatedGreetings[rotatingIndex].text}
            </p>
          </div>
          <div className="flex gap-2 mt-4">
            {translatedGreetings.map((g, i) => (
              <span
                key={g.lang}
                className={`h-1.5 rounded-full transition-all ${
                  i === rotatingIndex ? "w-6 bg-[#E8A33D]" : "w-1.5 bg-[#1F2933]/10"
                }`}
              />
            ))}
          </div>
          <p className="mt-3 text-sm text-[#9CA3AF]">
            {translatedGreetings[rotatingIndex].lang}
          </p>
        </Card>
      </div>
    </section>
  );
}

const features = [
  { title: "Plain-language simplification", description: "Complex diagnoses and prescriptions are rewritten in everyday words, with every medical term explained." },
  { title: "Regional language translation", description: "Simplified explanations are translated into Hindi, Marathi, Tamil, Telugu, Kannada, and more." },
  { title: "Prescription scanning", description: "Photograph or upload a prescription and let the assistant read and process it automatically." },
  { title: "Personal medical history", description: "Every simplified, translated record is saved to your profile, so you can revisit past visits anytime." },
];

function Features() {
  const { t } = useLanguage();
  return (
    <section id="features" className="px-6 md:px-12 py-20 bg-[#EFF3EC]">
      <div className="max-w-6xl mx-auto">
        <h2 className="font-serif text-3xl text-[#1F2933] mb-12">{t("What the assistant does")}</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f) => (
            <Card key={f.title} className="border-[#1F2933]/8">
              <CardContent className="pt-6">
                <h3 className="font-medium text-[#1F2933] mb-2">{t(f.title)}</h3>
                <p className="text-sm text-[#4B5563] leading-relaxed">{t(f.description)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

const steps = [
  { number: "01", title: "Upload your prescription", description: "Take a photo or upload a PDF of your prescription or medical report." },
  { number: "02", title: "We simplify the medical text", description: "Our model rewrites the jargon into clear, everyday language." },
  { number: "03", title: "Choose your language", description: "Select your regional language for the translated explanation." },
  { number: "04", title: "Read and understand", description: "View your simplified, translated report — and keep it saved for later." },
];

function HowItWorks() {
  const { t } = useLanguage();
  return (
    <section id="how-it-works" className="px-6 md:px-12 py-20 max-w-6xl mx-auto">
      <h2 className="font-serif text-3xl text-[#1F2933] mb-12">{t("How it works")}</h2>
      <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-8">
        {steps.map((step, i) => (
          <div key={step.number} className="relative">
            <p className="font-serif text-4xl text-[#E8A33D] mb-3">{step.number}</p>
            <h3 className="font-medium text-[#1F2933] mb-2">{t(step.title)}</h3>
            <p className="text-sm text-[#4B5563] leading-relaxed">{t(step.description)}</p>
            {i < steps.length - 1 && (
              <div className="hidden md:block absolute top-5 left-full w-8 border-t border-dashed border-[#1F2933]/15" />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

const faqs = [
  { q: "Is my medical information kept private?", a: "Yes. Your prescriptions and reports are only used to generate your simplified, translated summary and are not shared with anyone else." },
  {
  q: "Which languages are supported?",
  a: "We use a translation model (NLLB-200) that supports over 200 languages, including all major Indian regional languages. At launch, we're focusing on Hindi, Marathi, Tamil, Telugu, and Kannada, with more regional languages available as we expand.",
  },
  { q: "Do I need internet access to use this?", a: "Yes, an internet connection is currently required to process and translate your documents." },
  { q: "Can a health worker use this on behalf of a patient?", a: "Yes. ASHA workers and clinic staff can upload documents and share the simplified explanation with patients directly." },
];

function FAQ() {
  const { t } = useLanguage();
  const translatedFaqs = faqs.map((faq) => ({
    q: t(faq.q),
    a: t(faq.a),
  }));

  return (
    <section id="faq" className="px-6 md:px-12 py-20 bg-[#EFF3EC]">
      <div className="max-w-3xl mx-auto">
        <h2 className="font-serif text-3xl text-[#1F2933] mb-8">{t("Frequently asked questions")}</h2>
        <LandingAccordion items={translatedFaqs} />
      </div>
    </section>
  );
}

function Contact() {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({ name: "", email: "", message: "" });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await submitContactForm(formData);
      setSubmitted(true);
    } catch (err) {
      setError(
        err.response?.data?.detail || "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section id="contact" className="px-6 md:px-12 py-20 max-w-6xl mx-auto">
      <div className="grid md:grid-cols-2 gap-12">
        <div>
          <h2 className="font-serif text-3xl text-[#1F2933] mb-4">{t("Get in touch")}</h2>
          <p className="text-[#4B5563] mb-8 max-w-sm">
             {t("Questions about the assistant, partnerships with rural clinics, or feedback on the prototype — we'd like to hear from you.")}
          </p>
          <div className="space-y-4 text-sm text-[#4B5563]">
            <div className="flex items-center gap-3"><Mail className="h-4 w-4 text-[#2F6F5E]" /><span>support@healthexplained.in</span></div>
            <div className="flex items-center gap-3"><Phone className="h-4 w-4 text-[#2F6F5E]" /><span>+91 98765 43210</span></div>
            <div className="flex items-center gap-3"><MapPin className="h-4 w-4 text-[#2F6F5E]" /><span>Pune, Maharashtra, India</span></div>
          </div>
        </div>
        <Card className="border-[#1F2933]/10">
          <CardContent className="pt-6">
            {submitted ? (
              <p className="text-[#2F6F5E] font-medium">{t("Thanks for reaching out — we'll get back to you soon.")}</p>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <LandingInput
                  name="name"
                  placeholder="Your name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
                <LandingInput
                  type="email"
                  name="email"
                  placeholder="Your email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
                <Textarea
                  name="message"
                  placeholder="Your message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                />
                {error && <p className="text-sm text-red-600">{error}</p>}
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#2F6F5E] hover:bg-[#255A4C]"
                >
                  {loading ? "Sending..." : t("Send message")}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function Footer() {
  const { t } = useLanguage();
  return (
    <footer className="px-6 md:px-12 py-12 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between gap-6 border-t border-[#1F2933]/10 pt-8">
        <div>
          <p className="font-serif text-lg text-[#1F2933]">{t("Health, Explained")}</p>
          <p className="text-sm text-[#9CA3AF] mt-1">{t("An AI healthcare assistant for rural communities.")}</p>
        </div>
        <div className="flex gap-8 text-sm text-[#4B5563]">
          <a href="#" className="hover:text-[#1F2933]">About</a>
          <a href="#contact" className="hover:text-[#1F2933]">Contact</a>
          <a href="#" className="hover:text-[#1F2933]">Privacy</a>
        </div>
      </div>
    </footer>
  );
}



export default function LandingPage() {
  return (
    <div className="bg-[#FAF7F2] min-h-screen font-sans overflow-x-hidden">
      
      <Hero />
      <Features />
      <HowItWorks />
      <FAQ />
      <Contact />
      <Footer />
    </div>
  );
}