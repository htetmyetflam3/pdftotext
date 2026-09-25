import { useMemo, useState } from "react";
import { Btn, Panel, Stat, ToolShell } from "./ToolShell";
import { SAMPLE_GRAMMAR_TEXT } from "../data/demo";
import { applyAll, applyIssue, checkText, scoreOf, type Issue } from "../lib/grammar";
import { textStats } from "../lib/zawgyi";
import { cn } from "../utils/cn";

const KIND_STYLE: Record<Issue["kind"], string> = {
  spelling: "bg-[#ffe3e4] text-[#b32026]",
  grammar: "bg-[#ece7ff] text-[#5b3fd6]",
  spacing: "bg-[#fff0d6] text-[#8a5a00]",
  style: "bg-[#d7f5f2] text-[#046f66]",
};

export default function GrammarOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [text, setText] = useState(SAMPLE_GRAMMAR_TEXT);
  const [copied, setCopied] = useState(false);
  const issues = useMemo(() => checkText(text), [text]);
  const stats = textStats(text);
  const score = scoreOf(text, issues);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  const download = () => {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "akkhara_checked.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <ToolShell
      open={open}
      onClose={onClose}
      file="burmese_orthography_ai.sys"
      status={issues.length ? `${issues.length} issues found` : "No issues found"}
      eyebrow="02 / spell & grammar"
      title="Burmese Spell & Grammar Checker"
      subtitle="သတ်ပုံ၊ သဒ္ဒါ၊ နေရာလွတ် အမှားများကို အချိန်နှင့်တစ်ပြေးညီ စစ်ဆေး ပြင်ဆင်ပေးပါသည်။"
      badges={["Myanmar orthography", "Realtime", "Offline"]}
      icon={
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5V6a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 1.5z" />
          <path d="M9 11l2 2 4-4" />
        </svg>
      }
      footer={
        <>
          <p className="text-xs text-muted">စာသားများကို browser ထဲမှာပဲ စစ်ဆေးပါတယ် — မည်သည့် server သို့မျှ မပို့ပါ။</p>
          <div className="flex gap-2">
            <Btn onClick={download}>Download .txt</Btn>
            <Btn variant="primary" onClick={onClose}>
              ပြီးပါပြီ
            </Btn>
          </div>
        </>
      }
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          title="Editor"
          hint="type or paste"
          actions={
            <>
              <Btn size="sm" variant="soft" onClick={() => setText(SAMPLE_GRAMMAR_TEXT)}>
                Sample
              </Btn>
              <Btn size="sm" onClick={() => setText("")}>
                Clear
              </Btn>
            </>
          }
        >
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            spellCheck={false}
            placeholder="မြန်မာစာ သို့မဟုတ် အင်္ဂလိပ်စာ ရိုက်ထည့်ပါ…"
            className="ak-scroll font-mm h-[236px] w-full resize-none rounded-xl border border-line bg-white p-3 text-[13px] leading-relaxed text-ink outline-none transition focus:border-brand-400"
          />
          <div className="mt-3 grid grid-cols-4 gap-2">
            <Stat label="words" value={stats.words} />
            <Stat label="chars" value={stats.chars} />
            <Stat label="issues" value={issues.length} />
            <Stat label="score" value={score} />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Btn variant="primary" size="sm" onClick={() => setText(applyAll(text))} disabled={!issues.length}>
              အားလုံး ပြင်မယ် ({issues.length})
            </Btn>
            <Btn size="sm" onClick={copy}>
              {copied ? "Copied ✓" : "Copy"}
            </Btn>
          </div>
        </Panel>

        <Panel title="Suggestions" hint="click to apply">
          <div className="mb-3 flex items-center gap-3 rounded-xl border border-line bg-canvas px-3 py-2.5">
            <div className="relative grid h-11 w-11 place-items-center">
              <svg viewBox="0 0 36 36" className="h-11 w-11 -rotate-90">
                <circle cx="18" cy="18" r="15" fill="none" stroke="#e3e9f4" strokeWidth="4" />
                <circle
                  cx="18"
                  cy="18"
                  r="15"
                  fill="none"
                  stroke={score > 85 ? "#00b8a9" : score > 65 ? "#ffb020" : "#ff5a5f"}
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={`${(score / 100) * 94.2} 94.2`}
                />
              </svg>
              <span className="absolute text-[11px] font-extrabold text-ink">{score}</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-ink">
                {issues.length ? `${issues.length} suggestion${issues.length > 1 ? "s" : ""}` : "Looks clean"}
              </p>
              <p className="font-mm truncate text-[11px] text-muted">
                {issues.length ? "အောက်ပါ အမှားများကို တစ်ချက်နှိပ်ရုံဖြင့် ပြင်နိုင်သည်။" : "အမှား မတွေ့ရှိပါ။"}
              </p>
            </div>
          </div>

          <div className="ak-scroll flex h-[236px] flex-col gap-2 overflow-y-auto pr-1">
            {issues.length === 0 && (
              <div className="grid flex-1 place-items-center rounded-xl border border-dashed border-line bg-canvas p-6 text-center">
                <div>
                  <span className="mx-auto mb-2 grid h-10 w-10 place-items-center rounded-full bg-[#d7f5f2] text-teal-brand">
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  <p className="text-sm font-semibold text-ink">No issues detected</p>
                </div>
              </div>
            )}
            {issues.map((issue) => (
              <article key={issue.id} className="rounded-xl border border-line bg-white p-3 transition hover:border-brand-300">
                <div className="flex items-center gap-2">
                  <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide", KIND_STYLE[issue.kind])}>
                    {issue.kind}
                  </span>
                  <span className="truncate text-xs font-semibold text-ink">{issue.title}</span>
                </div>
                <p className="font-mm mt-2 text-[13px] leading-relaxed">
                  <span className="rounded bg-[#ffe3e4] px-1 text-[#b32026] line-through decoration-[#ff5a5f]/60">{issue.match.trim() || "␣"}</span>
                  <span className="mx-1.5 text-muted">→</span>
                  <span className="rounded bg-[#d7f5f2] px-1 font-semibold text-[#046f66]">{issue.suggestion.trim() || "␣"}</span>
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <p className="font-mm min-w-0 flex-1 truncate text-[11px] text-muted">{issue.detail}</p>
                  <Btn size="sm" variant="soft" onClick={() => setText(applyIssue(text, issue))}>
                    Apply
                  </Btn>
                </div>
              </article>
            ))}
          </div>
        </Panel>
      </div>
    </ToolShell>
  );
}
