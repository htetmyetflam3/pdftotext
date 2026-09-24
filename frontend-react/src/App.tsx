import { useEffect, useState } from "react";
import { MotionConfig } from "framer-motion";
import Nav from "./components/Nav";
import Hero from "./components/Hero";
import {
  SocialProof,
  HowItWorks,
  Compare,
  Benefits,
  Faq,
  CtaBand,
  Footer,
} from "./components/Sections";
import { Voices, StickyCta } from "./components/Extras";
import { PdfDemoOverlay } from "./components/PdfDemoOverlay";
import { GrammarToolSection } from "./components/GrammarToolSection";

export default function App() {
  const [pdfOpen, setPdfOpen] = useState(false);
  const [grammarOpen, setGrammarOpen] = useState(false);

  useEffect(() => {
    const openPdf = () => setPdfOpen(true);
    const openGrammar = () => {
      setGrammarOpen(true);
      window.scrollTo({ top: 80, behavior: "smooth" });
    };
    window.addEventListener("akkhara:open-pdf", openPdf);
    window.addEventListener("akkhara:open-grammar", openGrammar);
    return () => {
      window.removeEventListener("akkhara:open-pdf", openPdf);
      window.removeEventListener("akkhara:open-grammar", openGrammar);
    };
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-[#f7f2e7] text-[#0e1626] antialiased">
        <a
          href="#hero"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[80] focus:rounded-full focus:bg-[#0e1626] focus:px-5 focus:py-3 focus:text-[#f7f2e7]"
        >
          အကြောင်းအရာ ကျော်ရန်
        </a>
        <Nav />
        <main>
          {grammarOpen ? (
            <div className="pt-24">
              <GrammarToolSection isOpen={grammarOpen} onClose={() => setGrammarOpen(false)} />
            </div>
          ) : (
            <Hero />
          )}
          <SocialProof />
          <HowItWorks />
          <Compare />
          <Benefits />
          <Voices />
          <Faq />
          <CtaBand />
        </main>
        <Footer />
        <StickyCta />
        <PdfDemoOverlay isOpen={pdfOpen} onClose={() => setPdfOpen(false)} />
      </div>
    </MotionConfig>
  );
}
