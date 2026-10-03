# Changelog

## 3.5.0 — pre-release — 2026-10-02

### Included

- Express Site API with SQLite persistence and authenticated sessions.
- Bootstrap production client at `/` and React reference client at `/react/`.
- In-process Myanmar parser with PDF and DOCX processing.
- Upload validation, CSRF protection, rate/concurrency controls, artifact cleanup, and authenticated downloads.
- Dormant, metadata-only Site-to-Engine contract modules for future integration.
- Repository structure, specification, and release verification documentation.

### Verification

- `npm run build` passed.
- `npm test` passed after the production frontend build was generated.
- `npm run test:chain` passed, including text, PDF, DOCX, download, cleanup, and queue coverage.
- `utility-tools/clean.js` was run over the JavaScript source trees after testing; tests are rerun as part of final release preparation.

### Known pre-release limits

- No deployment or Cloudflare Worker is included.
- Engine traffic remains disabled unless explicitly configured by the operator.
- `.env` contains replaceable secrets and must not be published unchanged.
