/**
 * The upload gate — the mirror's copy of `frontend-react/src/lib/upload.ts`
 * (types stripped, logic untouched).
 *
 * Every file is inspected in the browser before anything is sent, and the
 * inspection decides the four routing discriminators that travel with the job.
 * The contract is `API-PAYLOAD.md` at the repo root; this file is its
 * implementation and the two must not drift.
 *
 *   task     conversion | demo | analysis | analysis-$   — the door; analysis-$ is
 *              written by ./analysis-task.js (the separate build-part session,
 *              after the yes/no loop) where $ mirrors job ($-analysis)
 *   content  text | image                   — what the detector found
 *   job      extracting | ocr | extracting-analysis | conversion-analysis
 *   method   default | manual | null        — what the manager does
 *
 * `method` is scoped by `job`:
 *   extracting…  default = parse with backend pdfjs-dist + mammoth
 *                manual  = parse per page with the praser
 *                null    = skip the images, extract the text only
 *   ocr          default = the only method; ignore the text layer, OCR it
 *
 * The two flows ask the user differently, which is deliberate:
 *   conversion   the Extract / OCR dropdown, on an image-heavy DOCX only
 *   analysis     yes/no prompts; "no" always cancels and sends nothing
 *
 * A PDF is never asked about. A PDF with selectable text — Unicode or Zawgyi —
 * cannot also contain scanned pages: a scan exists precisely because no digital
 * copy does. Images inside a text-bearing PDF are cover illustrations or
 * figures, so there is nothing in them to OCR.
 */
import { detect, DOCX_IMAGE_DOMINANCE, PDF_TEXT_MIN_CHARS } from "./detect.js";
import { probeScript } from "./script.js";
export { DOCX_IMAGE_DOMINANCE, PDF_TEXT_MIN_CHARS };
export const NOTICE = {
  pdfText: "စာသားအလွှာ တွေ့ပါတယ် — parser လမ်းကြောင်းအတိုင်း ဆက်သွားပါမယ်။",
  pdfScan:
    "စာသားအလွှာ မတွေ့ပါ — ဒီစာမျက်နှာတွေက scan ပုံတွေပါ။ ဒါကို လက်ခံပြီး OCR လမ်းကြောင်းနဲ့ ဆက်ပါမယ်။",
  docxText: "ပုံအလေးအနက် မပါတဲ့ DOCX ပါ — parser လမ်းကြောင်းအတိုင်း ဆက်သွားပါမယ်။",
  docxImages:
    "သင့် DOCX ထဲမှာ ပုံတွေပါနေတာ တွေ့ပါတယ်။ ပုံပါတဲ့ .docx ကို text-based အဖြစ်သာ ယူဆပြီး ပုံနေရာတွေက ကွက်လပ် ဖြစ်နေပါမယ်။ ပုံထဲက စာသားကို အမှန်တကယ် လိုချင်တယ်ဆိုရင် အောက်က dropdown မှာ OCR ကို ရွေးပါ။",
  unsupported: "PDF သို့မဟုတ် DOCX ဖိုင်သာ လက်ခံပါတယ်။",
  zawgyi:
    "But we don't see any readable text in your document. One of the most likely reasons is that the document is encoded with Zawgyi. Please convert the document into readable text with our conversion tool first.",
  zawgyiMm:
    "သင့်စာရွက်စာတမ်းထဲမှာ ဖတ်လို့ရတဲ့ စာသား မတွေ့ရပါ။ ဖြစ်နိုင်ခြေအများဆုံးက Zawgyi နဲ့ ရိုက်ထားတာ ဖြစ်ပါတယ်။ ကျွန်တော်တို့ရဲ့ conversion tool နဲ့ အရင် ပြောင်းလိုက်ပါ။",
  ocrPdf:
    "Your document is image based — its pages carry no text layer, only scans. We can run OCR over them first.",
  ocrDocx:
    "Your document is image based — the text sits inside the pictures, so the text path would come back blank. We can run OCR over them first.",
};
const emptyDetector = () => ({
  name: "pdf.js",
  pages: 0,
  textPages: 0,
  imagePages: 0,
  myanmarChars: 0,
  myanmarLetters: 0,
  imageBytes: 0,
  textBytes: 0,
  confirmed: false,
});
export async function inspectUpload(file, flow = "conversion") {
  const base = {
    name: file.name,
    size: file.size,
    kind: "unsupported",
    inputFormat: "",
    readable: false,
    script: probeScript(""),
    detection: null,
    detector: emptyDetector(),
    gate: "none",
    notice: NOTICE.unsupported,
    text: "",
  };
  const detection = await detect(file);
  if (!detection) return base;
  const script = probeScript(detection.text);
  const detector = {
    name: detection.parser,
    pages: detection.pages,
    textPages: detection.textPages,
    imagePages: detection.imagePages,
    myanmarChars: script.myanmarChars,
    myanmarLetters: script.myanmarLetters,
    imageBytes: detection.imageBytes,
    textBytes: detection.textBytes,
    confirmed: false,
  };
  const common = {
    ...base,
    inputFormat: detection.inputFormat,
    readable: script.readable,
    script,
    detection,
    detector,
    text: detection.text,
  };
  if (detection.inputFormat === "pdf") {
    const textBased = detection.text.replace(/\s/g, "").length >= PDF_TEXT_MIN_CHARS;
    if (textBased) {
      return { ...common, kind: "pdf-text", gate: "none", notice: NOTICE.pdfText };
    }
    return {
      ...common,
      kind: "pdf-scan",
      gate: flow === "analysis" ? "confirm-ocr" : "none",
      notice: NOTICE.pdfScan,
    };
  }
  const imageHeavy =
    detection.imageBytes > 0 && detection.imageBytes > detection.textBytes * DOCX_IMAGE_DOMINANCE;
  if (imageHeavy) {
    return {
      ...common,
      kind: "docx-images",
      gate: "choose-docx",
      notice: NOTICE.docxImages,
    };
  }
  return {
    ...common,
    kind: "docx-text",
    gate: flow === "analysis" && !script.readable ? "confirm-zawgyi" : "none",
    notice: NOTICE.docxText,
  };
}
/**
 * The analysis flow also has to stop on a Zawgyi **PDF**. That is decided
 * after inspection because `inspectUpload` is shared with the conversion flow.
 */
