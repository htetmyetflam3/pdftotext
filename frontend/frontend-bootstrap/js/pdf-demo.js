/**
 * The 100-page benchmark demo — two readings of the same fixture.
 *
 * Both panes show the .txt files as the server serves them: no excerpt is
 * cut in the browser.
 *
 * The demo NEVER reaches the backend — not standalone and not on the
 * integrated site. Both panes are fixtures chosen and saved up front, so
 * submitting the PDF could only ever return what is already on disk; doing so
 * would burn a real job and a slot of the visitor's daily quota to recompute a
 * known answer. The delay in `requestDemo` is cosmetic, and it is the only
 * "processing" here. A watchdog still guarantees the panel never sits on the
 * loading state.
 */
import { onOverlayOpen } from "./overlay.js";
import { demoPayload } from "./upload.js";
const GENERIC_OUTPUT_URL = "/samples/sample-freeconvert.txt";
const PARSED_OUTPUT_URL = "/samples/sample.praser.txt";
const SAMPLE_NAME = "sample.pdf";
const WATCHDOG_MS = 12000;
const FAKE_WORK_MS = 900;
/**
 * The metadata the demo *would* carry. Rendered in the panel and never sent:
 * this overlay has no submit path at all.
 */
export const DEMO_METADATA = demoPayload(SAMPLE_NAME);
let cachedDemo = null;
async function textFrom(url, timeout = 8000) {
  const response = await fetch(url, { signal: AbortSignal.timeout(timeout) });
  if (!response.ok) throw new Error(`Could not load ${url}`);
  return response.text();
}
async function requestDemo() {
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
export function initPdfDemo() {
  const overlay = document.getElementById("pdfOverlay");
  const status = document.getElementById("pdfStatus");
  const loading = document.getElementById("pdfLoading");
  const error = document.getElementById("pdfError");
  const errorMsg = document.getElementById("pdfErrorMsg");
  const result = document.getElementById("pdfResult");
  const source = document.getElementById("pdfSource");
  const genericPre = document.getElementById("pdfGeneric");
  const parsedPre = document.getElementById("pdfParsed");
  if (!overlay || !loading || !result) return;
  const setStatus = (text) => {
    const node = status?.lastChild;
    if (node) node.textContent = text;
  };
  const show = (state) => {
    loading.hidden = state !== "loading";
    if (error) error.hidden = state !== "error";
    result.hidden = state !== "ready";
  };
  const fail = (message) => {
    cachedDemo = null;
    if (errorMsg) errorMsg.textContent = message;
    setStatus("Demo unavailable");
    show(error ? "error" : "ready");
  };
  let running = false;
  let watchdog = 0;
  function run(force = false) {
    if (running) return;
    running = true;
    show("loading");
    setStatus("Reading the saved outputs…");
    window.clearTimeout(watchdog);
    watchdog = window.setTimeout(() => {
      if (!running) return;
      running = false;
      fail("The demo took too long to answer. Download the saved outputs below instead.");
    }, WATCHDOG_MS);
    loadDemo(force)
      .then((demo) => {
        genericPre.textContent = demo.generic;
        parsedPre.textContent = demo.parsed;
        if (source) source.textContent = "served .txt file · not submitted";
        const meta = document.getElementById("pdfMetaJson");
        if (meta) meta.textContent = JSON.stringify(DEMO_METADATA, null, 2);
        setStatus("Demo result · saved fixtures");
        show("ready");
      })
      .catch((err) => fail(err instanceof Error ? err.message : "Could not load the benchmark demo."))
      .finally(() => {
        running = false;
        window.clearTimeout(watchdog);
      });
  }
  onOverlayOpen("pdf", () => run(false));
  document.getElementById("pdfRetry")?.addEventListener("click", () => run(true));
  new MutationObserver(() => {
    if (!overlay.hidden && result.hidden && (!error || error.hidden) && !running) run(false);
  }).observe(overlay, { attributes: true, attributeFilter: ["hidden"] });
}