import { useCallback, useEffect, useRef, useState } from "react";
import { Btn, Panel, Stat, ToolShell } from "./ToolShell";
import { PIPELINE_STEPS, SAMPLE_ZAWGYI_PAGES } from "../data/demo";
import { isLikelyZawgyi, textStats, zawgyiToUnicode } from "../lib/zawgyi";
import { cn } from "../utils/cn";

type Stage = "idle" | "working" | "done";
type Format = "txt" | "docx" | "md";

const FORMATS: { id: Format; label: string; hint: string }[] = [
  { id: "txt", label: ".TXT", hint: "Plain UTF-8" },
  { id: "docx", label: ".DOCX", hint: "Word ready" },
  { id: "md", label: ".MD", hint: "Markdown" },
];

export default function PdfToTextOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [stage, setStage] = useState<Stage>("idle");
  const [step, setStep] = useState(0);
  const [fileName, setFileName] = useState("sample_zawgyi_report.pdf");
  const [pages, setPages] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const [format, setFormat] = useState<Format>("txt");
  const [copied, setCopied] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timers = useRef<number[]>([]);

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };
  useEffect(() => () => clearTimers(), []);

  const run = useCallback((next: string[], name: string) => {
    clearTimers();
    setPages(next);
    setFileName(name);
    setPage(0);
    setStage("working");
    setStep(0);
    PIPELINE_STEPS.forEach((_, i) => {
      timers.current.push(
        window.setTimeout(() => {
          setStep(i);
          if (i === PIPELINE_STEPS.length - 1) setStage("done");
        }, 420 * (i + 1)),
      );
    });
  }, []);

  const onFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    const isText = /\.(txt|md|csv|json)$/i.test(file.name);
    if (isText) {
      const reader = new FileReader();
      reader.onload = () => run(String(reader.result || "").split(/\n{2,}/), file.name);
      reader.readAsText(file);
    } else {
      run(SAMPLE_ZAWGYI_PAGES, file.name);
    }
  };

  const raw = pages.join("\n\n");
  const converted = zawgyiToUnicode(raw);
  const stats = textStats(converted);
  const progress = stage === "done" ? 1 : (step + 1) / PIPELINE_STEPS.length;
  const preview = stage === "done" ? converted : converted.slice(0, Math.floor(converted.length * progress));

  const wrap = (body: string) =>
    format === "md"
      ? `# ${fileName.replace(/\.[^.]+$/, "")}\n\n${body}\n`
      : format === "docx"
        ? `<html xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"></head><body>${body
            .split("\n")
            .map((l) => `<p>${l || "&nbsp;"}</p>`)
            .join("")}</body></html>`
        : body;

  const download = () => {
    const ext = format === "docx" ? "doc" : format;
    const mime = format === "docx" ? "application/msword" : format === "md" ? "text/markdown" : "text/plain";
    const blob = new Blob([wrap(converted)], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileName.replace(/\.[^.]+$/, "")}_unicode.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(converted);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  const reset = () => {
    clearTimers();
    setStage("idle");
    setPages([]);
    setStep(0);
  };

  return (
    <ToolShell
      open={open}
      onClose={onClose}
      file="zawgyi_to_unicode.exe"
      status={stage === "working" ? "Converting…" : stage === "done" ? "Conversion complete" : "Engine ready"}
      eyebrow="01 / pdf → text"
      title="Zawgyi PDF → Selectable Unicode"
      subtitle="PDF ဖိုင်ကို ထည့်ပါ — ဖတ်လို့ရ၊ ကူးယူလို့ရတဲ့ ယူနီကုဒ် စာသားအဖြစ် ချက်ချင်း ပြောင်းပေးပါမယ်။"
      badges={["100% offline", "Ligature safe", ".txt / .docx / .md"]}
      icon={
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 3v5h5" />
          <path d="M19 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v13z" />
          <path d="M9 13h6M9 17h4" />
        </svg>
      }
      footer={
        <>
          <p className="text-xs text-muted">
            ဖိုင်များကို သင့်စက်ထဲမှာပဲ စီမံပါတယ် — server သို့ upload မလုပ်ပါ။
          </p>
          <div className="flex gap-2">
            <Btn onClick={reset} disabled={stage === "idle"}>
              နောက်ဖိုင် တစ်ခု
            </Btn>
            <Btn variant="primary" onClick={onClose}>
              ပြီးပါပြီ
            </Btn>
          </div>
        </>
      }
    >
      <div className="grid gap-4 lg:grid-cols-2">
        {/* ---------------- source ---------------- */}
        <Panel
          title="Source document"
          hint="Zawgyi PDF"
          actions={
            <Btn size="sm" variant="soft" onClick={() => run(SAMPLE_ZAWGYI_PAGES, "sample_zawgyi_report.pdf")}>
              Sample PDF
            </Btn>
          }
        >
          {stage === "idle" ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                onFiles(e.dataTransfer.files);
              }}
              onClick={() => inputRef.current?.click()}
              className={cn(
                "flex min-h-[236px] cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-6 text-center transition",
                dragging ? "border-brand-500 bg-brand-50" : "border-line bg-canvas hover:border-brand-300",
              )}
            >
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-brand-600 shadow-sm">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 16V4M7 9l5-5 5 5" />
                  <path d="M20 16v3a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-3" />
                </svg>
              </span>
              <p className="font-mm text-sm font-semibold text-ink">ဖိုင်ကို ဤနေရာသို့ ဆွဲထည့်ပါ</p>
              <p className="text-xs text-muted">PDF, TXT, MD · max 25MB</p>
              <input
                ref={inputRef}
                type="file"
                accept=".pdf,.txt,.md,.csv"
                className="hidden"
                onChange={(e) => onFiles(e.target.files)}
              />
            </div>
          ) : (
            <>
              <div className="mb-3 flex flex-wrap items-center gap-1.5">
                {pages.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPage(i)}
                    className={cn(
                      "rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition",
                      i === page ? "border-brand-500 bg-brand-50 text-brand-700" : "border-line bg-white text-muted hover:text-ink",
                    )}
                  >
                    P{i + 1}
                  </button>
                ))}
                <span className="ml-auto truncate font-mono text-[11px] text-muted">{fileName}</span>
              </div>
              <pre className="ak-scroll font-mm h-[188px] overflow-auto whitespace-pre-wrap rounded-xl border border-line bg-canvas p-3 text-[13px] leading-relaxed text-ink-2">
                {pages[page]}
              </pre>
              {isLikelyZawgyi(pages[page] || "") && (
                <p className="mt-2 inline-flex items-center gap-1.5 self-start rounded-full bg-[#fff0d6] px-2.5 py-1 text-[11px] font-semibold text-[#8a5a00]">
                  <i className="h-1.5 w-1.5 rounded-full bg-amber-brand" /> Zawgyi encoding detected
                </p>
              )}
            </>
          )}

          <ol className="mt-4 space-y-1.5">
            {PIPELINE_STEPS.map((s, i) => {
              const state = stage === "idle" ? "wait" : i < step || stage === "done" ? "done" : i === step ? "live" : "wait";
              return (
                <li key={s.key} className="flex items-center gap-2.5 text-xs">
                  <span
                    className={cn(
                      "grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[10px] font-bold",
                      state === "done" && "border-teal-brand bg-teal-brand text-white",
                      state === "live" && "border-brand-500 bg-brand-50 text-brand-600",
                      state === "wait" && "border-line bg-white text-muted",
                    )}
                  >
                    {state === "done" ? "✓" : i + 1}
                  </span>
                  <span className={cn("font-medium", state === "wait" ? "text-muted" : "text-ink-2")}>{s.label}</span>
                  <span className="font-mm ml-auto hidden text-[11px] text-muted sm:inline">{s.mm}</span>
                </li>
              );
            })}
          </ol>
        </Panel>

        {/* ---------------- output ---------------- */}
        <Panel
          title="Unicode output"
          hint="selectable & searchable"
          actions={
            <div className="flex rounded-full border border-line bg-canvas p-0.5">
              {FORMATS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFormat(f.id)}
                  title={f.hint}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[11px] font-bold transition",
                    format === f.id ? "bg-white text-brand-600 shadow-sm" : "text-muted hover:text-ink",
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          }
        >
          {stage === "idle" ? (
            <div className="grid min-h-[236px] place-items-center rounded-xl border border-line bg-canvas p-6 text-center">
              <div>
                <p className="font-mm text-sm font-semibold text-ink-2">ဖိုင် တစ်ခု ရွေးပြီးတာနဲ့ ရလဒ် ဒီမှာ ပေါ်ပါမယ်။</p>
                <p className="mt-1 text-xs text-muted">Output preview will appear here.</p>
              </div>
            </div>
          ) : (
            <>
              {stage === "working" && (
                <div className="ak-bar relative mb-3 h-1.5 overflow-hidden rounded-full bg-brand-100" />
              )}
              <textarea
                readOnly
                value={preview}
                className="ak-scroll font-mm h-[236px] w-full resize-none rounded-xl border border-line bg-white p-3 text-[13px] leading-relaxed text-ink outline-none focus:border-brand-300"
              />
              <div className="mt-3 grid grid-cols-4 gap-2">
                <Stat label="pages" value={pages.length} />
                <Stat label="words" value={stats.words} />
                <Stat label="chars" value={stats.chars} />
                <Stat label="mm glyphs" value={stats.myanmar} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Btn variant="primary" size="sm" onClick={download}>
                  Download {FORMATS.find((f) => f.id === format)?.label}
                </Btn>
                <Btn size="sm" onClick={copy}>
                  {copied ? "Copied ✓" : "Copy text"}
                </Btn>
              </div>
            </>
          )}
        </Panel>
      </div>
    </ToolShell>
  );
}
