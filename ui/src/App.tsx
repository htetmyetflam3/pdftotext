import { useEffect, useState } from "react";
import Nav from "./components/Nav";
import Hero from "./components/Hero";
import PdfToTextOverlay from "./components/PdfToTextOverlay";
import GrammarOverlay from "./components/GrammarOverlay";
import {
  Compare,
  CtaBand,
  Faq,
  Features,
  Footer,
  HowItWorks,
  SocialProof,
  StickyCta,
  Voices,
} from "./components/Sections";

export default function App() {
  const [pdfOpen, setPdfOpen] = useState(false);
  const [grammarOpen, setGrammarOpen] = useState(false);

  useEffect(() => {
    const openPdf = () => {
      setGrammarOpen(false);
      setPdfOpen(true);
    };
    const openGrammar = () => {
      setPdfOpen(false);
      setGrammarOpen(true);
    };
    window.addEventListener("akkhara:open-pdf", openPdf);
    window.addEventListener("akkhara:open-grammar", openGrammar);
    return () => {
      window.removeEventListener("akkhara:open-pdf", openPdf);
      window.removeEventListener("akkhara:open-grammar", openGrammar);
    };
  }, []);

  return (
    <div className="min-h-screen bg-canvas text-ink antialiased">
      <a
        href="#hero"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-ink focus:px-5 focus:py-3 focus:text-white"
      >
        Skip to content
      </a>

      <Nav />
      <main className="pb-16 sm:pb-0">
        <Hero />
        <SocialProof />
        <HowItWorks />
        <Features />
        <Compare />
        <Voices />
        <Faq />
        <CtaBand />
      </main>
      <Footer />
      <StickyCta />

      <PdfToTextOverlay open={pdfOpen} onClose={() => setPdfOpen(false)} />
      <GrammarOverlay open={grammarOpen} onClose={() => setGrammarOpen(false)} />
    </div>
  );
}
