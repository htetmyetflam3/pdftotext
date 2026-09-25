# Project Structure — linga (this branch)

just development environment for frontend

This file describes **this branch only**: two standalone frontend apps, no backend
code in this tree. Other branches carry their own version. If a line here describes
work that is not in this tree, it is drift — clean it and update it.

The tree holds two React + Vite + Tailwind apps. `frontend-react/` is the landing
this branch works on; `ui/` is the design source that `frontend-react/` is being
aligned with (its shell and box numbers are copied over by hand, not imported).

## `frontend-react/` — the landing

Built from `frontend-react/index.html` by Vite (`frontend-react/vite.config.ts`,
inline single-file output in `dist/`, dev server on `0.0.0.0` with host checking
off). Nothing here calls a backend: PDF sampling and both demo jobs run in the
browser.

| File | What it is |
| --- | --- |
| `src/App.tsx` | Page order, and the wiring for the two overlays: `akkhara:open-pdf` / `akkhara:open-grammar` events from the hero and page, opening one closes the other. |
| `src/components/Hero.tsx` | The hero slider (`#heroSlider`): one track, two slides, arrows, pager, both windows with their callouts. |
| `src/landing.css` | All landing chrome: nav, slider, sections, footer. The slider box metrics (container `max-w-7xl`, slide grid and padding) follow the `ui` project's Hero. |
| `src/index.css` | Palette, type, shared surfaces, and the overlay-shell helpers (`.ak-fade`, `.ak-zoom`, `.ak-scroll`). |
| `src/components/ToolShell.tsx` | The overlay shell taken from `ui/src/components/ToolShell.tsx`, tokens remapped to this palette. Both overlays render through it. |
| `src/components/PdfDemoOverlay.tsx` | PDF demo overlay: preset samples, simulated parse with confetti, the two result frames, bulk CTA. Its own header bar is gone — the shell supplies the chrome. |
| `src/components/GrammarToolSection.tsx` | Grammar workspace (same shell): editor + dropzone, detected issues, toasts. Opens as a modal instead of replacing the hero. |
| `src/components/Sections.tsx`, `Extras.tsx`, `Nav.tsx` | Landing sections, quick converter, sticky CTA, nav. |
| `src/lib/pdf.ts`, `src/lib/grammar.ts`, `src/data/` | In-browser PDF sampling / Zawgyi mapping / checks, plus the sample texts and presets. |
| `public/images/` | The hero artworks the slider shows (`hero-converter.png`, `hero-grammar.png`), not edited. |
| `verify-overlay-and-slider.mjs` | Verification script for the slider box numbers and both overlay shells (needs `jsdom` on `NODE_PATH`, see the file header). |

## `ui/` — the design source

A second app with the same stack, kept as the reference for chrome and metrics
(`src/components/ToolShell.tsx`, `src/components/Hero.tsx`,
`src/components/art/*`). It is not built by this branch's workflow and is not
imported by `frontend-react/`; when a box or shell is taken from it, the code is
ported and its `ink` / `canvas` / `line` / `brand-*` tokens are remapped onto the
paper / cinnabar / gold palette above.
