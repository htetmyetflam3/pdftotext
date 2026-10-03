/**
 * Extractor worker — text extraction, in a single worker thread.
 * In the manager's walk/walk-reverse metaphor this is "walk" (forward): the
 * manager calls it to EXTRACT a document's text layer (PDF / DOCX) using the
 * requested `method` (default / manual / null — manager.mjs), detect +
 * convert Zawgyi, clean up, and then build the requested OUTPUT file.
 *
 * This is the extractor lane, NOT a "pdf worker" or "docx worker": the input
 * container is just how the text is read, while txt / docx / pdf is the OUTPUT
 * the manager asks for. On purpose it does NOT import, spawn, or message the OCR
 * worker — the two workers never talk to each other.
 *
 * The worker owns disk I/O ("flush"): it LOADS its own input (from `inPath` on
 * disk, or the posted `data` bytes), does the work, CREATES the output file in
 * the format implied by `outPath`, and calls back with just the file name so an
 * upstream module can hand the file to the user.
 *
 * Protocol (host -> worker):
 *   { id, op:"extract", inPath?, data?, filename?, kind?, method?, outPath }
 *   { id, kind?, filename?, data?, method? }  (no outPath -> in-memory job)
 * `method` is "default" | "manual" | "null" (manager.mjs); defaults to
 * "manual" — the full PRASER decode — for callers that predate the contract.
 * Reply:
 *   flush mode  -> { id, ok, file, pages, counts }
 *   memory mode -> { id, ok, result }
 *   failure     -> { id, ok:false, error }
 */
import { parentPort } from "node:worker_threads";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { loadDetector, processBytesForMethod, buildFinalPages } from "./pipeline.mjs";
import { writeOutput } from "./emit.mjs";
import { scanText, formatScanReport, loadMap, dictionaryWords } from "./scan.mjs";
import { MAX_INPUT_BYTES, MAX_INPUT_MB } from "./resource-limits.mjs";

const scanLoggingEnabled = /^(1|true|yes|on)$/iu.test(String(process.env.PRASER_SCAN_LOGGING || ""));
const scanDictionaryPath = path.resolve(
  process.env.PRASER_SCAN_DICTIONARY || path.join(path.dirname(fileURLToPath(import.meta.url)), "../model/master.json.enc"),
);

if (!parentPort) {
  throw new Error("prase.worker.mjs must be run as a worker thread");
}

// One detector per worker, loaded on first use and then reused.
let detector = null;
function detectorOnce() {
  if (detector === null) detector = loadDetector();
  return detector;
}

function loadBytes({ inPath, data }) {
  const bytes = inPath
    ? fs.readFileSync(inPath)
    : data instanceof Uint8Array ? data : new Uint8Array(data);
  if (bytes.byteLength > MAX_INPUT_BYTES) {
    throw new Error(`Parser input exceeds the ${MAX_INPUT_MB} MB cap`);
  }
  return bytes;
}

/** The input container the text is READ from (PDF or DOCX), not the output. */
function inferKind(kind, name) {
  if (kind) return String(kind).toLowerCase();
  const ext = (name || "").toLowerCase().split(".").pop();
  return ext === "docx" ? "docx" : "pdf";
}

function writeDiagnosticScan(pages, outPath) {
  if (!scanLoggingEnabled) return null;
  const body = pages.map((page) => page.text || "").join("\n\n");
  const data = loadMap(scanDictionaryPath);
  const report = scanText(body, {
    dictionary: dictionaryWords(data),
    standalone: data?.mapData?.newClause?.standalone || [],
  });
  const scanPath = `${outPath}.scan.txt`;
  fs.writeFileSync(scanPath, formatScanReport(report, {
    source: path.basename(outPath),
    totalChars: body.length,
  }), { encoding: "utf8", mode: 0o600 });
  fs.chmodSync(scanPath, 0o600);
  return scanPath;
}

parentPort.on("message", async (msg) => {
  const {
    id, kind, filename, data, inPath, outPath, method,
  } = msg ?? {};
  let imageDir = null;
  try {
    const bytes = loadBytes({ inPath, data });
    const name = filename ?? (inPath ? path.basename(inPath) : null);
    const job = await processBytesForMethod(
      bytes,
      inferKind(kind, name),
      method ?? "manual",
      detectorOnce(),
      name ?? null,
      () => {},
      method === "manual" && inferKind(kind, name) === "docx"
        ? (imageDir = fs.mkdtempSync(path.join(os.tmpdir(), "linga-docx-"))) && { imageDir }
        : {},
    );

    if (outPath) {
      // worker-side flush: build the requested output file, hand back its name
      // plus the metadata the Site's queue wants (see emit.mjs's doc comment).
      const pages = buildFinalPages(job, true);
      const written = await writeOutput(outPath, pages, { counts: job.counts, source: name ?? "" });
      const scanLog = writeDiagnosticScan(pages, outPath);
      parentPort.postMessage({
        id, ok: true, filename: name ?? null, pages: pages.length, counts: job.counts,
        ...(scanLog ? { scanLog } : {}),
        ...(job.imageFiles ? { imageFiles: job.imageFiles, imageDir } : {}),
        ...written,
      });
    } else {
      parentPort.postMessage({ id, ok: true, result: job });
    }
  } catch (err) {
    parentPort.postMessage({
      id,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
});
