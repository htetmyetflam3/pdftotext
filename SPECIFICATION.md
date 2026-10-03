# Linga Site specification

**Status:** pre-release specification
**Release line:** 3.5.0

## Scope

The Site accepts text, PDF, and DOCX submissions, runs the in-process Myanmar parser, and returns authenticated results. It exposes the Bootstrap UI at `/`, a React reference UI at `/react/`, and health at `/healthz`.

## API and security requirements

- Browser state uses signed, secure cookie/session configuration from `.env`.
- Unsafe browser requests require same-origin validation and matching CSRF cookie/header tokens.
- Upload metadata is validated against the file name, route, task, and declared content.
- PDF and DOCX bytes are inspected; file extensions and Content-Type are not trusted alone.
- Upload size, parser limits, concurrency, timeouts, and artifact retention are configuration values.
- Download routes require the authenticated submission owner and do not expose arbitrary paths.
- Direct requests do not trust forgeable edge identity headers. Edge identity is accepted only after the configured signature is verified.

## Processing requirements

- Text submissions finish locally.
- PDF and DOCX submissions are processed by the parser worker manager.
- Conversion output is selected by the requested output format and is written to the runtime artifact area.
- Temporary input and expired output artifacts are removed according to `ARTIFACT_TTL_HOURS`.
- SQLite schema application is idempotent and runs at boot.
- Engine dispatch is dormant unless explicitly configured and is metadata-only; the Site never sends browser files to an Engine.

## Release acceptance

A pre-release is acceptable only when these commands pass:

```bash
npm run build
npm test
npm run test:chain
npm run check:imports
npm run lint
```

The generated frontend build is required before frontend contract checks. `npm ci` may require a locally available Node header toolchain for `better-sqlite3`; dependency installation must not be silently replaced with an unbuilt native module.

Where this document cannot answer an implementation question, use the relevant contract test and source module; do not infer behavior from prose alone.
