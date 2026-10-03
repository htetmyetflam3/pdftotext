/**
 * Verification for the responsive hero/comparison, shared overlay shell and
 * the exact-fixture benchmark/API demo flow.
 *
 * There is no browser in this sandbox (no chromium download, no apt), so this
 * runs the app in a real DOM (jsdom) instead of a browser:
 *   - the CSS numbers are read from the *shipped* single-file build
 *     (frontend-react/dist/index.html), so they are the ones that ship;
 *   - the app is bundled to a classic-script IIFE with this project's own Vite
 *     (jsdom cannot execute `<script type="module">`) and mounted, so the checks
 *     exercise real React output, real events and real wiring.
 * jsdom does no layout, so pixels are NOT verified.
 *
 * Prerequisites (both outside this project's dependencies):
 *   cd frontend-react && npm install          # vite, react, tailwind for the build
 *   mkdir -p /tmp/verify && cd /tmp/verify && npm i jsdom
 * Run:
 *   cd frontend-react
 *   NODE_PATH=/tmp/verify/node_modules node verify-overlay-and-slider.mjs
 */
import { readFileSync, mkdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import path from "node:path";
import { build } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const require = createRequire(import.meta.url);
const { JSDOM, VirtualConsole } = require("jsdom");

const OUT = "/tmp/fr-verify";
const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
};

/* ---------------- build a classic-script bundle to drive in jsdom ---------------- */

mkdirSync(OUT, { recursive: true });
await build({
  configFile: false,
  root: path.resolve("."),
  plugins: [react(), tailwindcss()],
  logLevel: "error",
  build: {
    outDir: `${OUT}/dist`,
    emptyOutDir: true,
    minify: false,
    cssCodeSplit: false,
    rollupOptions: {
      output: { format: "iife", inlineDynamicImports: true, entryFileNames: "app.js", assetFileNames: "app.[ext]" },
    },
  },
});
const appJs = readFileSync(`${OUT}/dist/app.js`, "utf8");
const appCss = readFileSync(`${OUT}/dist/app.css`, "utf8");

/* ---------------- 1. slider box sizing, read from the shipped build ---------------- */
/* jsdom's CSSOM drops the modern at-rules Tailwind v4 emits, so the numbers are
   read with plain patterns from the CSS the single-file build inlines. */
const shippedHtml = readFileSync("../dist/react/index.html", "utf8");
const rawCss = [...shippedHtml.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join("\n");
/* strip comments and collapse declaration whitespace so the patterns below are
   independent of how the bundler formats the CSS */
const shippedCss = rawCss
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\s*([:;{}])\s*/g, "$1")
  .replace(/\s+/g, " ")
  .trim();

const rule = (text, sel) => text.match(new RegExp(`${sel}\\{[^}]*\\}`))?.[0] ?? "";
/* every @media block with this query (the bundler emits one block per rule) */
const mediaBlock = (query) => {
  const esc = query.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&").replace(/:\s*/, ":\\s*");
  const needle = new RegExp(`@media\\(\\s*${esc}\\s*\\)`, "g");
  const blocks = [];
  for (const m of shippedCss.matchAll(needle)) {
    let depth = 0;
    for (let j = shippedCss.indexOf("{", m.index); j < shippedCss.length; j += 1) {
      if (shippedCss[j] === "{") depth += 1;
      else if (shippedCss[j] === "}") {
        depth -= 1;
        if (depth === 0) {
          blocks.push(shippedCss.slice(shippedCss.indexOf("{", m.index) + 1, j));
          break;
        }
      }
    }
  }
  return blocks.join("\n");
};

const sm = mediaBlock("min-width:640px");
const lg = mediaBlock("min-width:1024px");
const wrapBase = rule(shippedCss, "\\.lp-wrap");
const heroBase = rule(shippedCss, "\\.lp-hero");
const slideBase = rule(shippedCss, "\\.lp-slide");
const slideLg = rule(lg, "\\.lp-slide");
const pagerBase = rule(shippedCss, "\\.lp-pager");

check("shipped CSS: slider container max-width 80rem (ui max-w-7xl)", /max-width:80rem/.test(wrapBase), wrapBase);
check("shipped CSS: container px-4, sm:px-6",
  /padding-inline:1rem/.test(wrapBase) && /padding-inline:1\.5rem/.test(rule(sm, "\\.lp-wrap")),
  `${wrapBase} | ${rule(sm, "\\.lp-wrap")}`);
check("shipped CSS: section pt-20, lg:pt-24, nothing after it",
  /padding:5rem 0 0/.test(heroBase) && /padding:6rem 0 0/.test(rule(lg, "\\.lp-hero")),
  `${heroBase} | ${rule(lg, "\\.lp-hero")}`);
