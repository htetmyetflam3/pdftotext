# Changelog — this branch (`Frontend`)

This file is per-branch: it records what the frontend on this branch does, and
other branches carry their own. Entries are newest first.

---

## [2.8.4] - 2026-09-25
### Changed
- **Hero slider box sizing now comes from the `ui` project** (its Hero), at every
  width: container `max-w-7xl` + `px-4` / `sm:px-6` instead of the 1440px frame,
  section `pt-20` / `lg:pt-24` with nothing after it, slide `gap-8` →
  `lg:gap-12`, `lg:grid-cols-[1.02fr_1.08fr]` instead of `7fr 5fr`, slide
  `pt-6 pb-6` → `lg:pt-10 lg:pb-12`, the 540px slide `min-height` dropped, and the
  in-flow pager row on `mt-2 pb-10`. The slides' inner elements (fake window,
  hero PNGs, callouts, copy, arrows, pager) are unchanged — the `ui` look is not
  brought over, only the box metrics.
- **Both tool overlays now render inside the `ui` overlay shell.** New
  `frontend-react/src/components/ToolShell.tsx` is `ui/src/components/ToolShell.tsx`
  with its colour tokens remapped onto this project's paper / cinnabar / gold
  palette (window chrome with traffic dots + filename + status pill, gradient icon
  tile header with eyebrow / title / subtitle / badges, scrollable body
  `max-h-[min(66vh,720px)]`, optional footer, Escape + backdrop close, body scroll
  lock). `PdfDemoOverlay` and the grammar workspace keep their own inner elements
  and behaviour (presets, confetti, simulated parse, two result frames, bulk CTA;
  editor, dropzone, issues list, toast) and only lose their own header bars.
- `App.tsx`: the grammar workspace is a modal now, not a page that replaces the
  hero, so the hero stays mounted and opening one tool closes the other.

### Added
- `frontend-react/verify-overlay-and-slider.mjs` — checks the slider's shipped CSS
  numbers and drives both overlays in a real DOM (jsdom) to confirm the `ui` shell
  and this project's inner elements are both in place.
- `.ak-fade` / `.ak-zoom` / `.ak-scroll` helpers in `frontend-react/src/index.css`
  (they exist in `ui`; this project did not have them).

---

## [2.8.3] - 2026-09-24
### Changed
- Landing is the 3-1 page (nav, how-it-works, compare, benefits, voices, FAQ, CTA, footer). 3-1’s two hero sessions are replaced by our two-column slider. The free-tool Zawgyi→Unicode paste session is removed. First-hero **နမူနာ စမ်းကြည့်ရန်** still opens the current PDF overlay.
- That modified 3-1 React app now lives in `myanmar-pdf-converter-landing-page/` (replacement for the old BurmaPDF layout).

---

## [2.8.2] - 2026-09-23
### Changed
- React landing: split `PageSections.tsx` / hero sessions into separate files
  under `src/components/page-sections/` (convert, grammar, comparison, FAQ,
  CTA, footer) so each session is a manageable part. Visual layout is unchanged
  (desktop slider, mobile stack, grammar workspace, PDF overlay).

---

