/**
 * The upload gate.
 *
 * Every file is inspected in the browser before anything is sent, and the
 * inspection decides the four routing discriminators that travel with the job.
 * The contract is `API-PAYLOAD.md` at the repo root; this file is its
 * implementation and the two must not drift.
 *
 *   task     conversion | demo | analysis | analysis-$   — the door; analysis-$ is
 *              written by ./analysis-task (the separate build-part session,
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
import {
  detect,
  DOCX_IMAGE_DOMINANCE,
  PDF_TEXT_MIN_CHARS,
  type Detection,
} from "./detect";
import { probeScript, type ScriptVerdict } from "./script";

export type Content = "text" | "image";
export type Job = "extracting" | "ocr" | "extracting-analysis" | "conversion-analysis";
export type Method = "default" | "manual" | "null";
export type Flow = "conversion" | "analysis";

/** what the panel has to do before anything can be sent */
export type Gate =
  | "none"            // nothing to ask — send on submit
  | "choose-docx"     // conversion: the Extract / OCR dropdown
  | "confirm-zawgyi"  // analysis: "convert it first?"  yes / no
  | "confirm-ocr";    // analysis: "run OCR first?"     yes / no

export type UploadKind = "pdf-text" | "pdf-scan" | "docx-text" | "docx-images" | "unsupported";

export type DetectorReport = {
  name: "pdf.js" | "mammoth";
  pages: number;
  textPages: number;
  imagePages: number;
  myanmarChars: number;
  myanmarLetters: number;
  imageBytes: number;
  textBytes: number;
  confirmed: boolean;
};

export type UploadPlan = {
  name: string;
  size: number;
  kind: UploadKind;
  inputFormat: "pdf" | "docx" | "";
  /** Myanmar letters were found — this is what decides `method` */
  readable: boolean;
  script: ScriptVerdict;
  detection: Detection | null;
  detector: DetectorReport;
  gate: Gate;
  notice: string;
  /** extracted text, for the panel's own preview. Never uploaded. */
  text: string;
};

export { DOCX_IMAGE_DOMINANCE, PDF_TEXT_MIN_CHARS };

export const NOTICE = {
  pdfText: "စာသားအလွှာ တွေ့ပါတယ် — parser လမ်းကြောင်းအတိုင်း ဆက်သွားပါမယ်။",
  pdfScan:
    "စာသားအလွှာ မတွေ့ပါ — ဒီစာမျက်နှာတွေက scan ပုံတွေပါ။ ဒါကို လက်ခံပြီး OCR လမ်းကြောင်းနဲ့ ဆက်ပါမယ်။",
  docxText: "ပုံအလေးအနက် မပါတဲ့ DOCX ပါ — parser လမ်းကြောင်းအတိုင်း ဆက်သွားပါမယ်။",
  docxImages:
    "သင့် DOCX ထဲမှာ ပုံတွေပါနေတာ တွေ့ပါတယ်။ ပုံပါတဲ့ .docx ကို text-based အဖြစ်သာ ယူဆပြီး ပုံနေရာတွေက ကွက်လပ် ဖြစ်နေပါမယ်။ ပုံထဲက စာသားကို အမှန်တကယ် လိုချင်တယ်ဆိုရင် အောက်က dropdown မှာ OCR ကို ရွေးပါ။",
  unsupported: "PDF သို့မဟုတ် DOCX ဖိုင်သာ လက်ခံပါတယ်။",
  /** the Zawgyi prompt — analysis flow only */
  zawgyi:
    "But we don't see any readable text in your document. One of the most likely reasons is that the document is encoded with Zawgyi. Please convert the document into readable text with our conversion tool first.",
  zawgyiMm:
    "သင့်စာရွက်စာတမ်းထဲမှာ ဖတ်လို့ရတဲ့ စာသား မတွေ့ရပါ။ ဖြစ်နိုင်ခြေအများဆုံးက Zawgyi နဲ့ ရိုက်ထားတာ ဖြစ်ပါတယ်။ ကျွန်တော်တို့ရဲ့ conversion tool နဲ့ အရင် ပြောင်းလိုက်ပါ။",
  ocrPdf:
    "Your document is image based — its pages carry no text layer, only scans. We can run OCR over them first.",
  ocrDocx:
    "Your document is image based — the text sits inside the pictures, so the text path would come back blank. We can run OCR over them first.",
} as const;

/* ------------------------------------------------------------------ */
/* inspection                                                          */
/* ------------------------------------------------------------------ */

