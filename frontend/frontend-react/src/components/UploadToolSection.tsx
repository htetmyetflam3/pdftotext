import React, { useEffect, useRef, useState } from "react";
import {
  Upload,
  FileCheck,
  ScanText,
  AlertTriangle,
  Download,
  FileText,
  RefreshCw,
  CheckCircle2,
  Ban,
} from "lucide-react";
import { ToolShell } from "./ToolShell";
import {
  inspectUpload,
  gateFor,
  route,
  buildPayload,
  formatBytes,
  readQuota,
  writeQuota,
  usedFromRemaining,
  DAILY_LIMIT,
  DOCX_IMAGE_DOMINANCE,
  NOTICE,
  type DocxChoice,
  type Flow,
  type Gate,
  type SubmitMetadata,
  type UploadPlan,
} from "../lib/upload";
import {
  isTerminal,
  pollDelivery,
  readDelivery,
  stateLabel,
  type Delivery,
} from "../lib/delivery";

interface UploadToolSectionProps {
  isOpen: boolean;
  onClose: () => void;
  flow?: Flow;
}

type Phase = "idle" | "checking" | "ready" | "sending" | "sent" | "error";

const SUBMIT_TIMEOUT_MS = 8000;
const TOKEN_KEY = "akkhara:visitor";

const storage = (): Storage | null => {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
};

const visitorToken = () => storage()?.getItem(TOKEN_KEY) || "anon";

