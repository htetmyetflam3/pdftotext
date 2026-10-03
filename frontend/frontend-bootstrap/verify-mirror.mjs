/**
 * Verification for the Bootstrap/HTML mirror of `frontend-react/`.
 *
 * There is no browser in this sandbox, so this runs the shipped page in a
 * real DOM (jsdom) instead:
 *   - the CSS numbers are read from the *shipped* build (dist/assets/*.css),
 *     so they are the ones that ship;
 *   - the page's own scripts are bundled to a classic-script IIFE with this
 *     project's Vite (jsdom cannot execute `<script type="module">`) and run
 *     against dist/index.html, so the checks exercise the real markup, real
 *     events and real wiring.
 * jsdom does no layout, so pixels are NOT verified.
 *
 * Prerequisites:
 *   npm install                                   # repo root (vite, bootstrap, sass)
 *   npm run build                                 # writes dist/
 *   mkdir -p /tmp/verify && cd /tmp/verify && npm i jsdom
 * Run:
 *   NODE_PATH=/tmp/verify/node_modules node frontend-bootstrap/verify-mirror.mjs
 */
import { readFileSync, readdirSync, mkdirSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { build } from "vite";

const require = createRequire(import.meta.url);
const { JSDOM, VirtualConsole } = require("jsdom");

const here = path.dirname(new URL(import.meta.url).pathname);
const root = path.resolve(here, "..");
const OUT = "/tmp/fb-verify";

const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
};

/* ---------------- the shipped build ---------------- */

const distDir = path.join(root, "dist");
// These checks read the SHIPPED build, so a missing build is a setup problem,
// not a failing assertion. Say so the way index.js does, instead of dying on a
// raw ENOENT stack trace from readFileSync.
for (const required of [path.join(distDir, "index.html"), path.join(distDir, "react", "index.html")]) {
  if (!existsSync(required)) {
    console.error(
      `\nCannot verify the frontend: ${required} does not exist.\n` +
        `Run "npm run build" before "npm test".\n`,
    );
    process.exit(1);
  }
}
const html = readFileSync(path.join(distDir, "index.html"), "utf8");
const cssFile = readdirSync(path.join(distDir, "assets")).find((f) => f.endsWith(".css"));
const css = readFileSync(path.join(distDir, "assets", cssFile), "utf8");

check("dist/index.html carries the hero artwork inline", (html.match(/viewBox="0 0 1200 820"/g) || []).length === 2);
const mediaWidths = [...new Set([...css.matchAll(/@media\s*\(min-width:\s*(\d+)px\)/g)].map((m) => m[1]))];
check(
  "responsive rules only switch at the React app's breakpoints",
  ["640", "768", "1024", "1280", "1536"].every((w) => mediaWidths.includes(w)) &&
    mediaWidths.every((w) => ["640", "768", "1024", "1280", "1536", "1200"].includes(w)),
  `widths: ${mediaWidths.join(", ")} (1200 is Bootstrap's unused .fs-* RFS step)`
);
check("Tailwind preflight is the element baseline", css.includes("::file-selector-button"));
check("index.css is mirrored verbatim (btn / micro / fx-lens)", css.includes("ak-lens") && css.includes(".micro"));
check("hero slider chrome is present (.lp-track)", css.includes(".lp-track"));
check("tool overlay shell body is the ui box", css.includes("min(66vh,720px)") || css.includes("min(66vh, 720px)"));

/* ---------------- run the page's scripts in jsdom ---------------- */

mkdirSync(OUT, { recursive: true });
await build({
  configFile: false,
  root: here,
  logLevel: "error",
  build: {
    outDir: `${OUT}/dist`,
    emptyOutDir: true,
    minify: false,
    lib: { entry: path.join(here, "js/main.js"), name: "AkkharaMirror", formats: ["iife"], fileName: () => "app.js" },
  },
});
const appJs = readFileSync(`${OUT}/dist/app.js`, "utf8");

