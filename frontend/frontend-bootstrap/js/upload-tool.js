/**
 * The upload tool overlay — the mirror of `UploadToolSection.tsx`.
 *
 * The gate itself lives in `upload.js`; this file is only the panel. It serves
 * both doors from one overlay:
 *
 *   conversion  opened by "PDF တင်ရန်" — the Extract / OCR dropdown on an
 *               image-heavy DOCX, and nothing asked otherwise
 *   analysis    opened from the grammar tool — yes/no prompts, no dropdown,
 *               and "no" cancels without sending anything
 */
import { onOverlayOpen } from "./overlay.js";
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
} from "./upload.js";
import { isTerminal, pollDelivery, readDelivery, stateLabel } from "./delivery.js";
const SUBMIT_TIMEOUT_MS = 8000;
const TOKEN_KEY = "akkhara:visitor";
const store = () => {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
};
const visitorToken = () => store()?.getItem(TOKEN_KEY) || "anon";
async function csrfToken() {
  const response = await fetch("/csrf-token", {
    credentials: "same-origin",
    cache: "no-store",
    signal: AbortSignal.timeout(SUBMIT_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`CSRF endpoint answered ${response.status}`);
  const body = await response.json();
  if (!body.csrfToken) throw new Error("CSRF endpoint returned no token");
  return body.csrfToken;
}
export function initUploadTool() {
  const overlay = document.getElementById("uploadOverlay");
  if (!overlay) return;
  const el = (id) => document.getElementById(id);
  const fileLabel = el("upFile");
  const status = el("upStatus");
  const eyebrow = el("upEyebrow");
  const title = el("upTitle");
  const sub = el("upSub");
  const quota = el("upQuota");
  const quotaText = el("upQuotaText");
  const drop = el("upDrop");
  const input = el("upInput");
  const errorBox = el("upError");
  const errorText = el("upErrorText");
  const result = el("upResult");
  const nameOut = el("upName");
  const chip = el("upChip");
  const stats = el("upStats");
  const notice = el("upNotice");
  const noticeText = el("upNoticeText");
  const promptZawgyi = el("upPromptZawgyi");
  const zawgyiEn = el("upZawgyiEn");
  const zawgyiMm = el("upZawgyiMm");
  const promptOcr = el("upPromptOcr");
  const ocrText = el("upOcrText");
  const chooser = el("upChooser");
  const select = el("uploadEngine");
  const actions = el("upActions");
  const chipName = el("upChipName");
  const sendingRow = el("upSending");
  const sendingText = el("upSendingText");
  const submit = el("upSubmit");
  const deliveryRow = el("upDelivery");
  const deliveryLabel = el("upDeliveryLabel");
  const deliveryError = el("upDeliveryError");
  const download = el("upDownload");
  const downloadLabel = el("upDownloadLabel");
  const sent = el("upSent");
  const sentNote = el("upSentNote");
  const sentJson = el("upSentJson");
  let plan = null;
  let flow = "conversion";
  let gate = "none";
  let choice = "default";
  let picked = null;
  let used = 0;
  let sending = false;
  let abortSignal = { aborted: false };
  function paintDelivery(d) {
    if (!d) { deliveryRow.hidden = true; return; }
    deliveryRow.hidden = false;
    deliveryRow.classList.toggle("is-ready", d.state === "READY");
    deliveryRow.classList.toggle("is-failed", d.state === "FAILED" || Boolean(d.error));
    deliveryLabel.textContent = stateLabel(d.state);
    const ready = d.state === "READY" && d.downloadUrl;
    download.hidden = !ready;
    if (ready) {
      download.href = d.downloadUrl;
      if (d.finalFilename) download.setAttribute("download", d.finalFilename);
      downloadLabel.textContent =
        `Download${d.finalFilename ? ` ${d.finalFilename}` : ""}` +
        (d.finalBytes ? ` · ${formatBytes(d.finalBytes)}` : "");
    }
    deliveryError.hidden = !d.error;
    deliveryError.textContent = d.error || "";
  }
  const setStatus = (text) => {
    const node = status.lastChild;
    if (node) node.textContent = text;
  };
  const remaining = () => Math.max(0, DAILY_LIMIT - used);
  function paintQuota() {
    const left = remaining();
    quota.hidden = left > 0;
    if (left <= 0) {
      quotaText.textContent = `You have used all ${DAILY_LIMIT} uploads for today. The allowance resets at 00:00 UTC — 06:30 in Myanmar.`;
    }
    drop.classList.toggle("is-blocked", left <= 0);
    input.disabled = left <= 0;
    if (!plan) setStatus(left > 0 ? `${left} of ${DAILY_LIMIT} left today` : "Daily limit reached");
  }
  function paintRoute() {
    if (!plan) return;
    const picked_ = route(plan, flow, choice);
    chip.textContent = `${picked_.job} · ${picked_.method}`;
    chip.classList.toggle("is-ocr", picked_.job === "ocr" || picked_.content === "image");
  }
  function paintFlow() {
    const analysis = flow === "analysis";
    eyebrow.textContent = analysis ? "grammar analysis / upload" : "upload / extraction path";
    title.textContent = analysis ? "Upload a document to analyse" : "Upload a PDF or DOCX";
    sub.textContent = analysis
      ? "The file is checked in your browser first. If the Burmese is not readable, you are asked before anything is analysed."
      : "The file is checked in your browser first — that check picks the route the job is tagged with.";
    overlay.setAttribute("aria-label", analysis ? "grammar analysis / upload" : "upload / extraction path");
  }
  function reset() {
    plan = null;
    picked = null;
    sending = false;
    abortSignal.aborted = true;
    abortSignal = { aborted: false };
    paintDelivery(null);
    gate = "none";
    choice = "default";
    input.value = "";
    drop.hidden = false;
    drop.classList.remove("is-busy", "is-over");
    errorBox.hidden = true;
    result.hidden = true;
    sent.hidden = true;
    actions.hidden = false;
    sendingRow.hidden = true;
    chooser.hidden = true;
    promptZawgyi.hidden = true;
    promptOcr.hidden = true;
    notice.hidden = false;
    select.disabled = false;
    submit.disabled = false;
    fileLabel.textContent = `${flow} · pdf / docx`;
    paintQuota();
  }
  async function take(file) {
    if (remaining() <= 0) return;
    picked = file;
    drop.classList.add("is-busy");
    errorBox.hidden = true;
    el("upDropTitle").textContent = "Checking the file…";
    setStatus("Checking the file…");
    let next;
    try {
      next = await inspectUpload(file, flow);
    } catch (error) {
      drop.classList.remove("is-busy");
      el("upDropTitle").textContent = "Drop a PDF or DOCX here, or click to choose";
      errorText.textContent = error instanceof Error ? error.message : "The file could not be read.";
      errorBox.hidden = false;
      paintQuota();
      return;
    }
    drop.classList.remove("is-busy");
    el("upDropTitle").textContent = "Drop a PDF or DOCX here, or click to choose";
    if (next.kind === "unsupported") {
      errorText.textContent = next.notice;
      errorBox.hidden = false;
      paintQuota();
      return;
    }
    plan = next;
    gate = gateFor(next, flow);
    choice = "default";
    fileLabel.textContent = `${next.name} · ${formatBytes(next.size)}`;
    nameOut.textContent = next.name;
    chipName.textContent = next.name;
    noticeText.textContent = next.notice;
    result.classList.toggle("is-scan", next.kind === "pdf-scan");
    result.classList.toggle("is-images", next.kind === "docx-images");
    stats.innerHTML =
      next.inputFormat === "pdf"
        ? `<div><dt>size</dt><dd>${formatBytes(next.size)}</dd></div>
           <div><dt>pages</dt><dd>${next.detector.textPages}/${next.detector.pages} text</dd></div>
           <div><dt>mm letters</dt><dd>${next.detector.myanmarLetters}</dd></div>
           <div><dt>layer</dt><dd>${next.kind === "pdf-text" ? "text" : "image only"}</dd></div>`
        : `<div><dt>size</dt><dd>${formatBytes(next.size)}</dd></div>
           <div><dt>image bytes</dt><dd>${formatBytes(next.detector.imageBytes)}</dd></div>
           <div><dt>text bytes</dt><dd>${formatBytes(next.detector.textBytes)}</dd></div>
           <div><dt>ratio</dt><dd>${
             next.detector.textBytes
               ? (next.detector.imageBytes / next.detector.textBytes).toFixed(1)
               : "∞"
           }× / ${DOCX_IMAGE_DOMINANCE}×</dd></div>`;
    chooser.hidden = gate !== "choose-docx";
    promptZawgyi.hidden = gate !== "confirm-zawgyi";
    promptOcr.hidden = gate !== "confirm-ocr";
    notice.hidden = gate === "confirm-zawgyi" || gate === "confirm-ocr";
    actions.hidden = gate === "confirm-zawgyi" || gate === "confirm-ocr";
    if (gate === "confirm-zawgyi") {
      zawgyiEn.textContent = NOTICE.zawgyi;
      zawgyiMm.textContent = NOTICE.zawgyiMm;
    }
    if (gate === "confirm-ocr") {
      ocrText.textContent = next.inputFormat === "pdf" ? NOTICE.ocrPdf : NOTICE.ocrDocx;
    }
    select.value = choice;
    drop.hidden = true;
    result.hidden = false;
    sent.hidden = true;
    paintRoute();
    setStatus(`${remaining()} of ${DAILY_LIMIT} left today`);
  }
  async function send(confirmed) {
    if (!plan || sending) return;
    sending = true;
    const payload = buildPayload({ plan, flow, choice, confirmed });
    actions.hidden = true;
    chooser.hidden = true;
    promptZawgyi.hidden = true;
    promptOcr.hidden = true;
    sendingText.textContent = `Submitting ${plan.name}…`;
    sendingRow.hidden = false;
    setStatus("Submitting…");
    let note = "";
    let accepted = null;
    let serverUsed = null;
    try {
      const body = new FormData();
      if (picked) body.append("file", new File([picked], payload.uploadName, { type: picked.type }));
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
      if (token) store()?.setItem(TOKEN_KEY, token);
      if (response.ok) {
        const body = await response.clone().json().catch(() => ({}));
        accepted = readDelivery(body, "");
        serverUsed = usedFromRemaining(body?.remaining);
      }
      if (response.status === 429) {
        const answer = await response.json().catch(() => ({}));
        serverUsed = usedFromRemaining(answer?.remaining) ?? DAILY_LIMIT;
        note = "Your daily limit is used up. The server refused this upload.";
      } else if (!response.ok) {
        throw new Error(`The job endpoint answered ${response.status}.`);
      }
    } catch {
      note = "No job endpoint answered here, so nothing was processed. This is what the gate sent:";
    }
    const state = readQuota(store(), visitorToken());
    used = serverUsed ?? state.used + 1;
    writeQuota(store(), { ...state, used });
    sentNote.textContent = note;
    sentJson.textContent = JSON.stringify(payload, null, 2);
    sendingRow.hidden = true;
    notice.hidden = true;
    sent.hidden = false;
    paintDelivery(accepted);
    setStatus("Submitted");
    sending = false;
    if (accepted && accepted.submitId && !isTerminal(accepted.state)) {
      const signal = abortSignal;
      const settled = await pollDelivery(accepted.submitId, {
        signal,
        onUpdate: (update) => { if (!signal.aborted) paintDelivery(update); },
      });
      if (!signal.aborted) paintDelivery(settled);
    }
  }
  select.addEventListener("change", () => {
    choice = select.value === "manual" ? "manual" : "default";
    paintRoute();
  });
  submit.addEventListener("click", () => send(gate === "choose-docx"));
  document
    .querySelectorAll("[data-up-confirm]")
    .forEach((button) => button.addEventListener("click", () => send(true)));
  drop.addEventListener("dragover", (event) => {
    event.preventDefault();
    drop.classList.add("is-over");
  });
  drop.addEventListener("dragleave", (event) => {
    event.preventDefault();
    drop.classList.remove("is-over");
  });
  drop.addEventListener("drop", (event) => {
    event.preventDefault();
    drop.classList.remove("is-over");
    const [file] = event.dataTransfer.files;
    if (file) take(file);
  });
  input.addEventListener("change", (event) => {
    const [file] = event.target.files;
    if (file) take(file);
  });
  document.querySelectorAll("[data-up-reset]").forEach((button) => button.addEventListener("click", reset));
  window.addEventListener("akkhara:upload-flow", (event) => {
    flow = event.detail === "analysis" ? "analysis" : "conversion";
    paintFlow();
    reset();
  });
  onOverlayOpen("upload", () => {
    used = readQuota(store(), visitorToken()).used;
    if (!plan) reset();
    else paintQuota();
  });
  paintFlow();
  used = readQuota(store(), visitorToken()).used;
  paintQuota();
}