## [2.8.1] - 2026-09-23
### Changed
- Landing chrome uses the original Lingux cream / teal / coral palette again
  (the uploaded React page's white-and-blue was dropped). Hero PNGs are
  unchanged — image colour is left for a later image edit.

## [2.8.0] - 2026-09-23
### Added
- **Landing layout in HTML** (no React). `frontend/index.html` now mirrors the
  uploaded `myanmar-pdf-converter-landing-page` chrome: top banner, sticky nav,
  desktop two-frame hero slider, mobile stacked heroes, comparison table, FAQ,
  CTA and footer — all static HTML + SCSS (`frontend/scss/_landing.scss`).
- **Grammar slide text board** is an HTML overlay with correct Burmese
  (`ယနေ့ခေတ်` / `အချက်အလက်` …). The hero PNGs are copied as-is into
  `frontend/public/images/` and are not edited.
- **PDF demo overlay** (`#pdfDemoOverlay`): Test Sample PDF opens a two-frame
  overlay (generic pdf.js reading vs Lingux result) using the existing sample
  files and `POST /api/submit` convert path.
- **Grammar workspace** (`#grammarWorkspace`): Upload Document hides the slider
  and shows the existing check editor (textarea, dropzone, Check).

### Changed
- Uploading still shows the **current character animation** (`js/character.js`
  + `#processingOverlay` / `#convertProcessing`). The React spinner/confetti
  mock is not used.
- The two stacked Paperflow heroes are replaced by the slider/workspace shell.
  All previous IDs (`textInput`, `convertSection`, `demoStage`, …) are kept so
  `js/main.js` submit/poll/sample-parse behaviour is unchanged.

## [2.7.0] - 2026-09-22
### Added
- **Hero 1 · "why it matters" demo** (`#demoSection`, the conversion hero only —
  Hero 2 is untouched). It explains why a generic PDF reader breaks on Burmese
  text — Zawgyi is the same code points shaped as the wrong letters, and even a
  proper Unicode book can defeat a generic reader when its font is encoded for
  the printer — and then shows it on two real samples.
- **Two clickable sample buttons**: the first 5 pages of the Myanmar Grammar
  book (Unicode text) and of a Burmese novel (Zawgyi text), sliced from the two
  fixture PDFs on `working` (445 / 764 pages). Clicking one loads the sliced
  PDF through the **real upload path** — the same in-browser sample-parsing gate
  a dropped file gets, pdf.js doing the parsing for real — and the file lands
  in the conversion card.
- **The comparison stage**: the sample's pages drawn by pdf.js, side by side
  with two readings of the same pages — the plain text pdf.js itself reads out
  (real, in the browser) and the text after the praser. The praser runs on the
  server, so that pane shows its **pre-generated result** for the sample behind
  a loading pass; nothing is parsed with the praser in the browser.
- **Download buttons** for both sides of the sample: the sample file (before)
  and the praser's result (after).
- `frontend/public/samples/` — the four demo artifacts (two sliced PDFs at
  ~30–42 KB and the two praser `.txt` results), copied to `dist/` on every
  build. The results were produced by the JS praser on `working`
  (`Praser/JS/module/prase.mjs`, `--cleanup yes --normalize normalize`).

### Changed
- Hero 1 title: "Send it out changed." → "Send it in. / Get it back."
- `frontend/vite.config.js`: the source root now points at `frontend/` (it
  pointed at `Spa/`, which this tree does not have, so the build could not
  run); the dev server now allows the preview/tunnel hosts Vite 6 otherwise
  blocks.
- Root `package.json` scripts pass `--config frontend/vite.config.js`
  (Vite does not discover a config nested in `frontend/`), and `clean` targets
  the `dist/` the build actually writes.
- `PROJECTSTRUCTURE.md`: the `Spa/` lines were drift — the tree is `frontend/`
  — and are cleaned, with the demo described.

## [2.6.0] - 2026-09-21
### Added (a second hero: file conversion)
- `Spa/index.html` now holds two heroes instead of one. The new one is
  **Hero 1 · file conversion**: an upload area that accepts a file and nothing
  else — no textarea, no typing — followed by an **output format** dropdown
  (`.txt` / `.docx` / `.pdf`) and a Convert button. The original hero is
  **Hero 2 · spelling & grammar check**, unchanged in shape: its textarea still
  takes typed text *or* a dropped file.
- A successful upload in Hero 1 sets the dropdown to the **input file's own
  extension** (a `report.pdf` lands on PDF) and raises a **toast anchored over
  the dropdown** — "Select ur output here" — because that default is a guess,
  not a decision. Changing the dropdown, or letting 7 s pass, dismisses it.
- Before either hero accepts a document, the browser **sample-parses the first
  pages** (pdf.js for PDF, mammoth for DOCX, a head slice for TXT — mammoth and
  TXT have no page boundary, so they get the first 64 KB of extracted text) and
  asks one question: does this file contain selectable text?
  - No → the file is **rejected before it is uploaded**, with the reason:
    *"doesn't contain selectable text — it looks scanned. Run it through an OCR
    tool first."* Nothing is sent to the server.
  - Yes → the user is told what happens next: *"contains text — we will handle
    the Zawgyi / Unicode conversion for you. However, pages with images will be
    blank in the output."* Either encoding is accepted on input.
- `Spa/js/character.js` is new: it injects `Spa/img/character.svg` into the
  processing stage and animates it with **anime.js**. Both heroes get the
  artwork; the SVG arrives as its own build chunk (`character-*.js`, 151.77 kB)
  so it does not sit in the main bundle.

### Changed
- **One endpoint, metadata carries the job.** Both heroes POST to the existing
  `POST /api/submit`. There is no second route; the difference between them
  travels as metadata:
  `{ job: "convert", outputFormat, inputFormat, originalName }` for conversion
  and `{ job: "check", checkMode, source, inputFormat, originalName }` for the
  check. FormData requests carry `metadata` as a JSON string alongside `file`,
  `originalName` and any client-extracted `text`; JSON requests carry it as a
  field next to `text`.
- **Check now asks before it sends.** Pressing Check opens a choice — *Syllable
  only* or *Spelling checking* — and the answer is submitted as
  `metadata.checkMode`. Cancelling (the Cancel button, the backdrop, or Escape)
  closes it and sends nothing.
- **The inline character SVG is gone from `Spa/index.html`** (151,783 bytes of
  the 166,712-byte file). `js/character.js` loads `Spa/img/character.svg`
  instead — same artwork, one copy, now shared by both heroes. The animation
  moved from CSS to JS with it, so `_animations.scss` no longer targets
  `#head` / `#left-finger` / `#righthand` / `#shirt-neck`; the head-look,
  hand-write, right-hand float and body-breathe cycle is driven by anime.js at
  the same 4.8 s period, and it **pauses when the overlay is hidden** instead of
  running behind `display: none`.
- **Drag & drop is scoped to each card.** It used to be bound to `document`, so a
  drop anywhere loaded the check hero; now the conversion card and the check
  card each own their drop zone. The page-level listener remains purely to stop
  the browser opening a dropped file.
- **`.doc` is no longer advertised or accepted.** Input and output are
  `.txt` / `.docx` / `.pdf` — the praser's actual scope (PDF|DOCX in → .txt|.docx|.pdf
  out, no `.doc` reader or writer), and `extractText()` always returned `null`
  for `.doc` anyway, so the UI was promising something the client could not do.
  The DOC format card is gone ("Four good directions" → "Three"), and both
  `accept` attributes dropped `.doc`. A file cannot be sample-parsed without a
  reader, so keeping `.doc` would have been a hole in the scanned-document gate.