const virtualConsole = new VirtualConsole();
const pageErrors = [];
virtualConsole.on("jsdomError", (e) => pageErrors.push(e.message));

const dom = new JSDOM(html.replace(/<script type="module"[^>]*><\/script>/g, ""), {
  runScripts: "dangerously",
  pretendToBeVisual: true,
  url: "http://localhost/",
  virtualConsole,
});
const { window } = dom;
window.IntersectionObserver = class {
  observe(el) {
    el.classList.add("is-in");
  }
  unobserve() {}
  disconnect() {}
};
window.scrollTo = () => {};
window.Element.prototype.scrollIntoView = () => {};
/* the .txt files come off disk here, standing in for the server; /api/submit
   is refused, which is what happens with no backend in front of the page */
const genericServed = readFileSync(path.join(here, "public/samples/sample-freeconvert.txt"), "utf8");
const parsedServed = readFileSync(path.join(here, "public/samples/sample.praser.txt"), "utf8");
const fetchCalls = [];
window.fetch = async (url) => {
  const href = String(url);
  fetchCalls.push(href);
  if (href.includes("sample-freeconvert.txt")) return { ok: true, text: async () => genericServed };
  if (href.includes("sample.praser.txt")) return { ok: true, text: async () => parsedServed };
  throw new Error("no backend in front of this page");
};
window.AbortSignal = { timeout: () => undefined };
/* jsdom ships no Response/stream APIs. The shipped build loads pdf.js and the
   inflate path lazily, but this harness bundles to an IIFE, which cannot
   code-split, so their module bodies are evaluated at load. Stub what they
   touch rather than let a jsdom gap read as a page error. */
window.Response = class {
  constructor(body) { this.body = body; }
  async arrayBuffer() { return new ArrayBuffer(0); }
  async text() { return ""; }
  async json() { return {}; }
};
Object.defineProperty(window.navigator, "clipboard", { value: { writeText: async () => {} }, configurable: true });

const script = window.document.createElement("script");
script.textContent = appJs;
window.document.body.appendChild(script);
await new Promise((r) => setTimeout(r, 50));

const $ = (sel) => window.document.querySelector(sel);
const $$ = (sel) => Array.from(window.document.querySelectorAll(sel));

check("page scripts run without errors", pageErrors.length === 0, pageErrors.join(" | "));
check("marquee renders both tag passes", $$("#proofMarquee .ak-marquee-item").length === 18);
check("comparison table has the six criteria", $$("#cmpRows tr").length === 6);
check("comparison cards mirror the table", $$("#cmpCards .ak-cmp-card").length === 6);
check("benefits grid has six cells", $$("#benefitsGrid .ak-ben-cell").length === 6);
check("faq has six items, first open", $$(".ak-faq-item").length === 6 && $(".ak-faq-item").classList.contains("is-open"));

/* slider */
$$(".lp-pager-bar button")[1].click();
check("pager moves the track to slide 2", $("#heroTrack").style.transform === "translateX(-100%)");
$(".lp-arrow-prev").click();
check("arrow returns to slide 1", $("#heroTrack").style.transform === "translateX(-0%)");

/* faq toggle */
const secondQ = $$(".ak-faq-q")[1];
secondQ.click();
check(
  "opening one faq closes the others",
  $$(".ak-faq-item.is-open").length === 1 && $$(".ak-faq-item")[1].classList.contains("is-open")
);

