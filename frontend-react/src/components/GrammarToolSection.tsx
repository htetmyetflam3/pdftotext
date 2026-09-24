import React, { useState } from 'react';
import { 
  X, 
  Upload, 
  FileUp, 
  CheckCircle2, 
  Copy, 
  Download, 
  Wand2, 
  AlertTriangle,
  RotateCcw,
  BookOpen
} from 'lucide-react';
import { SAMPLE_GRAMMAR_DOC, GrammarIssue } from '../data/mockData';
import confetti from 'canvas-confetti';

interface GrammarToolSectionProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GrammarToolSection: React.FC<GrammarToolSectionProps> = ({ isOpen, onClose }) => {
  const [editorText, setEditorText] = useState(SAMPLE_GRAMMAR_DOC.rawText);
  const [activeIssueIndex, setActiveIssueIndex] = useState<number | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [issuesList, setIssuesList] = useState<GrammarIssue[]>(SAMPLE_GRAMMAR_DOC.issues);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleFixSingle = (issue: GrammarIssue) => {
    const newText = editorText.replace(issue.original, issue.suggestion);
    setEditorText(newText);
    setIssuesList(issuesList.filter(item => item.id !== issue.id));
    showToast(`Fixed: "${issue.original}" → "${issue.suggestion}"`);
  };

  const handleFixAll = () => {
    let text = editorText;
    issuesList.forEach(iss => {
      text = text.replace(iss.original, iss.suggestion);
    });
    setEditorText(text);
    setIssuesList([]);
    showToast("All Burmese spelling and grammar issues resolved!");
    confetti({ particleCount: 60, spread: 80 });
  };

  const handleResetSample = () => {
    setEditorText(SAMPLE_GRAMMAR_DOC.rawText);
    setIssuesList(SAMPLE_GRAMMAR_DOC.issues);
    showToast("Restored original test document.");
  };

