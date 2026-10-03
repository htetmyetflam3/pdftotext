# Third-party attributions

This is a verification and attribution document, not a claim that copied or upstream material belongs to Linga. It identifies what is upstream, what is runtime-provided, and what is project-owned so reviewers can check the correct license terms. The purpose of this pull request is pre-release documentation and attribution clarity; it does not try to relicense third-party work.

The repository's own code and original project materials remain covered by the proprietary terms in [`lincense`](lincense). That proprietary notice does not replace or change the license of any third-party component.

## Ownership and permission boundary

There is one deliberate upstream exception: the **original Rabbit Zawgyi-to-Unicode rule set**. Rabbit and its original rule data are not owned by this project and must retain their upstream attribution and licensing terms.

Except for that original Rabbit material, the static assets and runtime data in this repository are project-owned. This includes the parser maps, JSON data, generated rule/map data, encrypted model data, fonts that are not separately identified as upstream, and other files required by the application at runtime. These are not npm packages and must not be treated as third-party dependencies.

Project-owned assets may not be copied, redistributed, extracted, modified, decrypted, reverse engineered, or reused without written permission. A permission to use an asset, if granted after asking, does **not** itself grant permission to modify or decrypt it; those actions remain prohibited unless separately and expressly authorized. In particular, `Parsed/parser/model/master.json.enc` is project-owned runtime data: its encrypted form is protected and must not be copied, decrypted, or altered.

### Rabbit conversion rule set

The original Rabbit rule set is the broad exception to the project-ownership statement above. The project does not claim authorship of Rabbit or its original rule data. The local adapter in `Parsed/parser/module/rabbit.mjs` is project code, but the upstream rules it consumes remain subject to their own source terms. Rabbit may be replaced through `PRASER_RABBIT_MODULE`; that seam does not transfer ownership of any other local runtime asset.

## Runtime and built-in modules

The server requires [Node.js](https://nodejs.org/) 20 or newer. It uses Node-maintained built-in modules through `node:` imports, including `node:crypto`, `node:fs`, `node:path`, `node:stream`, `node:url`, and related standard-library modules. These modules are part of the Node.js distribution, are not vendored as project dependencies, and remain governed by the [Node.js license](https://github.com/nodejs/node/blob/main/LICENSE) and the notices distributed with Node.js.

The JavaScript engine, npm, and the system C/C++ toolchain used to build native modules are execution/build tools, not Linga source code. Their own notices continue to apply when they are installed or redistributed.

## Direct server dependencies

The following packages are declared by the root or parser workspace. Their exact versions are pinned through `package-lock.json`; consult the installed package's `LICENSE`, its registry metadata, or the upstream repository for the complete notice and transitive dependency set.

- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3)
- [cookie-parser](https://github.com/expressjs/cookie-parser)
- [dotenv](https://github.com/motdotla/dotenv)
- [Express](https://expressjs.com/)
- [express-rate-limit](https://github.com/express-rate-limit/express-rate-limit)
- [express-session](https://github.com/expressjs/session)
- [fs-extra](https://github.com/jprichardson/node-fs-extra)
- [Helmet](https://github.com/helmetjs/helmet)
- [Morgan](https://github.com/expressjs/morgan)
- [Multer](https://github.com/expressjs/multer)
- [Mammoth](https://github.com/mwilliamson/mammoth.js)
- [MuPDF](https://mupdf.com/)
- [Tesseract.js](https://github.com/naptha/tesseract.js)

## Frontend and build dependencies

The browser clients and their build tools use the following projects:

- [React](https://react.dev/) and [React DOM](https://react.dev/)
- [Bootstrap](https://getbootstrap.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Vite](https://vite.dev/) and [vite-plugin-singlefile](https://github.com/richardtallent/vite-plugin-singlefile)
- [Sass Embedded](https://github.com/sass/dart-sass)
- [Framer Motion](https://motion.dev/)
- [Lucide React](https://lucide.dev/)
- [canvas-confetti](https://github.com/catdad/canvas-confetti)
- [clsx](https://github.com/lukeed/clsx) and [tailwind-merge](https://github.com/dcastil/tailwind-merge)
- [JSZip](https://github.com/Stuk/jszip)
- [pdfjs-dist](https://github.com/mozilla/pdf.js)
- [TypeScript](https://www.typescriptlang.org/)
- [jsdom](https://github.com/jsdom/jsdom)

These packages bring their own transitive dependencies. The lockfile is the authoritative dependency inventory; do not treat this summary as a replacement for package-level license files.

## Bundled fonts

Fonts are third-party assets, not Linga-authored code. The imported collection is attributed to [moekyawsoe/Myanmar-Fonts](https://github.com/moekyawsoe/Myanmar-Fonts), commit `cefd1f5297c1fce9d052dd92cdf7bf8cf902426f`. Individual font authors and licenses remain authoritative for each binary. See [`Parsed/fonts/README.md`](Parsed/fonts/README.md) before copying or redistributing any font.

## Bundled OCR model

The Myanmar OCR model is from [pndaza/tesseract-myanmar](https://github.com/pndaza/tesseract-myanmar). Its source README and evaluation note are retained in [`Parsed/parser/module/README.md`](Parsed/parser/module/README.md). No explicit upstream license file or package field was present when this model was vendored; redistribution requires a fresh review of the upstream terms.

## Parser and document assets

- [pdf.js](https://github.com/mozilla/pdf.js) supplies browser PDF processing through `pdfjs-dist`.
- [Mammoth.js](https://github.com/mwilliamson/mammoth.js) supplies DOCX-to-HTML parsing.
- MuPDF is an optional parser dependency and may be used by the document pipeline when available.
- SQLite is provided through `better-sqlite3`; SQLite itself is public-domain software, while the wrapper has its own package license.

## Attribution maintenance

When adding a dependency, model, font, generated asset, or copied source excerpt:

1. record its upstream URL and version or commit in this file;
2. retain its license or notice when required;
3. avoid describing a third-party asset as project-authored; and
4. run the normal build and test suite after updating the attribution.

Markdown is only a notice index. The upstream license files, package metadata, lockfile, and bundled notices govern the legally relevant details.
