import React, { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Cpu,
  Download,
  ExternalLink,
  FileCheck,
  RefreshCw,
} from "lucide-react";
import { ToolShell } from "./ToolShell";
import { demoPayload } from "../lib/upload";

interface PdfDemoOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

type DemoResult = {
  generic: string;
  parsed: string;
};

type DemoState = "loading" | "ready" | "error";

const SAMPLE_URL = "/samples/sample.pdf";
const GENERIC_OUTPUT_URL = "/samples/sample-freeconvert.txt";
const PARSED_OUTPUT_URL = "/samples/sample.praser.txt";
const SAMPLE_NAME = "sample.pdf";
const SAMPLE_SHA = "a94e42e891e2b8d2c6b92300a52d86df3738575e09beddd362f93ba262a2c9fa";

const FILE_TIMEOUT_MS = 8000;
const WATCHDOG_MS = 12000;
/** the demo is a fixture, not a job — this delay is only so the panel reads as work */
const FAKE_WORK_MS = 900;

/**
 * The metadata the demo *would* carry. It is rendered in the panel and never
 * sent: this overlay has no submit path at all.
 */
export const DEMO_METADATA = demoPayload(SAMPLE_NAME);

let cachedDemo: Promise<DemoResult> | null = null;

/** The panes show the .txt files exactly as the server serves them. */
async function textFrom(url: string, timeout = FILE_TIMEOUT_MS) {
  const response = await fetch(url, { signal: AbortSignal.timeout(timeout) });
  if (!response.ok) throw new Error(`Could not load ${url}`);
  return response.text();
}

/**
 * The benchmark demo never reaches the backend — not on the standalone SPA and
 * not on the integrated site.
 *
 * Both panes are fixtures that were chosen and saved up front, so submitting
 * the PDF could only ever return what is already on disk. Sending it would
 * burn a real job and a slot of the user's daily quota to recompute a known
 * answer. The delay below is cosmetic: it is what makes the panel read as
 * work, and it is the only "processing" here.
 */
async function requestDemo(): Promise<DemoResult> {
  const [generic, parsed] = await Promise.all([
    textFrom(GENERIC_OUTPUT_URL),
    textFrom(PARSED_OUTPUT_URL),
    new Promise((resolve) => setTimeout(resolve, FAKE_WORK_MS)),
  ]);
  return { generic, parsed };
}

function loadDemo(force = false) {
  if (force) cachedDemo = null;
  cachedDemo ??= requestDemo();
  return cachedDemo;
}

