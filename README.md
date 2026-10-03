# Linga Site — preproduction

Linga Site is an Express web application for Myanmar text and document processing. It contains the Site API, Bootstrap and React clients, an in-process parser, SQLite persistence, and bundled parser assets.

## Install, build, and run

Node.js 20 or newer is required.

```bash
npm install          # or: yarn   /   pnpm install
npm run prepare:prerelease
npm start
```

No lockfile is tracked — the repo has to build under npm, yarn and pnpm — so
use `npm install`, not `npm ci` (that command requires a lockfile). Lockfiles
are gitignored so a local install cannot leak one into a commit.

The Bootstrap client is served at `/`; the React reference build is served at `/react/`; health is available at `/healthz`. `npm run build` must run before frontend contract checks because it creates the ignored `frontend/dist/` directory.

## Configuration

`.env` is a committed preproduction template. Replace `COOKIE_SECRET` and `SESSION_SECRET` before publishing. For HTTPS, set `COOKIE_SECURE=true`. The `ENGINE_*`, `FSM_KEY`, and `SITE_PUBLIC_URL` entries describe a future contract only; they do not activate Engine traffic.

Upload limits, parser limits, timeouts, concurrency, and artifact retention are explicit environment settings. Runtime artifacts can be placed outside the release tree with `PARSER_RUNTIME_DIR`.

### Secrets and variables, from the command line

`.env` stays local. To put the same keys on GitHub Actions without opening the
settings page, use the GitHub CLI wrapper (`gh auth login` once, first):

```bash
npm run env:check                       # local .env vs what GitHub already has
npm run env:push -- --dry-run           # show the plan, write nothing
npm run env:push                        # upload
npm run env:push -- --env production    # target a deployment environment
npm run env:pull -- --file .env.github  # read Actions variables back out
```

With yarn or pnpm, drop the `--` separator: `yarn env:push --dry-run`.

A key is stored as a **secret** when its name contains
`SECRET`/`TOKEN`/`KEY`/`PASSWORD`/`CREDENTIAL`/`PRIVATE`, otherwise as a
**variable**; override per run with `--secret A,B` / `--var C,D`. Placeholder
(`REPLACE_*`) and empty values are refused unless you pass
`--allow-placeholders`, so run `npm run env:regenerate` first. Values are
handed to `gh` on stdin, so they never appear in `ps` or your shell history.
Secrets are write-only on GitHub: `check` and `pull` can see their names but
never their values. Run `node utility-tools/env-sync.mjs help` for all flags.

Locally you do not need the `dotenv` package or a package manager to load the
file — Node reads it directly:

```bash
node --env-file=.env index.js
```

## Verification

```bash
npm run prepare:prerelease
npm run check:imports
npm run lint
```

The preparation command builds both clients, runs the unit/parser/frontend suite, runs the integration chain, checks imports, and removes generated build output. The maintenance utilities live in `utility-tools/`; `clean.js` removes ordinary JavaScript comments and is intentionally run only after a test pass.

See [PROJECT-STRUCTURE.md](PROJECT-STRUCTURE.md) for navigation, [SPECIFICATION.md](SPECIFICATION.md) for behavior and acceptance criteria, [ATTRIBUTIONS.md](ATTRIBUTIONS.md) for third-party notices, and [CHANGELOG.md](CHANGELOG.md) for this pre-release. `plan.md` is a separate future-session design and is intentionally excluded from documentation cleanup.
