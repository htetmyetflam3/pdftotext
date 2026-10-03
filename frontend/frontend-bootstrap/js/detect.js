/**
 * The browser detector — the mirror's copy of
 * `frontend-react/src/lib/detect.ts` (types stripped, logic untouched).
 *
 * PDF.js for PDF, mammoth for DOCX. This runs in the browser purely to decide
 * *which route a file takes*. The file itself is uploaded untouched —
 * `site/backend/file/parser.js` is explicit that browser extractors pass
 * Zawgyi code points straight through and only the PRASER side does the real
 * decoding work.
 *
 * There is a useful symmetry in that: `method: "default"` means the manager
 * parses with **backend pdfjs-dist + mammoth**, which is the same pair running
 * here. So this is not an approximation of the `default` path, it *is* that
 * path run early — which is what makes routing away from it trustworthy.
 *
 * `pdf-engine.js` is untouched and still powers the benchmark demo; it answers
 * a different question (what a naive converter emits).
 */
import JSZip from "jszip";
export const PDF_TEXT_MIN_CHARS = 24;
export const PAGE_TEXT_MIN_CHARS = 12;
export const DOCX_IMAGE_DOMINANCE = 3;
const utf8 = (value) => new TextEncoder().encode(value).length;
let pdfjsPromise = null;
/**
 * The legacy build is the one that runs unmodified in both a bundler and bare
 * Node (the verification script drives this module head-less). The worker is
 * only wired up in a browser; in Node pdf.js falls back to a fake worker on
 * its own.
 */
async function loadPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = (async () => {
      const mod = await import("pdfjs-dist/legacy/build/pdf.mjs");
      if (typeof window !== "undefined" && !mod.GlobalWorkerOptions.workerSrc) {
        const worker = await import("pdfjs-dist/legacy/build/pdf.worker.min.mjs?url");
        mod.GlobalWorkerOptions.workerSrc = worker.default;
      }
      return mod;
    })();
  }
  return pdfjsPromise;
}
export async function detectPdf(file) {
  const pdfjs = await loadPdfjs();
  const data = new Uint8Array(await file.arrayBuffer());
  const task = pdfjs.getDocument({ data, useSystemFonts: false, verbosity: 0 });
  const doc = await task.promise;
  const pages = doc.numPages;
  const imageOps = new Set([
    pdfjs.OPS.paintImageXObject,
    pdfjs.OPS.paintInlineImageXObject,
    pdfjs.OPS.paintImageMaskXObject,
  ]);
  const parts = [];
  let textPages = 0;
  let imagePages = 0;
  for (let n = 1; n <= pages; n++) {
    const page = await doc.getPage(n);
    const content = await page.getTextContent();
    const pageText = content.items.map((item) => ("str" in item ? item.str : "")).join("");
    parts.push(pageText);
    if (pageText.replace(/\s/g, "").length >= PAGE_TEXT_MIN_CHARS) {
      textPages++;
      page.cleanup();
      continue;
    }
    const ops = await page.getOperatorList();
    if (ops.fnArray.some((fn) => imageOps.has(fn))) imagePages++;
    page.cleanup();
  }
  const text = parts.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  await task.destroy();
  return {
    parser: "pdf.js",
    inputFormat: "pdf",
    text,
    pages,
    textPages,
    imagePages,
    imageBytes: 0,
    textBytes: utf8(text),
  };
}
const MEDIA_PARTS = /^word\/media\//i;
export async function detectDocx(file) {
  const buffer = await file.arrayBuffer();
  const mammoth = await import("mammoth");
  const extract = mammoth.extractRawText ?? mammoth.default?.extractRawText;
  const B = globalThis.Buffer;
  const input =
    typeof window === "undefined" && B ? { buffer: B.from(buffer) } : { arrayBuffer: buffer };
  const { value } = await extract(input);
  const text = String(value ?? "").trim();
  let imageBytes = 0;
  const zip = await JSZip.loadAsync(buffer);
  for (const name of Object.keys(zip.files)) {
    const entry = zip.files[name];
    if (entry.dir || !MEDIA_PARTS.test(name)) continue;
    imageBytes += (await entry.async("uint8array")).length;
  }
  return {
    parser: "mammoth",
    inputFormat: "docx",
    text,
    pages: 0,
    textPages: 0,
    imagePages: 0,
    imageBytes,
    textBytes: utf8(text),
  };
}
export async function detect(file) {
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".pdf")) return detectPdf(file);
  if (lower.endsWith(".docx")) return detectDocx(file);
  return null;
}