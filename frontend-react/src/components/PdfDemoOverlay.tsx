import React, { useState, useEffect } from 'react';
import {
  Upload,
  CheckCircle2,
  AlertCircle,
  Copy,
  Download,
  RefreshCw,
  FileCheck,
  ShieldCheck,
  Cpu
} from 'lucide-react';
import { SAMPLE_ZAWGYI_DOCS, quickZawgyiToUnicode } from '../data/mockData';
import { ToolShell } from './ToolShell';
import confetti from 'canvas-confetti';

interface PdfDemoOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PdfDemoOverlay: React.FC<PdfDemoOverlayProps> = ({ isOpen, onClose }) => {
  const [selectedSampleIndex, setSelectedSampleIndex] = useState(0);
  const [parsingStep, setParsingStep] = useState<'uploading' | 'parsing' | 'ready'>('uploading');
  const [progress, setProgress] = useState(0);
  const [copiedRaw, setCopiedRaw] = useState(false);
  const [copiedConverted, setCopiedConverted] = useState(false);
  const [customFileUploaded, setCustomFileUploaded] = useState<string | null>(null);
  const [userCustomText, setUserCustomText] = useState<string>('');

  const sampleDoc = SAMPLE_ZAWGYI_DOCS[selectedSampleIndex];

  // Automatic sample upload & parsing simulation when opened
  useEffect(() => {
    if (isOpen) {
      startProcessing();
    }
  }, [isOpen, selectedSampleIndex]);

  const startProcessing = () => {
    setParsingStep('uploading');
    setProgress(15);

    const timer1 = setTimeout(() => {
      setProgress(55);
      setParsingStep('parsing');
    }, 600);

    const timer2 = setTimeout(() => {
      setProgress(100);
      setParsingStep('ready');
      confetti({
        particleCount: 45,
        spread: 60,
        origin: { y: 0.6 }
      });
    }, 1400);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  };

  if (!isOpen) return null;