check("shipped CSS: slide gap-8 -> lg:gap-12",
  /gap:2rem/.test(slideBase) && /gap:3rem/.test(slideLg), `${slideBase} | ${slideLg}`);
check("shipped CSS: slide uses zero-minimum fixed fractions so both hero frames match",
  /grid-template-columns:1fr/.test(slideBase) &&
  /grid-template-columns:minmax\(0,1\.02fr\) minmax\(0,1\.08fr\)/.test(slideLg),
  slideLg);
check("shipped CSS: slide pt-6/pb-6 -> lg:pt-10/lg:pb-12",
  /padding:1\.5rem/.test(slideBase) && /padding:2\.5rem 3\.75rem 3rem/.test(slideLg), `${slideBase} | ${slideLg}`);
check("shipped CSS: old 540px min-height gone from the slide", !/min-height/.test(slideLg), slideLg);
check("shipped CSS: pager row uses ui's controls spacing (mt-2 pb-10)",
  /margin:0?\.5rem 0 2\.5rem/.test(pagerBase), pagerBase);

check("shipped CSS: the shell's own utilities compiled (z-90, backdrop tint, body cap, ak-fade/ak-zoom)",
  [String.raw`.z-90{z-index:90}`,
   String.raw`.bg-\[\#0e1626\]\/65{background-color:#0e1626a6}`,
   String.raw`.max-h-\[min\(66vh\,720px\)\]{max-height:min(66vh,720px)}`,
   ".ak-fade{", ".ak-zoom{"].every((needle) => shippedCss.includes(needle)));

check("shipped CSS: no ui-project token classes leaked (.bg-canvas/.text-ink/.border-line/brand-*)",
  !/\.(bg-canvas|text-ink|text-muted|border-line|bg-brand-50|from-brand-500|bg-ink)\{/.test(shippedCss));

const sourceSample = readFileSync("../frontend-bootstrap/public/samples/sample.pdf");
const publicSample = readFileSync("public/samples/sample.pdf");
const sourceResult = readFileSync("../frontend-bootstrap/public/samples/sample.praser.txt");
const publicResult = readFileSync("public/samples/sample.praser.txt");
check("download is the exact 100-page sample fixture",
  publicSample.equals(sourceSample) && publicSample.length === 269519 &&
  createHash("sha256").update(publicSample).digest("hex") === "a94e42e891e2b8d2c6b92300a52d86df3738575e09beddd362f93ba262a2c9fa");
check("bundled parser evidence is the exact cleanup-off result",
  publicResult.equals(sourceResult) && publicResult.length === 227058 &&
  createHash("sha256").update(publicResult).digest("hex") === "a0be59ebf8d9de8a45ff59a1807da6540b14652a6c498a45c523b6d9b0b669d4");
check("all saved benchmark outputs are public and the old synthetic sample source is gone",
  ["sample-freeconvert.txt", "sample-pdf2go.txt", "sample-pdf24.txt", "sample-pdftotext.txt"]
    .every((name) => existsSync(`public/samples/${name}`)) &&
  !existsSync("src/data/samplePdf.ts"));

/* ---------------- 2. mount the app in jsdom ---------------- */

const page = `<!doctype html><html><head><style>${appCss}</style></head><body><div id="root"></div></body></html>`;
const virtualConsole = new VirtualConsole();
virtualConsole.on("jsdomError", () => {});

const dom = new JSDOM(page, {
  url: "http://localhost/",
  runScripts: "outside-only",
  pretendToBeVisual: true,
  virtualConsole,
});
const { window } = dom;
const doc = window.document;

// stubs jsdom lacks; React, framer-motion and canvas-confetti expect them
window.matchMedia ||= (q) => ({
  matches: false, media: q, onchange: null,
  addEventListener() {}, removeEventListener() {},
  addListener() {}, removeListener() {}, dispatchEvent: () => false,
});
window.ResizeObserver ||= class { observe() {} unobserve() {} disconnect() {} };
window.IntersectionObserver ||= class { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } };
window.scrollTo ||= () => {};
const ctxStub = new Proxy({}, { get: (_t, p) => (p === "canvas" ? {} : () => {}), set: () => true });
window.HTMLCanvasElement.prototype.getContext = () => ctxStub;

/* jsdom implements neither fetch nor Response. pdf.js probes
   `Response.prototype.bytes` as it loads, and this harness bundles the app to
   one classic script (jsdom cannot run ES modules), so the lazily-imported
   detector is evaluated here even though the shipped build defers it. Stub the
   missing web API rather than let a jsdom gap read as an app error. */