async function csrfToken(): Promise<string> {
  const response = await fetch("/csrf-token", {
    credentials: "same-origin",
    cache: "no-store",
    signal: AbortSignal.timeout(SUBMIT_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`CSRF endpoint answered ${response.status}`);
  const body = (await response.json()) as { csrfToken?: string };
  if (!body.csrfToken) throw new Error("CSRF endpoint returned no token");
  return body.csrfToken;
}

export const UploadToolSection: React.FC<UploadToolSectionProps> = ({
  isOpen,
  onClose,
  flow = "conversion",
}) => {
  const [phase, setPhase] = useState<Phase>("idle");
  const [plan, setPlan] = useState<UploadPlan | null>(null);
  const [gate, setGate] = useState<Gate>("none");
  const [choice, setChoice] = useState<DocxChoice>("default");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState("");
  const [isDragOver, setDragOver] = useState(false);
  const [used, setUsed] = useState(0);
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const abortRef = useRef<{ aborted: boolean }>({ aborted: false });
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<File | null>(null);
  // Set synchronously, because `setPhase` is not: the prompt's Yes button is
  // unmounted by the re-render, but a fast double-click lands both events
  // before React gets there and would POST the same job twice.
  const sendingRef = useRef(false);

  // quota is arithmetic, not an endpoint: 3 a day, reset on the UTC day —
  // the same expression db/request.js checkQuota uses. Advisory only; the
  // server's 429 is the real gate.
  useEffect(() => {
    if (isOpen) setUsed(readQuota(storage(), visitorToken()).used);
  }, [isOpen]);

  if (!isOpen) return null;

  const remaining = Math.max(0, DAILY_LIMIT - used);
  const analysis = flow === "analysis";

  const reset = () => {
    setPhase("idle");
    setPlan(null);
    setGate("none");
    setChoice("default");
    setMessage("");
    setSent("");
    setDelivery(null);
    abortRef.current.aborted = true;
    abortRef.current = { aborted: false };
    fileRef.current = null;
    sendingRef.current = false;
    if (inputRef.current) inputRef.current.value = "";
  };

  const take = async (file: File) => {
    fileRef.current = file;
    setPhase("checking");
    setMessage("");
    setSent("");
    try {
      const next = await inspectUpload(file, flow);
      setPlan(next);
      setGate(gateFor(next, flow));
      setChoice("default");
      setPhase(next.kind === "unsupported" ? "error" : "ready");
      if (next.kind === "unsupported") setMessage(next.notice);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The file could not be read.");
      setPhase("error");
    }
  };

  const submit = async (confirmed: boolean) => {
    if (!plan || sendingRef.current) return;
    sendingRef.current = true;
    const file = fileRef.current;
    const payload: SubmitMetadata = buildPayload({ plan, flow, choice, confirmed });
    setPhase("sending");
    let accepted: Delivery | null = null;
    let serverUsed: number | null = null;

    try {
      const body = new FormData();
      // only the normalised name is uploaded; the bytes are untouched
      if (file) body.append("file", new File([file], payload.uploadName, { type: file.type }));
      body.append("metadata", JSON.stringify(payload));
      const csrf = await csrfToken();
      const response = await fetch("/api/submit", {
        method: "POST",
        headers: { "x-csrf-token": csrf },
        credentials: "same-origin",
        body,
        signal: AbortSignal.timeout(SUBMIT_TIMEOUT_MS),
      });

      const token = response.headers.get("X-Visitor-Token");
      if (token) storage()?.setItem(TOKEN_KEY, token);

      if (response.ok) {
        const body = await response.clone().json().catch(() => ({}));
        accepted = readDelivery(body, "");
        serverUsed = usedFromRemaining((body as Record<string, unknown>)?.remaining);
      }

      if (response.status === 429) {
        const answer = await response.json().catch(() => ({}));
        serverUsed = usedFromRemaining(answer?.remaining) ?? DAILY_LIMIT;
        setMessage("Your daily limit is used up. The server refused this upload.");
      } else if (!response.ok) {
        throw new Error(`The job endpoint answered ${response.status}.`);
      } else {
        setMessage("");
      }
    } catch {
      // no backend in front of this page — the gate's decision is still shown
      setMessage("No job endpoint answered here, so nothing was processed. This is what the gate sent:");
    }

    // the server's own count wins whenever it gave one — a dev bypass reports
    // a huge `remaining`, which switches this local block off entirely
    const state = readQuota(storage(), visitorToken());
    const next = { ...state, used: serverUsed ?? state.used + 1 };
    writeQuota(storage(), next);
    setUsed(next.used);

    setSent(JSON.stringify(payload, null, 2));
    setDelivery(accepted);
    setPhase("sent");
    sendingRef.current = false;

    // Polling is not merely observation: the status route runs the engine poll
    // loop and is what copies the artifact into Site storage. An analysis job
    // nobody polls never finishes.
    if (accepted && accepted.submitId && !isTerminal(accepted.state)) {
      const signal = abortRef.current;
      const settled = await pollDelivery(accepted.submitId, {
        signal,
        onUpdate: (update) => {
          if (!signal.aborted) setDelivery(update);
        },
      });
      if (!signal.aborted) setDelivery(settled);
    }
  };

  const preview = plan ? route(plan, flow, choice) : null;

  const chip = (label: string, tone: "ocr" | "praser" | "skip") => (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono2 text-[10px] font-bold uppercase tracking-wider ${
        tone === "ocr"
          ? "bg-indigo-50 text-indigo-700"
          : tone === "skip"
            ? "bg-slate-100 text-slate-600"
            : "bg-emerald-50 text-emerald-700"
      }`}
    >
      {label}
    </span>
  );

  const methodChip = () => {
    if (!preview) return null;
    const tone = preview.job === "ocr" ? "ocr" : preview.method === "default" ? "skip" : "praser";
    return chip(`${preview.job} · ${preview.method}`, tone);
  };

  const blocked = remaining <= 0;

  return (
    <ToolShell
      open={isOpen}
      onClose={onClose}
      file={plan ? `${plan.name} · ${formatBytes(plan.size)}` : `${flow} · pdf / docx`}
      status={
        phase === "checking"
          ? "Checking the file…"
          : phase === "sending"
            ? "Submitting…"
            : phase === "sent"
              ? "Submitted"
              : blocked
                ? "Daily limit reached"
                : `${remaining} of ${DAILY_LIMIT} left today`
      }
      eyebrow={analysis ? "grammar analysis / upload" : "upload / extraction path"}
      title={analysis ? "Upload a document to analyse" : "Upload a PDF or DOCX"}
      subtitle={
        analysis
          ? "The file is checked in your browser first. If the Burmese is not readable, you are asked before anything is analysed."
          : "The file is checked in your browser first — that check picks the route the job is tagged with."
      }
      badges={["Checked before anything is sent"]}
      icon={<Upload className="h-5 w-5" />}
    >
      {blocked && phase !== "sent" && (
        <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs leading-relaxed text-rose-900">
          <Ban className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            You have used all {DAILY_LIMIT} uploads for today. The allowance resets at 00:00 UTC —
            06:30 in Myanmar.
          </span>
        </div>
      )}

      {(phase === "idle" || phase === "checking" || phase === "error") && (
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setDragOver(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (blocked) return;
            const file = e.dataTransfer.files?.[0];
            if (file) take(file);
          }}
          className={`flex min-h-[260px] flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-white p-8 text-center transition ${
            blocked
              ? "cursor-not-allowed border-slate-200 opacity-60"
              : isDragOver
                ? "cursor-pointer border-indigo-500 bg-indigo-50/40"
                : "cursor-pointer border-slate-300/80 hover:border-slate-400"
          }`}
        >
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-slate-500">
            {phase === "checking" ? (
              <RefreshCw className="h-6 w-6 animate-spin text-indigo-600" />
            ) : (
              <Upload className="h-6 w-6" />
            )}
          </span>
          <h4 className="mt-4 text-sm font-bold text-slate-900">
            {phase === "checking"
              ? "Checking the file…"
              : "Drop a PDF or DOCX here, or click to choose"}
          </h4>
          <p className="mm mt-2 max-w-md text-xs leading-relaxed text-slate-600">
            Text-based PDF နဲ့ scan PDF နှစ်မျိုးလုံး လက်ခံပါတယ်။ ဖိုင်ကို ဘရောက်ဇာထဲမှာပဲ စစ်ပြီး လမ်းကြောင်း ရွေးပါတယ်။
          </p>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
            disabled={blocked}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) take(file);
            }}
          />
          {phase === "error" && message && (
            <p className="mt-4 inline-flex items-center gap-2 rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
              <AlertTriangle className="h-4 w-4" /> {message}
            </p>
          )}
        </label>
      )}

      {plan && (phase === "ready" || phase === "sending" || phase === "sent") && (
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-2 text-sm font-bold text-slate-900">
                {plan.kind === "pdf-scan" ? (
                  <ScanText className="h-4 w-4 shrink-0 text-indigo-600" />
                ) : (
                  <FileCheck className="h-4 w-4 shrink-0 text-emerald-600" />
                )}
                <span className="truncate">{plan.name}</span>
              </span>
              {methodChip()}
            </div>

            <dl className="mt-3 grid grid-cols-2 gap-2 font-mono2 text-[11px] text-slate-600 sm:grid-cols-4">
              <div>
                <dt className="text-slate-400">size</dt>
                <dd>{formatBytes(plan.size)}</dd>
              </div>
              {plan.inputFormat === "pdf" ? (
                <>
                  <div>
                    <dt className="text-slate-400">pages</dt>
                    <dd>
                      {plan.detector.textPages}/{plan.detector.pages} text
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-400">mm letters</dt>
                    <dd>{plan.detector.myanmarLetters}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-400">layer</dt>
                    <dd>{plan.kind === "pdf-text" ? "text" : "image only"}</dd>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <dt className="text-slate-400">image bytes</dt>
                    <dd>{formatBytes(plan.detector.imageBytes)}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-400">text bytes</dt>
                    <dd>{formatBytes(plan.detector.textBytes)}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-400">ratio</dt>
                    <dd>
                      {plan.detector.textBytes
                        ? (plan.detector.imageBytes / plan.detector.textBytes).toFixed(1)
                        : "∞"}
                      × / {DOCX_IMAGE_DOMINANCE}×
                    </dd>
                  </div>
                </>
              )}
            </dl>
          </div>

          {/* the Zawgyi prompt — analysis only, and "no" cancels */}
          {gate === "confirm-zawgyi" && phase === "ready" && (
            <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs leading-relaxed text-amber-900">
              <span className="flex items-start gap-2.5">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  {NOTICE.zawgyi}
                  <span className="mm mt-1.5 block">{NOTICE.zawgyiMm}</span>
                </span>
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => submit(true)}
                  className="rounded-lg bg-slate-900 px-3 py-1.5 text-[11px] font-bold text-white"
                >
                  Yes — convert it first
                </button>
                <button
                  type="button"
                  onClick={reset}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700"
                >
                  No — cancel
                </button>
              </div>
            </div>
          )}

          {/* the OCR prompt — analysis only, no dropdown here by design */}
          {gate === "confirm-ocr" && phase === "ready" && (
            <div className="flex flex-col gap-3 rounded-xl border border-indigo-200 bg-indigo-50 p-3.5 text-xs leading-relaxed text-indigo-900">
              <span className="flex items-start gap-2.5">
                <ScanText className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{plan.inputFormat === "pdf" ? NOTICE.ocrPdf : NOTICE.ocrDocx}</span>
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => submit(true)}
                  className="rounded-lg bg-slate-900 px-3 py-1.5 text-[11px] font-bold text-white"
                >
                  Yes — run OCR first
                </button>
                <button
                  type="button"
                  onClick={reset}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700"
                >
                  No — cancel
                </button>
              </div>
            </div>
          )}

          {gate === "none" && (
            <div
              className={`flex items-start gap-2.5 rounded-xl border p-3.5 text-xs leading-relaxed ${
                plan.kind === "pdf-scan"
                  ? "border-indigo-100 bg-indigo-50/70 text-indigo-900"
                  : "border-emerald-100 bg-emerald-50/70 text-emerald-900"
              }`}
            >
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="mm">{plan.notice}</span>
            </div>
          )}

          {/* the dropdown — conversion flow, image-heavy DOCX only */}
          {gate === "choose-docx" && (
            <>
              <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs leading-relaxed text-amber-900">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span className="mm">{plan.notice}</span>
              </div>
              <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3.5 sm:flex-row sm:items-center sm:justify-between">
                <label htmlFor="uploadEngine" className="mm text-xs font-semibold text-slate-700">
                  ဒီ DOCX ကို ဘယ်လမ်းကြောင်းနဲ့ ဖတ်မလဲ
                </label>
                <select
                  id="uploadEngine"
                  value={choice}
                  onChange={(e) => setChoice(e.target.value as DocxChoice)}
                  disabled={phase !== "ready"}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800"
                >
                  <option value="default">Default — process text, ignore image areas</option>
                  <option value="manual">Manual — OCR embedded image areas</option>
                </select>
              </div>
            </>
          )}

          {/* The browser finished reading the file: name it, and offer submit.
              Clicking swaps the whole row for the loading state, so there is
              no button left to press twice. */}
          {phase === "ready" && gate !== "confirm-zawgyi" && gate !== "confirm-ocr" && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex min-w-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700">
                <FileText className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                <span className="truncate max-w-[220px]">{plan.name}</span>
              </span>
              <button
                type="button"
                onClick={() => submit(gate === "choose-docx")}
                disabled={blocked}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-60"
              >
                <Upload className="h-3.5 w-3.5" />
                Process
              </button>
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700"
              >
                Choose another file
              </button>
            </div>
          )}

          {phase === "sending" && (
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-[11px] font-semibold text-slate-600">
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-indigo-600" />
              Submitting {plan.name}…
            </div>
          )}

          {phase === "sent" && delivery && (
            <div
              className={`rounded-2xl border p-4 ${
                delivery.state === "READY"
                  ? "border-emerald-200 bg-emerald-50/60"
                  : delivery.state === "FAILED" || delivery.error
                    ? "border-rose-200 bg-rose-50/60"
                    : "border-slate-200 bg-white"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-xs font-bold text-slate-900">
                  {delivery.state === "READY" ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : delivery.state === "FAILED" || delivery.error ? (
                    <AlertTriangle className="h-4 w-4 text-rose-600" />
                  ) : (
                    <RefreshCw className="h-4 w-4 animate-spin text-indigo-600" />
                  )}
                  {stateLabel(delivery.state)}
                </span>
                {delivery.state === "READY" && delivery.downloadUrl && (
                  <a
                    href={delivery.downloadUrl}
                    download={delivery.finalFilename ?? undefined}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-[11px] font-bold text-white"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download{delivery.finalFilename ? ` ${delivery.finalFilename}` : ""}
                    {delivery.finalBytes ? ` · ${formatBytes(delivery.finalBytes)}` : ""}
                  </a>
                )}
              </div>
              {delivery.error && (
                <p className="mt-2 text-[11px] leading-relaxed text-rose-700">{delivery.error}</p>
              )}
            </div>
          )}

          {phase === "sent" && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Job metadata
              </div>
              {message && <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{message}</p>}
              <pre className="scrollbar-thin mt-2 max-h-[220px] overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono2 text-[11px] leading-relaxed text-slate-700">
                {sent}
              </pre>
              <button
                type="button"
                onClick={reset}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700"
              >
                Upload another file
              </button>
            </div>
          )}
        </div>
      )}
    </ToolShell>
  );
};