  const handleCopy = (text: string, isConverted: boolean) => {
    navigator.clipboard.writeText(text);
    if (isConverted) {
      setCopiedConverted(true);
      setTimeout(() => setCopiedConverted(false), 2000);
    } else {
      setCopiedRaw(true);
      setTimeout(() => setCopiedRaw(false), 2000);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCustomFileUploaded(file.name);
      setParsingStep('uploading');
      setProgress(20);

      // Read text if txt file or generate demo zawgyi parse
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = (event.target?.result as string) || "ျမန္မာ့စီးပြားေရးႏွင့္ ရင္းႏွီးျမႇဳပ္ႏွံမႈ အစီရင္ခံစာ ၂၀၂၅။";
        setUserCustomText(text);
        setTimeout(() => {
          setParsingStep('ready');
          setProgress(100);
          confetti({ particleCount: 50, spread: 70 });
        }, 900);
      };
      reader.readAsText(file);
    }
  };

  const currentRawContent = userCustomText || sampleDoc.zawgyiRawText;
  const currentConvertedContent = userCustomText ? quickZawgyiToUnicode(userCustomText) : sampleDoc.unicodeFixedText;

  return (
    <ToolShell
      open={isOpen}
      onClose={onClose}
      file={customFileUploaded ? `Custom File: ${customFileUploaded}` : `${sampleDoc.title} (${sampleDoc.size})`}
      status={
        parsingStep === 'ready'
          ? 'Parsed · 100%'
          : parsingStep === 'uploading'
            ? 'Uploading…'
            : 'Parsing ligatures…'
      }
      eyebrow="01 / pdf → text"
      title="Zawgyi PDF Deep Parser Engine"
      subtitle="Sample PDF goes through the parser — read the two frames side by side."
      badges={["Dual-Engine Encoding Solver"]}
      icon={<Cpu className="w-5 h-5" />}
    >
      {/* Sample selector pill bar */}
      <div className="bg-slate-100/90 border border-slate-200 rounded-2xl px-4 py-2.5 flex items-center justify-between text-xs flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-600">Preset Sample PDFs:</span>
          {SAMPLE_ZAWGYI_DOCS.map((doc, idx) => (
            <button
              key={doc.id}
              onClick={() => {
                setUserCustomText('');
                setCustomFileUploaded(null);
                setSelectedSampleIndex(idx);
              }}
              className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                selectedSampleIndex === idx && !customFileUploaded
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-300/80'
              }`}
            >
              Sample #{idx + 1}: {doc.id === 'legal-contract' ? 'Legal Contract (2014)' : 'Historical Archive'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {/* Upload Your PDF button (prominently offered as required in prompt) */}
          <label className="cursor-pointer px-4 py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 active:scale-95">
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Your PDF</span>
            <input
              type="file"
              accept=".pdf,.txt,.docx"
              className="hidden"
              onChange={handleFileUpload}
            />
          </label>

          <div className="flex items-center gap-2 text-slate-500 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Zero Data Leakage • Processed securely</span>
          </div>
        </div>
      </div>

      {/* Progress bar during parsing */}
      {parsingStep !== 'ready' && (
        <div className="mt-4 p-8 text-center bg-sky-50/50 border border-slate-200 rounded-2xl flex flex-col items-center justify-center">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mb-3" />
          <h4 className="font-bold text-slate-900 text-sm mb-1">
            {parsingStep === 'uploading' ? 'Uploading sample PDF document...' : 'Parsing Zawgyi glyph ligatures & re-ordering consonant stacks...'}
          </h4>
          <div className="w-64 h-2 bg-slate-200 rounded-full overflow-hidden mt-3">
            <div
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-500 mt-2 font-mono">{progress}% Completed</p>
        </div>
      )}

      {/* THE TWO FRAMES RESULT DISPLAY */}
      {parsingStep === 'ready' && (
        <div className="mt-4">
          {/* Callout notice */}
          <div className="mb-4 bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <FileCheck className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <span className="text-xs sm:text-sm text-slate-700 font-medium">
                <strong>Notice the difference:</strong> Other converters output broken question marks or scrambled consonant re-ordering. Our AI reconstructs real, selectable Unicode text.
              </span>
            </div>
            <button
              onClick={startProcessing}
              className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Re-parse
            </button>
          </div>

          {/* TWO CARDS / FRAMES OVERLAY */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* CARD 1: What standard converters juggle & fail to extract */}
            <div className="bg-white rounded-2xl border-2 border-red-200/80 shadow-md flex flex-col overflow-hidden">
              <div className="bg-gradient-to-r from-red-50 to-rose-50 px-4 py-3 border-b border-red-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm text-slate-900">Standard PDF Converter (Broken Output)</h4>
                    <p className="text-[11px] text-rose-700 font-medium">Jumbled Zawgyi / Unselectable OCR Artifacts</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-rose-100 text-rose-800 rounded">Fails Search & Copy</span>
              </div>

              <div className="p-4 flex-1 flex flex-col justify-between bg-slate-50/50">
                <div className="space-y-3">
                  <div className="text-xs font-mono text-slate-400 uppercase tracking-wider">Raw Extracted Stream:</div>
                  <div className="p-4 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-serif leading-relaxed min-h-[140px] select-all whitespace-pre-wrap break-words opacity-85">
                    {currentRawContent}
                  </div>

                  <div className="p-3 rounded-lg bg-rose-50/70 border border-rose-200/60 text-xs text-rose-800 leading-relaxed">
                    ⚠️ <strong>The problem:</strong> Other tools copy Zawgyi as broken visual code points. When pasted into Microsoft Word, Excel or web search, it displays as question marks (????) or illegible squares.
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between">
                  <button
                    onClick={() => handleCopy(currentRawContent, false)}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg flex items-center gap-1.5 hover:bg-slate-100 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    {copiedRaw ? "Copied Raw!" : "Copy Broken Stream"}
                  </button>
                  <span className="text-[11px] text-slate-400">Status: Unstandardized</span>
                </div>
              </div>
            </div>

            {/* CARD 2: Our Deep AI-Powered Selectable Unicode Output */}
            <div className="bg-white rounded-2xl border-2 border-emerald-400 shadow-xl flex flex-col overflow-hidden relative ring-4 ring-emerald-500/10">
              <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm">Our Engine Result (Clean Unicode)</h4>
                    <p className="text-[11px] text-emerald-100">Fully Selectable, Searchable & DOCX Compatible</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-white text-emerald-800 rounded shadow-sm">
                  100% Readable
                </span>
              </div>

              <div className="p-4 flex-1 flex flex-col justify-between bg-emerald-50/20">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono text-emerald-800 uppercase tracking-wider">
                    <span>Standard Unicode (Pyidaungsu / Myanmar3):</span>
                    <span className="text-emerald-600 font-bold">Verified Glyphs</span>
                  </div>

                  <div className="p-4 rounded-xl bg-white border-2 border-emerald-200 text-slate-900 text-sm leading-relaxed min-h-[140px] select-all whitespace-pre-wrap font-sans shadow-sm">
                    {currentConvertedContent}
                  </div>

                  <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 leading-relaxed">
                    ✅ <strong>Perfect ligature ordering:</strong> Consonant stacks (က္က, တ္တ, မ္ပ) and vowels (ေ, ာ, ိ, ု) are automatically re-arranged to the international ISO/IEC 10646 standard.
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-emerald-100 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopy(currentConvertedContent, true)}
                      className="px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      {copiedConverted ? "Copied Unicode!" : "Copy Clean Text"}
                    </button>

                    {/* Download formats */}
                    <a
                      href={`data:text/plain;charset=utf-8,${encodeURIComponent(currentConvertedContent)}`}
                      download="converted_myanmar_unicode.txt"
                      className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-blue-600" />
                      Download .TXT
                    </a>
                  </div>

                  <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Ready for Word / PDF
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Call to Action within overlay */}
          <div className="mt-6 p-4 rounded-2xl bg-gradient-to-r from-blue-900 to-indigo-900 text-white flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="font-bold text-sm sm:text-base">Ready to convert your own bulk documents?</h4>
              <p className="text-xs text-blue-200">
                Upload PDF, Word (DOCX), or Scanned Images up to 200MB. Batch processing supported.
              </p>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <label className="cursor-pointer flex-1 sm:flex-initial px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95">
                <Upload className="w-4 h-4" />
                <span>Upload Your PDF Now</span>
                <input
                  type="file"
                  accept=".pdf,.txt,.docx"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>
              <button
                onClick={onClose}
                className="px-4 py-2.5 border border-white/30 hover:bg-white/10 text-white font-semibold text-xs rounded-xl transition-all cursor-pointer"
              >
                Close Demo
              </button>
            </div>
          </div>
        </div>
      )}
    </ToolShell>
  );
};