window.Response = class {
  constructor(body) { this.body = body; }
  async arrayBuffer() { return new ArrayBuffer(0); }
  async bytes() { return new Uint8Array(0); }
  async text() { return ""; }
  async json() { return {}; }
};

const submitRequests = [];
const fetchedUrls = [];
const staticText = {
  "/samples/sample-freeconvert.txt": "--- Page 1 ---\nBuddha's Teachings\n???????? ????????\n\n--- Page 2 ---\nSecond page",
  "/samples/sample.praser.txt": "--- Page 1 ---\nဘုရားရှင်၏ တရားတော်\nGod of Slaughter\n\n--- Page 2 ---\nSecond page",
};
window.fetch = async (input, init = {}) => {
  const url = typeof input === "string" ? input : input?.url;
  fetchedUrls.push(url);
  if (url === "/samples/sample.pdf") {
    return {
      ok: true,
      status: 200,
      blob: async () => new window.Blob(["%PDF-1.4 exact benchmark fixture"], { type: "application/pdf" }),
      text: async () => "%PDF-1.4 exact benchmark fixture",
      json: async () => ({}),
    };
  }
  if (url in staticText) {
    return {
      ok: true,
      status: 200,
      text: async () => staticText[url],
      blob: async () => new window.Blob([staticText[url]], { type: "text/plain" }),
      json: async () => ({}),
    };
  }
  // kept deliberately: it records any call so the demo checks can prove that
  // NOTHING reaches it. The upload gate has its own submit path and may use it.
  if (url === "/api/submit") {
    submitRequests.push({ url, init });
    return {
      ok: true,
      status: 202,
      json: async () => ({
        formId: "demo-form-id",
        submitId: "demo-submit-id",
        status: "pending",
        text: staticText["/samples/sample.praser.txt"],
      }),
      text: async () => "",
    };
  }
  return { ok: false, status: 404, text: async () => "", json: async () => ({}) };
};

window.eval(`${appJs}\n//# sourceURL=app.js`);

const wait = (ms) => new Promise((r) => window.setTimeout(r, ms));
await wait(700);

const shell = () => doc.querySelector('[role="dialog"]');
const shellBox = () => shell()?.firstElementChild ?? null;
const shellBody = () => shellBox()?.children[2] ?? null;

check("app mounts", !!doc.querySelector("#heroSlider"), `root children=${doc.getElementById("root").children.length}`);

/* ---------------- 3. slider keeps its own inner elements ---------------- */

check("slider still 2 slides on one track", doc.querySelectorAll(".lp-track > .lp-slide").length === 2);
check("slide 1 is the animated text-extraction SVG",
  !!doc.querySelector('.lp-slide:nth-child(1) .lp-screen > svg[aria-label*="Zawgyi PDF"]') &&
  !doc.querySelector("img[src*='hero-converter.png']"),
  `hero svg.svg-fx=${doc.querySelectorAll(".lp-slide .lp-screen > svg.svg-fx").length}`);
check("slide 2 is the custom OCR development SVG",
  !!doc.querySelector('.lp-slide:nth-child(2) .lp-screen > svg[aria-label*="Tesseract recognition model"]'));
const screenRule = rule(shippedCss, "\\.lp-screen");
const screenMediaRule = rule(shippedCss, "\\.lp-screen>svg") || rule(shippedCss, "\\.lp-screen svg");
const calloutRule = rule(shippedCss, "\\.lp-callout");
check("both slide arts are pinned to the same 1200x820 canvas (windows line up)",
  [...doc.querySelectorAll(".lp-slide .lp-screen > svg.svg-fx")].length === 2 &&
  [...doc.querySelectorAll(".lp-slide .lp-screen > svg.svg-fx")].every((svg) => /viewBox="0 0 1200 820"/.test(svg.outerHTML)) &&
  /aspect-ratio:1200\s*\/\s*820/.test(screenRule) &&
  /overflow:hidden/.test(screenRule) &&
  /position:absolute/.test(screenMediaRule) &&
  /inset:0/.test(screenMediaRule) &&
  /height:100%/.test(screenMediaRule) &&
  /position:absolute/.test(calloutRule) &&
  /inset:auto 0 0/.test(calloutRule),
  `${screenRule} | ${screenMediaRule} | ${calloutRule}`);
check("grammar artwork is no longer used as a hero slide",
  !doc.querySelector(".lp-slide img[src*='hero-grammar.png']"));
check("old hero-converter.png is gone from public/images",
  !existsSync("public/images/hero-converter.png"));