export function gateFor(plan, flow) {
  if (plan.kind === "unsupported") return "none";
  if (flow === "conversion") return plan.kind === "docx-images" ? "choose-docx" : "none";
  if (plan.kind === "pdf-scan" || plan.kind === "docx-images") return "confirm-ocr";
  return plan.readable ? "none" : "confirm-zawgyi";
}
/**
 * The decision table. Every row of `API-PAYLOAD.md` §4 is produced here and
 * nowhere else, so the verification script can assert the whole matrix by
 * calling this one function.
 */
export function route(plan, flow, choice = "default") {
  const analysis = flow === "analysis";
  const ocr = {
    content: "image",
    job: analysis ? "conversion-analysis" : "ocr",
    method: "default",
  };
  if (plan.kind === "pdf-scan") return ocr;
  if (plan.kind === "docx-images") {
    if (analysis) return ocr;
    return {
      content: "text",
      job: "extracting",
      method: choice === "manual" ? "manual" : "default",
    };
  }
  return {
    content: "text",
    job: "extracting",
    method: plan.readable ? "default" : "manual",
  };
}
export function buildPayload({
  plan,
  flow,
  choice = "default",
  confirmed = false,
  at = new Date(),
}) {
  const inputFormat = plan.inputFormat || "pdf";
  const { content, job, method } = route(plan, flow, choice);
  return {
    v: 1,
    source: flow === "analysis" ? "analysis" : "converter",
    content,
    job,
    method,
    originalName: plan.name,
    uploadName: normalizeName(plan.name, inputFormat, at),
    clickedAt: isoSeconds(at),
    fileFormat: inputFormat,
    conversion: "txt",
    desired: "txt",
    detector: { ...plan.detector, confirmed },
  };
}
export function demoPayload(originalName = "sample.pdf") {
  return {
    v: 1,
    source: "converter",
    originalName,
    uploadName: originalName,
    fileFormat: "pdf",
    conversion: "txt",
    desired: "txt",
  };
}
export function isoSeconds(at) {
  return `${at.toISOString().slice(0, 19)}Z`;
}
/**
 * `20260930T141233Z__chapter-01.pdf`
 *
 * Only the renamed file is uploaded. Three things this buys:
 *  - `saveOriginfile.js` writes `${submitId}_${originalName}` to disk, so a
 *    user-controlled name reaches the filesystem today;
 *  - `incoming.js` routes on `originalname.split('.').pop()`, so an extension
 *    taken from the **detector** instead of the user's name stops a `.docx`
 *    renamed `.pdf` reaching the wrong praser;
 *  - the stamp makes collisions impossible.
 *
 * Unicode letters survive, so a Burmese filename stays readable.
 *
 * The result is NFC-normalised. The backend compares the multipart filename
 * against `metadata.uploadName` with `!==` and answers 400 on any difference,
 * so the two copies of this string must be byte-identical after transport.
 * Burmese itself is NFC-stable, but macOS hands filenames to the browser in
 * NFD, so a name like `résumé.pdf` can carry a decomposed `é`. Emitting one
 * canonical form removes the question.
 */