/* overlays */
$("[data-open-pdf]").click();
check("hero button opens the benchmark overlay", $("#pdfOverlay").hidden === false);
check("the page behind is locked", window.document.body.style.overflow === "hidden");
check("the demo starts on the loading state", $("#pdfLoading").hidden === false && $("#pdfResult").hidden === true);
check("the two reading panes are back", $$(".pd-pane .pd-pre").length === 2);
check("no copy buttons anywhere in the demo", $("[data-copy]") === null && $(".pd-copy") === null);
check("each pane names its file and offers the download", $$(".pd-pane-file").length === 2 && $$(".pd-pane-foot a[download]").length === 2);
// the loading block is display:flex, so it must be the shipped [hidden] rule that hides it
check("[hidden] wins over the panel's own display rule", /\[hidden\][^{]*\{display:none!important\}/.test(css));
await new Promise((r) => setTimeout(r, 1400));
check("the pane text is the served .txt, not a browser-cut excerpt", genericServed !== "" && $("#pdfGeneric").textContent === genericServed);
check("the parser pane holds the served result file", $("#pdfParsed").textContent === parsedServed);
check("it asked the server for both .txt files", fetchCalls.some((u) => u.includes("sample-freeconvert.txt")) && fetchCalls.some((u) => u.includes("sample.praser.txt")));
/* The demo must never reach the backend. Both panes are fixtures chosen up
   front, so a submission could only recompute a known answer — at the cost of
   a real job and one of the visitor's three daily slots. */
check("the demo NEVER posts to /api/submit", !fetchCalls.some((u) => u.includes("/api/submit")),
  fetchCalls.filter((u) => u.includes("/api/submit")).join(" | ") || "no calls");
check("the demo never even fetches the PDF bytes (it has nothing to upload them to)",
  !fetchCalls.some((u) => u.includes("sample.pdf")));
check("no /api/submit anywhere in the demo source",
  !readFileSync(path.join(here, "js/pdf-demo.js"), "utf8").includes("/api/submit"));
check("the pane tag says the result was served, not submitted",
  /not submitted/.test($("#pdfSource").textContent));
check("the demo metadata is built and shown, labelled as never sent",
  /never sent/.test($(".pd-meta")?.textContent ?? "") &&
  /"source": "converter"/.test($("#pdfMetaJson").textContent) &&
  /"uploadName": "sample\.pdf"/.test($("#pdfMetaJson").textContent));
check("the shown demo metadata has no processing route",
  !/"job":|"method":|"content":/.test($("#pdfMetaJson").textContent));
check("the loading panel is put away", $("#pdfLoading").hidden === true && $("#pdfResult").hidden === false);
const footerLinks = $$(".pd-repro-actions a");
check(
  "every sample download escapes the preview iframe sandbox",
  $$('a[href^="/samples/"][download]').every((a) => a.getAttribute("target") === "_blank")
);
check(
  "the footer buttons are the small pills, not the big ones",
  /\.pd-repro-btn\{[^}]*font-size:11px/.test(css) && /\.pd-repro-btn\{[^}]*padding:\.375rem \.75rem/.test(css)
);
check(
  "footer is download sample + a link into the benchmark section",
  footerLinks.length === 2 &&
    footerLinks[0].hasAttribute("download") &&
    footerLinks[1].getAttribute("href") === "#benchmark" &&
    $("#pdfRerun") === null
);
footerLinks[1].click();
check("that link closes the overlay on its way to #benchmark", $("#pdfOverlay").hidden === true);
$("#pdfOverlay").hidden = false;
await new Promise((r) => setTimeout(r, 1400));
check("showing the overlay by itself still runs the demo", $("#pdfResult").hidden === false && $("#pdfLoading").hidden === true);
check("a stuck run is impossible: a watchdog always resolves the panel", /WATCHDOG_MS/.test(readFileSync(path.join(here, "js/pdf-demo.js"), "utf8")));
$("[data-open-pdf]").click();
$("#pdfOverlay .ts-x").click();
check("close button closes the overlay", $("#pdfOverlay").hidden === true);

/* grammar tool */
$("[data-open-grammar-scroll]").click();
await new Promise((r) => setTimeout(r, 500));
check("cta opens the grammar overlay", $("#grammarOverlay").hidden === false);
check("grammar editor is seeded with the sample document", $("#grEditor").value.startsWith("ယနေ႕ခေတ္"));
check("six sample suggestions are listed", $$("#grIssues .gr-issue").length === 6);
const firstFix = $("#grIssues [data-fix]");
firstFix.click();
check("apply fix rewrites the text and drops the issue", $$("#grIssues .gr-issue").length === 5 && $("#grEditor").value.includes("တိုးတက်လာမှု"));
$("#grFixAll").click();
check("fix all empties the list", $$("#grIssues .gr-issue").length === 0 && $(".gr-empty") !== null);
$("#grLoadSample").click();
check("load sample restores the six suggestions", $$("#grIssues .gr-issue").length === 6);

/* upload gate overlay */
$("[data-open-upload-scroll]").click();
await new Promise((r) => setTimeout(r, 600));
check("the nav CTA opens the upload overlay", $("#uploadOverlay").hidden === false);
check("it starts on the dropzone, no result yet", $("#upDrop").hidden === false && $("#upResult").hidden === true);
check("the Extract / OCR dropdown is hidden until a file asks for it", $("#upChooser").hidden === true);
check(
  "the dropdown offers exactly Default and Manual",
  $$("#uploadEngine option").map((o) => o.value).join(",") === "default,manual"
);
check(
  "Extract promises the images come back blank (that is method \"null\")",
  /ignore image areas/i.test($$("#uploadEngine option")[0].textContent)
);
/* the analysis door and its two yes/no prompts — never a dropdown on that path */
check("the grammar tool has a door into the analysis flow", $("[data-open-analysis]") !== null);
check(
  "both analysis prompts exist and start hidden",
  $("#upPromptZawgyi").hidden === true && $("#upPromptOcr").hidden === true
);
check(
  "each prompt offers exactly yes and no",
  $$("#upPromptZawgyi button").length === 2 && $$("#upPromptOcr button").length === 2
);
check(
  "the analysis prompts carry no dropdown",
  $("#upPromptZawgyi select") === null && $("#upPromptOcr select") === null
);
check("the daily-allowance banner exists and starts hidden", $("#upQuota").hidden === true);
check("the submit row carries a file chip and reads Process",
  $("#upFileChip") !== null && $("#upSubmitLabel").textContent.trim() === "Process");
check("the loading row exists and starts hidden", $("#upSending").hidden === true);
check("the delivery row and download link exist and start hidden",
  $("#upDelivery").hidden === true && $("#upDownload").hidden === true);
check("the download link opens outside the preview iframe sandbox",
  $("#upDownload").getAttribute("target") === "_blank");
{
  const src = readFileSync(path.join(here, "js/upload-tool.js"), "utf8");
  check("the panel polls only while the job is non-terminal",
    /!isTerminal\(accepted\.state\)/.test(src));
  check("resetting the panel aborts any poll in flight",
    /abortSignal\.aborted = true;/.test(src));
}
/* A double-click on a prompt's Yes must not POST twice: send() is async, so
   the in-flight flag has to be set synchronously, not left to the re-render. */
{
  const src = readFileSync(path.join(here, "js/upload-tool.js"), "utf8");
  check("a double submit is impossible: send() is guarded by a synchronous in-flight flag",
    /if \(!plan \|\| sending\) return;\s*\n\s*sending = true;/.test(src));
  check("clicking swaps the controls for a loading row",
    /actions\.hidden = true;[\s\S]{0,200}sendingRow\.hidden = false;/.test(src));
  check("no disabled-state juggling is left on the prompts",
    !src.includes('[data-up-confirm]").forEach((b) => { b.disabled'));
}
check("pdf and docx are the accepted types", /\.pdf/.test($("#upInput").accept) && /\.docx/.test($("#upInput").accept));
$("#uploadOverlay .ts-x").click();
check("the upload overlay closes", $("#uploadOverlay").hidden === true);

/* sticky bar */
window.scrollY = 900;
window.dispatchEvent(new window.Event("scroll"));
check("sticky bar appears past 760px of scroll", $("#stickyCta").classList.contains("is-show"));
$("#stickyClose").click();
check("sticky bar can be dismissed for good", $("#stickyCta").classList.contains("is-show") === false);

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