- `Spa/scss/main.scss` gained the Hero 1 styles (`.pf-convert-output`,
  `.pf-convert-field`, `.pf-select`, `.pf-hint-toast`, the check-mode dialog) and
  one shared rule for the two progress bars (`#progress-container` and
  `.pf-progress-inline`, both now sized inside the overlay; the legacy
  `display: none` toggle on `#progress-container` is gone because the overlay
  hides it).
- **The built JS stays hand-editable.** `Spa/vite.config.js` turns the
  minifier off (`minify: false`, `target: "esnext"`) and drops the hash from
  JS filenames, so `index.html` always loads `/assets/js/main.js` and the file
  can be read and edited by hand between builds. Rollup keeps library code in
  `assets/js/vendor.js` (bootstrap + animejs) while all first-party code stays
  in `main.js` — original comments, names and formatting intact — and
  `assets/js/character.js` is still the lazy raw-SVG chunk.
  `minifyInternalExports: false` keeps the cross-chunk import readable
  (`import { animate, remove } from './vendor.js'`). CSS keeps its hash.
- **The SPA builds from this checkout alone.** `Spa/vite.config.js` no longer
  imports the site path map (`Backend/file/paths.js`, which lives in the
  Backend repo and is absent here) — the frontend checkout itself is the root:
  source `Spa/`, output `dist/` at the repo root, emptied on every build since
  it holds nothing but build output. `Spa/package.json` scripts dropped the
  monorepo `cd ../../.. && Site/Build/...` dance and run this package's own
  vite — `npm run dev` / `build` / `build:watch` / `preview` / `clean` all
  work from `Spa/` after a plain `npm install`.
