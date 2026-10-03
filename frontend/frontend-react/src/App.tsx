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
import { UploadToolSection } from "./components/UploadToolSection";

export default function App() {
  const [pdfOpen, setPdfOpen] = useState(false);
  const [grammarOpen, setGrammarOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFlow, setUploadFlow] = useState<"conversion" | "analysis">("conversion");

  useEffect(() => {
    const openPdf = () => {
      setGrammarOpen(false);
      setUploadOpen(false);
      setPdfOpen(true);
    };
    const openGrammar = () => {
      setPdfOpen(false);
      setUploadOpen(false);
      setGrammarOpen(true);
    };
    const openUpload = () => {
      setPdfOpen(false);
      setGrammarOpen(false);
      setUploadFlow("conversion");
      setUploadOpen(true);
    };
    // the grammar door: same panel, analysis flow (yes/no prompts, no dropdown)
    const openAnalysis = () => {
      setPdfOpen(false);
      setGrammarOpen(false);
      setUploadFlow("analysis");
      setUploadOpen(true);
    };
    window.addEventListener("akkhara:open-pdf", openPdf);
    window.addEventListener("akkhara:open-grammar", openGrammar);
    window.addEventListener("akkhara:open-upload", openUpload);
    window.addEventListener("akkhara:open-analysis", openAnalysis);
    return () => {
      window.removeEventListener("akkhara:open-pdf", openPdf);
      window.removeEventListener("akkhara:open-grammar", openGrammar);
      window.removeEventListener("akkhara:open-upload", openUpload);
      window.removeEventListener("akkhara:open-analysis", openAnalysis);
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
          <Hero />
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
        <GrammarToolSection isOpen={grammarOpen} onClose={() => setGrammarOpen(false)} />
        <UploadToolSection isOpen={uploadOpen} onClose={() => setUploadOpen(false)} flow={uploadFlow} />
      </div>
    </MotionConfig>
  );
}