check("slider inner callouts/pager/arrows untouched",
  doc.querySelectorAll(".lp-slide .lp-callout").length === 2 &&
  doc.querySelectorAll(".lp-pager button").length === 2 &&
  doc.querySelectorAll(".lp-arrow").length === 2);
check("hero order is extraction first and custom OCR second",
  /PDF Text Extraction/.test(doc.querySelector('.lp-pager button[data-slide="0"]')?.textContent ?? "") &&
  /Custom OCR/.test(doc.querySelector('.lp-pager button[data-slide="1"]')?.textContent ?? ""));

const mobileComparison = doc.querySelector('#compare [role="table"]');
const desktopComparison = doc.querySelector("#compare table");
check("comparison is responsive: stacked cards below lg and a desktop table at lg",
  /lg:hidden/.test(mobileComparison?.className ?? "") &&
  mobileComparison?.querySelectorAll('[role="row"]').length === 6 &&
  /hidden lg:block/.test(desktopComparison?.parentElement?.className ?? ""));

const benchmark = doc.querySelector("#benchmark");
const benchmarkHrefs = [...(benchmark?.querySelectorAll("a") ?? [])].map((a) => a.getAttribute("href"));
check("benchmark offers the exact sample as a direct download and a real API-demo trigger",
  !!benchmark?.querySelector('a[href="/samples/sample.pdf"][download="sample.pdf"]') &&
  !!benchmark?.querySelector("button[data-open-pdf]") &&
  /269,519 bytes/.test(benchmark?.textContent ?? "") &&
  /a94e42e891e2b8d2c6b92300a52d86df3738575e09beddd362f93ba262a2c9fa/.test(benchmark?.textContent ?? ""));
check("benchmark links all README-referenced external test paths",
  [
    "https://www.pdf2go.com/pdf-to-text",
    "https://www.adobe.com/acrobat/online/pdf-to-word.html",
    "https://support.google.com/drive/answer/176692?hl=en&co=GENIE.Platform%3DDesktop",
    "https://www.freeconvert.com/pdf-to-text",
  ].every((href) => benchmarkHrefs.includes(href)));
check("benchmark exposes the complete cleanup-off and comparison evidence",
  [
    "/samples/sample.praser.txt",
    "/samples/sample-freeconvert.txt",
    "/samples/sample-pdf2go.txt",
    "/samples/sample-pdf24.txt",
    "/samples/sample-pdftotext.txt",
  ].every((href) => benchmarkHrefs.includes(href)) &&
  /cleanup ပိတ်ထားပြီး/.test(benchmark?.textContent ?? "") &&
  /not a universal accuracy score/.test(benchmark?.textContent ?? ""));

/* ---------------- 4. PDF overlay: saved fixtures, never a submission ---------------- */

window.dispatchEvent(new window.CustomEvent("akkhara:open-pdf"));
// the demo's cosmetic delay (FAKE_WORK_MS) has to elapse before it resolves
await wait(1400);

check("PDF overlay opens as a dialog", !!shell());
check("PDF dialog is the ui shell box (max-w-6xl, rounded-3xl, body max-h-[min(66vh,720px)])",
  /max-w-6xl/.test(shellBox()?.className ?? "") &&
  /rounded-3xl/.test(shellBox()?.className ?? "") &&
  /max-h-\[min\(66vh,720px\)\]/.test(shellBody()?.className ?? ""));
check("PDF shell chrome identifies the exact fixture and the saved-fixture result",
  !!shell()?.querySelector("i.bg-\\[\\#c63b26\\]") &&
  /sample\.pdf · 100 pages · 269,519 bytes/.test(shell().textContent) &&
  /Demo result · saved fixtures/.test(shell().textContent) &&
  !!shell().querySelector('button[aria-label="Close"]'));

/* The demo must never reach the backend. Both panes are fixtures chosen up
   front, so a submission could only recompute a known answer — at the cost of
   a real job and one of the visitor's three daily slots. */
check("the demo NEVER posts to /api/submit", submitRequests.length === 0,
  submitRequests.length ? `${submitRequests.length} request(s) were made` : "no requests");
check("the demo reads only the two saved .txt outputs",
  fetchedUrls.includes("/samples/sample-freeconvert.txt") &&
  fetchedUrls.includes("/samples/sample.praser.txt"));
