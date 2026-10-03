# Project structure

Linga Site is a preproduction Express application with two browser clients and an in-process Myanmar document parser.

```text
linga/
├── index.js                         Express entry point and route wiring
├── package.json                     workspace scripts and release metadata
├── .env                             committed placeholder configuration
├── .data/site.db                    initialized SQLite seed database
├── backend/                         HTTP, security, persistence, file, and gateway modules
├── frontend/
│   ├── frontend-bootstrap/          Bootstrap client served at `/`
│   ├── frontend-react/              React reference client served at `/react/`
│   └── comparison/                  analysis fixtures
├── Parsed/
│   ├── parser/                      parser workspace and sidecars
│   └── fonts/                       Myanmar input/output font assets
├── utility-tools/                   checks, tests, and maintenance scripts
└── plan.md                          future per-visitor session plan (excluded from release cleanup)
```

## Runtime flow

1. `index.js` loads configuration and initializes SQLite.
2. Express serves both built frontends and the Site API.
3. Uploads are validated and stored in the configured runtime directory.
4. The parser converts supported documents and records submission state.
5. Cleanup removes expired temporary artifacts and authenticated routes deliver results.

`frontend/dist/` is generated and ignored. `backend/gateway/` documents a future Engine contract; this release does not contact an Engine from the browser. Markdown is navigation and intent only: source, configuration, and contract tests are authoritative when an explanation is insufficient.