export const PdfDemoOverlay: React.FC<PdfDemoOverlayProps> = ({ isOpen, onClose }) => {
  const [state, setState] = useState<DemoState>("loading");
  const [result, setResult] = useState<DemoResult | null>(null);
  const [message, setMessage] = useState("");
  const watchdog = useRef<number | undefined>(undefined);

  const run = (force = false) => {
    setState("loading");
    setMessage("");

    // whatever happens below, the panel stops loading
    window.clearTimeout(watchdog.current);
    watchdog.current = window.setTimeout(() => {
      cachedDemo = null;
      setMessage("The demo took too long to answer. Download the saved outputs below instead.");
      setState("error");
    }, WATCHDOG_MS);

    return loadDemo(force)
      .then((next) => {
        window.clearTimeout(watchdog.current);
        setResult(next);
        setState("ready");
      })
      .catch((error) => {
        window.clearTimeout(watchdog.current);
        cachedDemo = null;
        setMessage(error instanceof Error ? error.message : "Could not load the benchmark demo.");
        setState("error");
      });
  };

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setState("loading");
    setMessage("");
    watchdog.current = window.setTimeout(() => {
      if (!active) return;
      cachedDemo = null;
      setMessage("The demo took too long to answer. Download the saved outputs below instead.");
      setState("error");
    }, WATCHDOG_MS);

    loadDemo()
      .then((next) => {
        if (!active) return;
        window.clearTimeout(watchdog.current);
        setResult(next);
        setState("ready");
      })
      .catch((error) => {
        if (!active) return;
        window.clearTimeout(watchdog.current);
        cachedDemo = null;
        setMessage(error instanceof Error ? error.message : "Could not load the benchmark demo.");
        setState("error");
      });
    return () => {
      active = false;
      window.clearTimeout(watchdog.current);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <ToolShell
      open={isOpen}
      onClose={onClose}
      file="sample.pdf · 100 pages · 269,519 bytes"
      status={
        state === "ready"
          ? "Demo result · saved fixtures"
          : state === "error"
            ? "Demo unavailable"
            : "Reading the saved outputs…"
      }
      eyebrow="benchmark / exact fixture"
      title="Run the 100-page Sample"
      subtitle="Both panes are saved outputs of the exact downloadable PDF. Nothing is uploaded — the demo never calls the API, so it costs no quota."
      badges={["Same PDF · saved benchmark outputs"]}
      icon={<Cpu className="h-5 w-5" />}
    >
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-100/90 px-4 py-3 text-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 font-semibold text-slate-700">
            <FileCheck className="h-4 w-4 shrink-0 text-blue-600" />
            <span>Exact fixture: {SAMPLE_NAME}</span>
          </div>
          <p className="mt-1 truncate font-mono text-[10px] text-slate-500" title={SAMPLE_SHA}>
            SHA-256 {SAMPLE_SHA}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={SAMPLE_URL}
            download={SAMPLE_NAME}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 px-3 py-2 font-bold text-slate-950 transition hover:bg-amber-300"
          >
            <Download className="h-3.5 w-3.5" /> Download sample PDF
          </a>
          <a
            href="#benchmark"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 font-semibold text-slate-700"
          >
            Benchmark steps <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      {state === "loading" && (
        <div className="mt-4 flex min-h-[270px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-sky-50/50 p-8 text-center">
          <div className="grid h-16 w-16 place-items-center rounded-2xl border border-blue-200 bg-white shadow-sm">
            <RefreshCw className="h-7 w-7 animate-spin text-blue-600" />
          </div>
          <h4 className="mt-5 text-sm font-bold text-slate-900">Reading the saved benchmark outputs</h4>
          <p className="mt-2 max-w-md text-xs leading-relaxed text-slate-600">
            Nothing is uploaded and nothing is parsed in your browser. Both panes were produced from the exact PDF below and saved; the demo only reads them back.
          </p>
        </div>
      )}

      {state === "error" && (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
          <AlertCircle className="mx-auto h-7 w-7 text-rose-600" />
          <h4 className="mt-3 font-bold text-slate-900">Benchmark demo could not be loaded</h4>
          <p className="mt-1 text-sm text-slate-600">{message}</p>
          <button
            type="button"
            onClick={() => run(true)}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Retry
          </button>
        </div>
      )}

      {state === "ready" && result && (
        <div className="mt-4">
          <div className="mb-4 flex flex-col gap-3 rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-slate-700 sm:flex-row sm:items-center sm:justify-between">
            <span>
              <strong>One source, two saved readings:</strong> the left frame is the actual FreeConvert benchmark file; the right frame is AKKHARA&apos;s cleanup-off parser result.
            </span>
            <span className="shrink-0 rounded-full bg-white px-2.5 py-1 font-mono text-[10px] text-blue-700">
              served .txt file · not submitted
            </span>
          </div>

          {/* the demo's own metadata, shown so the shape is visible — never sent */}
          <details className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
            <summary className="cursor-pointer font-semibold text-slate-700">
              Demo job metadata{" "}
              <span className="font-mono text-[10px] font-bold text-rose-600">never sent</span>
            </summary>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
              This is the payload a real upload of this file would carry. The demo builds it and
              stops there: there is no submit path in this overlay, so it costs no quota.
            </p>
            <pre className="scrollbar-thin mt-2 overflow-auto rounded-lg border border-slate-200 bg-white p-2.5 font-mono text-[10px] leading-relaxed text-slate-700">
              {JSON.stringify(DEMO_METADATA, null, 2)}
            </pre>
          </details>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 sm:gap-6">
            <section className="flex flex-col overflow-hidden rounded-2xl border-2 border-rose-200/80 bg-white shadow-md">
              <header className="flex items-center justify-between gap-3 border-b border-rose-100 bg-gradient-to-r from-red-50 to-rose-50 px-4 py-3">
                <div className="flex min-w-0 items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-slate-900 sm:text-sm">FreeConvert benchmark output</h4>
                    <p className="text-[11px] font-medium text-rose-700">Saved from the exact downloadable PDF</p>
                  </div>
                </div>
                <a
                  href="https://www.freeconvert.com/pdf-to-text"
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 text-rose-700"
                  aria-label="Open FreeConvert PDF to text"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </header>

              <div className="flex flex-1 flex-col justify-between bg-slate-50/50 p-4">
                <pre className="scrollbar-thin max-h-[360px] min-h-[240px] overflow-auto whitespace-pre-wrap break-words rounded-xl border border-slate-200 bg-white p-4 font-sans text-sm leading-relaxed text-slate-700">
                  {result.generic}
                </pre>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3">
                  <span className="min-w-0 truncate font-mono2 text-[0.72rem] text-slate-500">sample-freeconvert.txt</span>
                  <a
                    href={GENERIC_OUTPUT_URL}
                    download
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-semibold text-rose-700"
                  >
                    Download full output
                  </a>
                </div>
              </div>
            </section>

            <section className="relative flex flex-col overflow-hidden rounded-2xl border-2 border-emerald-400 bg-white shadow-xl ring-4 ring-emerald-500/10">
              <header className="flex items-center justify-between gap-3 bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-3 text-white">
                <div className="flex min-w-0 items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-100" />
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold sm:text-sm">AKKHARA cleanup-off output</h4>
                    <p className="text-[11px] text-emerald-100">Actual parser fixture · review against source</p>
                  </div>
                </div>
                <span className="shrink-0 rounded bg-white px-2 py-0.5 text-[10px] font-bold text-emerald-800">100 pages</span>
              </header>

              <div className="flex flex-1 flex-col justify-between bg-emerald-50/20 p-4">
                <pre className="scrollbar-thin max-h-[360px] min-h-[240px] overflow-auto whitespace-pre-wrap break-words rounded-xl border-2 border-emerald-200 bg-white p-4 font-sans text-sm leading-relaxed text-slate-900 shadow-sm">
                  {result.parsed}
                </pre>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-emerald-100 pt-3">
                  <span className="min-w-0 truncate font-mono2 text-[0.72rem] text-slate-500">sample.praser.txt</span>
                  <a
                    href={PARSED_OUTPUT_URL}
                    download
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-semibold text-emerald-700"
                  >
                    Download full output
                  </a>
                </div>
              </div>
            </section>
          </div>

          <div className="mt-6 flex flex-col items-start justify-between gap-3 rounded-2xl bg-gradient-to-r from-blue-900 to-indigo-900 p-4 text-white sm:flex-row sm:items-center">
            <div>
              <h4 className="text-sm font-bold sm:text-base">Reproduce the benchmark yourself</h4>
              <p className="mt-1 text-xs text-blue-200">Download the same PDF, test it with the linked tools, then compare their complete output files.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                href={SAMPLE_URL}
                download={SAMPLE_NAME}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-400 px-3 py-1.5 text-[11px] font-bold text-slate-950"
              >
                <Download className="h-3.5 w-3.5" /> Download sample
              </a>
              <a
                href="#benchmark"
                onClick={onClose}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/30 px-3 py-1.5 text-[11px] font-semibold text-white"
              >
                <Download className="h-3.5 w-3.5" /> Download demo &amp; try it yourself on the benchmark
              </a>
            </div>
          </div>
        </div>
      )}
    </ToolShell>
  );
};
