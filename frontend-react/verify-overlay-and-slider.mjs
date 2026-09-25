/**
 * Verification for this session's two changes:
 *   1. the hero slider box now carries the `ui` project's Hero sizing,
 *   2. both tool overlays render inside the `ui` overlay shell (ToolShell)
 *      while keeping frontend-react's own inner elements.
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
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
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
const shippedHtml = readFileSync("dist/index.html", "utf8");
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
check("shipped CSS: slide lg:grid-cols-[1.02fr_1.08fr]",
  /grid-template-columns:1fr/.test(slideBase) && /grid-template-columns:1\.02fr 1\.08fr/.test(slideLg), slideLg);
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

window.eval(`${appJs}\n//# sourceURL=app.js`);

const wait = (ms) => new Promise((r) => window.setTimeout(r, ms));
await wait(700);

const shell = () => doc.querySelector('[role="dialog"]');
const shellBox = () => shell()?.firstElementChild ?? null;
const shellBody = () => shellBox()?.children[2] ?? null;

check("app mounts", !!doc.querySelector("#heroSlider"), `root children=${doc.getElementById("root").children.length}`);

/* ---------------- 3. slider keeps its own inner elements ---------------- */

check("slider still 2 slides on one track", doc.querySelectorAll(".lp-track > .lp-slide").length === 2);
check("slider inner art/callouts/pager untouched",
  !!doc.querySelector("img[src*='hero-converter.png']") &&
  !!doc.querySelector("img[src*='hero-grammar.png']") &&
  doc.querySelectorAll(".lp-slide .lp-callout").length === 2 &&
  doc.querySelectorAll(".lp-pager button").length === 2 &&
  doc.querySelectorAll(".lp-arrow").length === 2);

/* ---------------- 4. PDF overlay: ui shell around frontend-react inner ---------------- */

window.dispatchEvent(new window.CustomEvent("akkhara:open-pdf"));
await wait(150);

check("PDF overlay opens as a dialog", !!shell());
check("PDF dialog is the ui shell box (max-w-6xl, rounded-3xl, body max-h-[min(66vh,720px)])",
  /max-w-6xl/.test(shellBox()?.className ?? "") &&
  /rounded-3xl/.test(shellBox()?.className ?? "") &&
  /max-h-\[min\(66vh,720px\)\]/.test(shellBody()?.className ?? ""));
check("PDF shell chrome: traffic dots + filename + status + close button",
  !!shell()?.querySelector("i.bg-\\[\\#c63b26\\]") &&
  /Old_Contract_Agreement_2014\.pdf/.test(shell().textContent) &&
  !!shell().querySelector('button[aria-label="Close"]'));
check("PDF inner elements kept: presets, upload button, leak note",
  /Preset Sample PDFs:/.test(shell().textContent) &&
  /Upload Your PDF/.test(shell().textContent) &&
  /Zero Data Leakage/.test(shell().textContent));

await wait(2000); // simulated parse + confetti
const pdfText = shell()?.textContent ?? "";
check("PDF inner results kept: broken-output frame, clean-unicode frame, re-parse, bulk CTA",
  /Standard PDF Converter \(Broken Output\)/.test(pdfText) &&
  /Our Engine Result \(Clean Unicode\)/.test(pdfText) &&
  /Re-parse/.test(pdfText) &&
  /Ready to convert your own bulk documents\?/.test(pdfText) &&
  /ျမန္မာႏိုင္ငံ/.test(pdfText));

const firstPreset = [...shell().querySelectorAll("button")].find((b) => /Historical Archive/.test(b.textContent));
firstPreset?.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
await wait(2000);
check("preset switch still re-runs the parse and swaps the sample",
  /Historical_Monograph_Archive\.pdf/.test(shell()?.textContent ?? ""));

doc.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
await wait(120);
check("Escape closes the PDF overlay through the shell", !shell());

check("body scroll lock released after close", doc.body.style.overflow !== "hidden", `overflow="${doc.body.style.overflow}"`);

/* ---------------- 5. grammar workspace: same shell, its own inner ---------------- */

window.dispatchEvent(new window.CustomEvent("akkhara:open-grammar"));
await wait(150);

check("Grammar workspace opens in the same ui shell",
  !!shell() && /max-w-6xl/.test(shellBox()?.className ?? "") &&
  /Burmese Spell & Grammar AI Workspace/.test(shell().textContent) &&
  /Myanmar Orthography Standard/.test(shell().textContent));
check("Grammar inner elements kept: editor, dropzone bar, issues panel, tip, char count",
  /Document Editor & Live Drag-and-Drop Dropzone/.test(shell().textContent) &&
  /Upload Word \/ Text \/ PDF/.test(shell().textContent) &&
  /Detected Issues \(/.test(shell().textContent) &&
  /သတိပြုရန်:/.test(shell().textContent) &&
  /Characters/.test(shell().textContent));

const fixAll = [...shell().querySelectorAll("button")].find((b) => /Fix All Issues/.test(b.textContent));
fixAll?.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
await wait(150);
check("Grammar inner actions still wired (Fix All clears the list, toast appears)",
  !!fixAll &&
  /No Errors Found!/.test(shell().textContent) &&
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