const emptyDetector = (): DetectorReport => ({
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

export async function inspectUpload(file: File, flow: Flow = "conversion"): Promise<UploadPlan> {
  const base: UploadPlan = {
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
  const detector: DetectorReport = {
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
      // no question is ever asked about a text-bearing PDF
      return { ...common, kind: "pdf-text", gate: "none", notice: NOTICE.pdfText };
    }
    return {
      ...common,
      kind: "pdf-scan",
      // conversion just runs OCR; analysis asks first
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
      // conversion offers the dropdown; analysis asks yes/no
      gate: flow === "analysis" ? "confirm-ocr" : "choose-docx",
      notice: NOTICE.docxImages,
    };
  }

  return {
    ...common,
    kind: "docx-text",
    // a Zawgyi document only stops the analysis flow; conversion handles it
    gate: flow === "analysis" && !script.readable ? "confirm-zawgyi" : "none",
    notice: NOTICE.docxText,
  };
}

/**
 * The analysis flow also has to stop on a Zawgyi **PDF**. That is decided
 * after inspection because `inspectUpload` is shared with the conversion flow.
 */
export function gateFor(plan: UploadPlan, flow: Flow): Gate {
  if (plan.kind === "unsupported") return "none";
  if (flow === "conversion") return plan.kind === "docx-images" ? "choose-docx" : "none";
  if (plan.kind === "pdf-scan") return "confirm-ocr";
  if (plan.kind === "docx-images") return "choose-docx";
  return plan.readable ? "none" : "confirm-zawgyi";
}

/* ------------------------------------------------------------------ */
/* the payload                                                         */
/* ------------------------------------------------------------------ */

export type SubmitMetadata = {
  v: 1;
  source: Flow;
  content?: Content;
  job?: Job;
  method?: Method;
  originalName: string;
  uploadName: string;
  clickedAt?: string;
  fileFormat: "pdf" | "docx";
  conversion: "txt";
  desired: "txt" | "docx" | "pdf";
  detector?: DetectorReport;
};

/** what the user picked on an image-heavy DOCX in the conversion flow */
export type DocxChoice = "default" | "manual";

export type BuildArgs = {
  plan: UploadPlan;
  flow: Flow;
  /** conversion + image-heavy DOCX only */
  choice?: DocxChoice;
  /** the user answered a prompt or used the dropdown */
  confirmed?: boolean;
  /** the instant the user clicked upload */
  at?: Date;
};

/**
 * The decision table. Every row of `API-PAYLOAD.md` §4 is produced here and
 * nowhere else, so the verification script can assert the whole matrix by
 * calling this one function.
 */
export function route(
  plan: UploadPlan,
  flow: Flow,
  choice: DocxChoice = "default"
): { content: Content; job: Job; method: Method } {
  // OCR — the only method is `default`: ignore the text layer, read the pixels
  const ocr = {
    content: "image" as Content,
    job: (analysis ? "conversion-analysis" : "ocr") as Job,
    method: "default" as Method,
  };

  if (plan.kind === "pdf-scan") return ocr;
  if (plan.kind === "docx-images") {
    // Extract: images are left blank. The letter count still decides the
    // decoder, so a Zawgyi document sends `manual` — which is per-page praser
    // and leaves the images alone regardless, so nothing is lost.
    return {
      content: "text",
      job: "extracting",
      method: choice === "manual" ? "manual" : "default",
    };
  }

  // a text layer: `default` skips the praser, so it needs real Burmese letters
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
}: BuildArgs): SubmitMetadata {
  const inputFormat = (plan.inputFormat || "pdf") as "pdf" | "docx";
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

/** the benchmark fixture: nothing is classified and the file is not renamed */
export function demoPayload(originalName = "sample.pdf"): SubmitMetadata {
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

/* ------------------------------------------------------------------ */
/* filename normalisation                                              */
/* ------------------------------------------------------------------ */

/** `2026-09-30T14:12:33.123Z` → `2026-09-30T14:12:33Z` */
export function isoSeconds(at: Date): string {
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
export function normalizeName(originalName: string, inputFormat: "pdf" | "docx", at: Date): string {
  const stamp = at.toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  const base = String(originalName ?? "").normalize("NFC").replace(/\.[^.]*$/, "");

  let safe = base
    .replace(/[\\/]+/g, " ")
    // control characters and the Windows-reserved set
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001F\u007F<>:"|?*]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "");

  const chars = Array.from(safe);
  if (chars.length > 60) safe = chars.slice(0, 60).join("").replace(/[-.]+$/, "");
  if (!safe) safe = "file";

  return `${stamp}__${safe}.${inputFormat}`.normalize("NFC");
}

/* ------------------------------------------------------------------ */
/* quota — arithmetic, not an endpoint                                 */
/* ------------------------------------------------------------------ */

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

export type QuotaState = { token: string; day: string; used: number };

export const utcDay = (at: Date = new Date()) => at.toISOString().slice(0, 10);

type Storagelike = Pick<Storage, "getItem" | "setItem">;

export function readQuota(storage: Storagelike | null, token: string, at: Date = new Date()): QuotaState {
  const day = utcDay(at);
  const fresh: QuotaState = { token, day, used: 0 };
  if (!storage) return fresh;
  try {
    const raw = storage.getItem(QUOTA_KEY);
    if (!raw) return fresh;
    const saved = JSON.parse(raw) as QuotaState;
    // a new visitor token or a new UTC day starts the count over
    if (saved.token !== token || saved.day !== day) return fresh;
    return { token, day, used: Number(saved.used) || 0 };
  } catch {
    return fresh;
  }
}

export function writeQuota(storage: Storagelike | null, state: QuotaState): void {
  try {
    storage?.setItem(QUOTA_KEY, JSON.stringify(state));
  } catch {
    /* private mode — the server still enforces the real limit */
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
export function usedFromRemaining(remaining: unknown): number | null {
  if (typeof remaining !== "number" || !Number.isFinite(remaining)) return null;
  if (remaining >= DAILY_LIMIT) return 0;
  return Math.max(0, Math.min(DAILY_LIMIT, DAILY_LIMIT - remaining));
}

export const remainingOf = (state: QuotaState) => Math.max(0, DAILY_LIMIT - state.used);

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} kB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