  // Drag and drop handler
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileProcess(files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileProcess(e.target.files[0]);
    }
  };

  const handleFileProcess = (file: File) => {
    showToast(`Parsing "${file.name}"...`);

    const reader = new FileReader();
    reader.onload = (event) => {
      setTimeout(() => {
        const content = event.target?.result as string || "မြန်မာစာ သတ်ပုံ စစ်ဆေးရန် စာသားများ ဖြစ်ပါသည်။";
        setEditorText(content);
        // generate realistic grammar detections
        setIssuesList([
          {
            id: "drop-iss-1",
            original: "မူ",
            suggestion: "မှု",
            reason: "နာမ်နောက်ဆက် 'မှု' သတ်ပုံမှန်ကန်ရေး",
            ruleCategory: "Spelling",
            index: 10
          },
          {
            id: "drop-iss-2",
            original: "တို",
            suggestion: "တို့",
            reason: "အောက်မြစ်လိုအပ်ပါသည် (တို့)",
            ruleCategory: "Spelling",
            index: 25
          }
        ]);
        showToast(`Document uploaded successfully! Found 2 suggestions.`);
      }, 700);
    };
    reader.readAsText(file);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 animate-in fade-in slide-in-from-top-4 duration-300">
      {/* Container replacing the slider */}
      <div className="relative rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
        {/* Top bar */}
        <div className="bg-gradient-to-r from-indigo-900 via-blue-900 to-indigo-950 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/30 border border-indigo-400/40 flex items-center justify-center text-amber-300 font-bold">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base sm:text-lg">Burmese Spell & Grammar AI Workspace</h3>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-indigo-500/40 text-indigo-200 rounded-full">
                  Myanmar Orthography Standard (မြန်မာစာအဖွဲ့)
                </span>
              </div>
              <p className="text-xs text-indigo-300">
                Drag and drop your document directly below to inspect grammatical structure and tone marks
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Back to Slider</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Close Grammar workspace"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Workspace Body */}
        <div className="p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-50/70">
          {/* Main Text Editor Area with Drag & Drop Overlay Requirement */}
          <div className="lg:col-span-8 flex flex-col space-y-4">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
              <span className="flex items-center gap-1.5">
                <FileUp className="w-4 h-4 text-indigo-600" />
                Document Editor & Live Drag-and-Drop Dropzone
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleResetSample}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                >
                  Load Sample Document
                </button>
                <span className="text-slate-300">|</span>
                <span>{editorText.length} Characters</span>
              </div>
            </div>

            {/* Interactive Dropzone Wrapper */}
            <div 
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative rounded-2xl border-2 transition-all duration-200 min-h-[380px] flex flex-col bg-white overflow-hidden shadow-sm ${
                isDragOver ? 'border-indigo-500 ring-4 ring-indigo-500/20' : 'border-slate-300/80 hover:border-slate-400'
              }`}
            >
              {/* Drag and Drop Visual Overlay (Active on Drag Over) */}
              {isDragOver && (
                <div className="absolute inset-0 z-30 bg-indigo-600/90 backdrop-blur-sm flex flex-col items-center justify-center text-white p-6 animate-in fade-in duration-150">
                  <Upload className="w-16 h-16 animate-bounce text-amber-300 mb-3" />
                  <h4 className="text-xl font-bold mb-1">Drop Your Document Here</h4>
                  <p className="text-sm text-indigo-100 max-w-md text-center">
                    Release to parse and automatically review Burmese spellings, tone marks, and punctuation
                  </p>
                </div>
              )}

              {/* Textarea */}
              <textarea
                value={editorText}
                onChange={(e) => setEditorText(e.target.value)}
                placeholder="Type or paste Burmese text here, or drag and drop any .txt/.docx/.pdf document..."
                className="w-full flex-1 p-5 text-slate-800 text-base leading-relaxed resize-none focus:outline-none font-sans"
                rows={12}
              />

              {/* Bottom Quick Drag-and-drop bar */}
              <div className="bg-slate-50 border-t border-slate-200 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Word / Text / PDF</span>
                    <input 
                      type="file" 
                      accept=".txt,.docx,.pdf" 
                      onChange={handleFileInput} 
                      className="hidden" 
                    />
                  </label>
                  <span className="text-slate-400">• Drag files directly into the box</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(editorText);
                      showToast("Copied to clipboard!");
                    }}
                    className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-100 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3 h-3" /> Copy
                  </button>
                  <a
                    href={`data:text/plain;charset=utf-8,${encodeURIComponent(editorText)}`}
                    download="checked_burmese_document.txt"
                    className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-100 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3 h-3 text-indigo-600" /> Export TXT
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: AI Analysis & Suggestions Cards */}
          <div className="lg:col-span-4 flex flex-col space-y-4">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
              <span className="flex items-center gap-1.5">
                <Wand2 className="w-4 h-4 text-indigo-600" />
                Detected Issues ({issuesList.length})
              </span>
              {issuesList.length > 0 && (
                <button
                  onClick={handleFixAll}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
                >
                  Fix All Issues
                </button>
              )}
            </div>

            {/* Issues List Container */}
            <div className="flex-1 space-y-3 max-h-[460px] overflow-y-auto pr-1">
              {issuesList.length === 0 ? (
                <div className="h-full min-h-[300px] flex flex-col items-center justify-center p-6 text-center bg-white rounded-2xl border border-slate-200">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm">No Errors Found!</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs">
                    Your Burmese text conforms with standard Myanmar orthography rules and tone requirements.
                  </p>
                  <button
                    onClick={handleResetSample}
                    className="mt-4 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    Reload Sample To Test
                  </button>
                </div>
              ) : (
                issuesList.map((issue, idx) => (
                  <div
                    key={issue.id}
                    onMouseEnter={() => setActiveIssueIndex(idx)}
                    className={`p-4 rounded-xl border bg-white transition-all shadow-sm ${
                      activeIssueIndex === idx ? 'border-indigo-400 ring-2 ring-indigo-500/10' : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-100 text-amber-900">
                        {issue.ruleCategory}
                      </span>
                      <button
                        onClick={() => handleFixSingle(issue)}
                        className="text-xs font-bold text-indigo-600 hover:text-white hover:bg-indigo-600 px-2.5 py-1 rounded-lg border border-indigo-200 transition-all cursor-pointer"
                      >
                        Apply Fix
                      </button>
                    </div>

                    <div className="flex items-center gap-2 text-sm font-semibold mb-1.5">
                      <span className="line-through text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded">
                        {issue.original}
                      </span>
                      <span className="text-slate-400">→</span>
                      <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                        {issue.suggestion}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 leading-relaxed">
                      {issue.reason}
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* Quick helper tip */}
            <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-100 text-xs text-indigo-900 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
              <span>
                <strong>သတိပြုရန်:</strong> စကားပြောပုံစံ (ဥပမာ - ပါတယ်) မှ ရုံးသုံးစာဟန် (ဥပမာ - ပါသည်) သို့ အလိုအလျောက် သဒ္ဒါပြင်ဆင်မှုကိုလည်း ထောက်ပံ့ပေးပါသည်။
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-2xl border border-slate-700 text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