check("the demo never even fetches the PDF bytes (it has nothing to upload them to)",
  !fetchedUrls.includes("/samples/sample.pdf"));
{
  const src = readFileSync("src/components/UploadToolSection.tsx", "utf8");
  check("a double submit is impossible: the gate is a ref set synchronously, not state",
    /if \(!plan \|\| sendingRef\.current\) return;\s*\n\s*sendingRef\.current = true;/.test(src));
  check("the submit row appears only once the browser has finished reading the file",
    /phase === "ready" && gate !== "confirm-zawgyi" && gate !== "confirm-ocr"/.test(src));
  check("the submit row names the file next to the button",
    /<FileText[\s\S]{0,200}\{plan\.name\}/.test(src));
  check("clicking swaps the whole row for a loading state, leaving no button to press twice",
    /\{phase === "sending" && \([\s\S]{0,400}animate-spin[\s\S]{0,200}Submitting \{plan\.name\}/.test(src));
  check("no disabled-state juggling is left on the prompts",
    !/disabled=\{phase === "sending"\}/.test(src));
  check("the panel polls only while the job is non-terminal",
    /!isTerminal\(accepted\.state\)/.test(src));
  check("resetting the panel aborts any poll in flight",
    /abortRef\.current\.aborted = true;/.test(src));
  check("the download link is rendered from the server's downloadUrl, not guessed",
    /href=\{delivery\.downloadUrl\}/.test(src));
}
check("no source file in the demo path mentions /api/submit",
  !readFileSync("src/components/PdfDemoOverlay.tsx", "utf8").includes("/api/submit"));

const pdfText = shell()?.textContent ?? "";
check("the panel compares real saved outputs instead of simulated presets",
  /FreeConvert benchmark output/.test(pdfText) &&
  /AKKHARA cleanup-off output/.test(pdfText) &&
  /Buddha's Teachings/.test(pdfText) &&
  /ဘုရားရှင်၏ တရားတော်/.test(pdfText) &&
  /served \.txt file · not submitted/.test(pdfText) &&
  !/Illustrative text samples|Historical Archive|Replay preview/.test(pdfText));
check("the demo metadata is built and shown, labelled as never sent",
  /Demo job metadata/.test(pdfText) && /never sent/.test(pdfText) &&
  /"source": "converter"/.test(pdfText) && /"uploadName": "sample\.pdf"/.test(pdfText));
check("the shown demo metadata has no processing route",
  !/"job":/.test(pdfText) && !/"method":/.test(pdfText) && !/"content":/.test(pdfText));
check("overlay provides the exact sample and both complete output downloads",
  !!shell()?.querySelector('a[href="/samples/sample.pdf"][download="sample.pdf"]') &&
  !!shell()?.querySelector('a[href="/samples/sample-freeconvert.txt"][download]') &&
  !!shell()?.querySelector('a[href="/samples/sample.praser.txt"][download]'));

doc.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
await wait(120);
check("Escape closes the PDF overlay through the shell", !shell());

check("body scroll lock released after close", doc.body.style.overflow !== "hidden", `overflow="${doc.body.style.overflow}"`);

/* ---------------- 5. grammar workspace: same shell, its own inner ---------------- */

window.dispatchEvent(new window.CustomEvent("akkhara:open-grammar"));
await wait(150);

check("Grammar workspace opens in the same ui shell",
  !!shell() && /max-w-6xl/.test(shellBox()?.className ?? "") &&
  /Burmese Spell & Grammar Review/.test(shell().textContent) &&
  /Frontend rule preview/.test(shell().textContent));
check("Grammar preview keeps editor, text loader, suggestions, tip and char count",
  /Text editor & sample suggestion preview/.test(shell().textContent) &&
  /Load plain text/.test(shell().textContent) &&
  /Sample suggestions \(/.test(shell().textContent) &&
  /သတိပြုရန်:/.test(shell().textContent) &&
  /Characters/.test(shell().textContent));

const fixAll = [...shell().querySelectorAll("button")].find((b) => /Fix All Issues/.test(b.textContent));
fixAll?.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
await wait(150);
check("Grammar inner actions still wired (Fix All clears the list, toast appears)",
  !!fixAll &&
  /No sample suggestions remaining/.test(shell().textContent) &&
  /All Burmese spelling and grammar issues resolved!/.test(doc.body.textContent) &&
  !!doc.querySelector(".fixed.bottom-6.right-6.z-50"));

check("hero stays mounted behind the grammar shell (no longer swaps the slider out)",
  !!doc.querySelector("#heroSlider") && !!doc.querySelector("#hero"));
check("only one shell can be open at a time", doc.querySelectorAll('[role="dialog"]').length === 1,
  `dialogs=${doc.querySelectorAll('[role="dialog"]').length}`);

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) {
  console.log("failed:");
  for (const f of failed) console.log(` - ${f.name}`);
}
process.exit(failed.length ? 1 : 0);
