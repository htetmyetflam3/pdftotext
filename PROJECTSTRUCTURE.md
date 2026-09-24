# Project Structure — linga (this branch)
just development environment for frontend 

This file describes **this branch only**: the frontend SPA, standalone — no backend
code in this tree. Other branches carry their own version. If a line here describes
work that is not in this tree, it is drift — clean it and update it.

## The SPA (`frontend/`)
The page is built from `frontend/index.html` by Vite (`frontend/vite.config.js`, paths
anchored at the repo root: source `frontend/`, output `dist/`, emptied on every build;
the root `package.json` scripts pass the config explicitly). The JS is built unminified
and unhashed, split by source:
`assets/js/main.js` (first-party code), `assets/js/vendor.js` (bootstrap + animejs) and
`assets/js/character.js` (the lazy raw-SVG string); only CSS stays hashed under
`assets/CSS/`. The demo's sample files live in `frontend/public/samples/` and the hero
PNGs in `frontend/public/images/` — both are copied to the `dist/` root on every build.
It is a single HTML page (no React): a landing slider plus two workspaces, both
submitting to the one endpoint the site exposes, `POST /api/submit` — the job is told
apart by metadata, not by a second route.

| File | What it is |
| --- | --- |
| `frontend/index.html` | Landing chrome (banner, sticky nav, desktop slider, mobile stacked heroes), **grammar workspace** (`#grammarWorkspace`: the check editor), **PDF demo overlay** (`#pdfDemoOverlay`: sample two-frame + convert card), the check-mode choice dialog, comparison / FAQ / CTA / footer. |
| `frontend/js/main.js` | Slider, overlay and workspace chrome, plus both jobs. Sample-parses a document in the browser before accepting it (pdf.js / mammoth / TXT head slice) and turns away files with no selectable text; uploads; polls `/api/result` for the check job. Also drives the demo: a sample goes through the real upload gate and its two readings are compared in the overlay. |
| `frontend/js/character.js` | Injects `frontend/img/character.svg` into a processing stage and animates it with anime.js. Both jobs share it; the artwork is its own build chunk. Shown on upload in the overlay and in the grammar workspace. |
| `frontend/js/logger.js` | The twin browser/Node logger. |
| `frontend/img/character.svg` | The writing-character artwork, the single copy the page uses. |
| `frontend/scss/main.scss`, `frontend/scss/_animations.scss`, `frontend/scss/_landing.scss` | LAYER 1 then LAYER 2 (editor / overlay / character), then the landing chrome. Every `@keyframes` lives in `_animations.scss` except `lpPing`. |
| `frontend/public/samples/` | The demo's four artifacts: two sliced sample PDFs and the two praser `.txt` results. |
| `frontend/public/images/` | Hero PNGs (`hero-converter.png`, `hero-grammar.png`) copied as-is. The grammar document board is HTML, not painted into the PNG. |

The demo lives in `#pdfDemoOverlay`. Clicking Test Sample PDF (or a preset pill)
loads the sliced PDF through the same in-browser sample-parsing gate a dropped
file gets (pdf.js does the parsing, for real), the file lands in the conversion card,
and the overlay shows two readings of the same pages: the plain text pdf.js itself
reads out, and the text after the praser. The praser runs on the server, so that
pane shows its pre-generated result behind a loading pass — the **character
animation** (`#convertProcessing`) is what you see while that runs. Download
buttons cover both sides of the sample: the file (before) and the result (after).

Nothing in this branch runs the backend: the page posts to `POST /api/submit` /
`POST /api/result`, which live on the site branch, so the SPA is served and checked on
its own here.