export function normalizeName(originalName, inputFormat, at) {
  const stamp = at.toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  const base = String(originalName ?? "").normalize("NFC").replace(/\.[^.]*$/, "");
  let safe = base
    .replace(/[\\/]+/g, " ")
    .replace(/[\u0000-\u001F\u007F<>:"|?*]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "");
  const chars = Array.from(safe);
  if (chars.length > 60) safe = chars.slice(0, 60).join("").replace(/[-.]+$/, "");
  if (!safe) safe = "file";
  return `${stamp}__${safe}.${inputFormat}`.normalize("NFC");
}
/**
 * `db/request.js` allows 3 a day and resets on the **UTC** day
 * (`checkQuota` compares `new Date().toISOString().split('T')[0]` against
 * `daily_quota_reset`, written by `SQL_NOW` in UTC). Using the server's own
 * expression here means there is no timezone skew to reconcile — note that
 * the reset lands at 06:30 in Asia/Yangon, not at local midnight.
 *
 * This is advisory. localStorage is user-editable and the server's 429 stays
 * the authoritative gate.
 */
export const DAILY_LIMIT = 3;
export const QUOTA_KEY = "akkhara:quota";
export const utcDay = (at = new Date()) => at.toISOString().slice(0, 10);
export function readQuota(storage, token, at = new Date()) {
  const day = utcDay(at);
  const fresh = { token, day, used: 0 };
  if (!storage) return fresh;
  try {
    const raw = storage.getItem(QUOTA_KEY);
    if (!raw) return fresh;
    const saved = JSON.parse(raw);
    if (saved.token !== token || saved.day !== day) return fresh;
    return { token, day, used: Number(saved.used) || 0 };
  } catch {
    return fresh;
  }
}
export function writeQuota(storage, state) {
  try {
    if (storage) storage.setItem(QUOTA_KEY, JSON.stringify(state));
  } catch {
  }
}
/**
 * Map the server's `remaining` onto our local used-count.
 *
 * This matters for the dev flags: with `DEV_BYPASS_QUOTA` (or the
 * `ALLOW_AGENT_UPLOAD` master) `checkQuota` answers
 * `{allowed: true, remaining: 999}` and never 429s — but this mirror would
 * still count to 3 and disable the dropzone, so a dev box blocks itself after
 * three uploads while the server is wide open. Any `remaining` at or above the
 * limit means "not enforced here", so the local block switches off.
 *
 * Returns null when the server said nothing, so the caller keeps counting.
 */
export function usedFromRemaining(remaining) {
  if (typeof remaining !== "number" || !Number.isFinite(remaining)) return null;
  if (remaining >= DAILY_LIMIT) return 0;
  return Math.max(0, Math.min(DAILY_LIMIT, DAILY_LIMIT - remaining));
}
export const remainingOf = (state) => Math.max(0, DAILY_LIMIT - state.used);
export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} kB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}