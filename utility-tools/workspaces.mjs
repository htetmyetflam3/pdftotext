/**
 * FILE: utility-tools/workspaces.mjs
 *
 * One source of truth for "where does workspace X live, and how do I run
 * something inside it".
 *
 * Why this exists
 * ---------------
 * The root lifecycle scripts used to be written as
 *
 *     "build:bootstrap": "npm run build --workspace @linga/frontend-bootstrap"
 *     "build"          : "rm -rf frontend/dist && ..."
 *     "test:frontend"  : "... && cd frontend/frontend-react && node verify.mjs"
 *
 * which bakes in three assumptions that do not hold everywhere:
 *   1. the package manager is npm ≥ 7 (`--workspace` is npm-only; yarn
 *      classic, yarn berry and pnpm all spell it differently);
 *   2. the shell is POSIX with coreutils (`rm -rf`, `cd a && b`);
 *   3. the child process inherits the right working directory, which is the
 *      reason `vite --config vite.config.js` reported "config not found"
 *      when the script was reached from the repo root instead of from the
 *      package folder.
 *
 * Everything here runs on plain Node: no shell operators, no npm/yarn/pnpm
 * specific flags, and every child process gets an explicit `cwd`. The
 * workspace list is READ FROM the `workspaces` field of the root
 * package.json, so a script can never drift away from the declaration — if a
 * folder is moved or a package renamed, the runner fails with the real
 * reason instead of a missing-file error.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";

export const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));

/** Expand one `workspaces` entry ("a/b", "a/*", "packages/**") to directories. */
function expand(pattern) {
  const segments = pattern.split("/").filter(Boolean);
  let dirs = [ROOT];
  for (const segment of segments) {
    const next = [];
    for (const dir of dirs) {
      if (segment === "*" || segment === "**") {
        if (!fs.existsSync(dir)) continue;
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          if (entry.isDirectory() && entry.name !== "node_modules") {
            next.push(path.join(dir, entry.name));
          }
        }
      } else {
        next.push(path.join(dir, segment));
      }
    }
    dirs = next;
  }
  return dirs.filter((dir) => fs.existsSync(path.join(dir, "package.json")));
}

/** Every declared workspace: `{ name, dir, relative, pkg }`. */
export function listWorkspaces() {
  const root = readJson(path.join(ROOT, "package.json"));
  const patterns = Array.isArray(root.workspaces)
    ? root.workspaces
    : (root.workspaces?.packages ?? []);
  const seen = new Map();
  for (const pattern of patterns) {
    for (const dir of expand(pattern)) {
      const pkg = readJson(path.join(dir, "package.json"));
      seen.set(pkg.name, {
        name: pkg.name,
        dir,
        relative: path.relative(ROOT, dir),
        pkg,
      });
    }
  }
  return [...seen.values()];
}

/** One workspace by package name, with an actionable error if it moved. */
export function workspace(name) {
  const all = listWorkspaces();
  const found = all.find((ws) => ws.name === name);
  if (found) return found;
  throw new Error(
    `workspace "${name}" is not declared in the root package.json.\n` +
      `Declared workspaces: ${all.map((ws) => `${ws.name} (${ws.relative})`).join(", ") || "none"}\n` +
      `Fix the "workspaces" field or the name used by the script — they have drifted apart.`,
  );
}

/** Spawn a child with an explicit cwd. No shell, so no quoting/`&&` surprises. */
export function run(command, args, { cwd = ROOT, label } = {}) {
  const shown = label ?? `${path.basename(command)} ${args.join(" ")}`;
  console.log(`\n> ${shown}\n  (in ${path.relative(ROOT, cwd) || "."})`);
  const result = spawnSync(command, args, {
    cwd,
    stdio: "inherit",
    env: process.env,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const reason = result.signal
      ? `signal ${result.signal}`
      : `exit code ${result.status}`;
    const error = new Error(`${shown} failed (${reason})`);
    error.exitCode = result.status ?? 1;
    throw error;
  }
}

/** Run a Node script with an explicit cwd, using THIS node binary. */
export function runNode(scriptArgs, options = {}) {
  run(process.execPath, scriptArgs, options);
}

/**
 * Resolve the CLI entry of an installed package from a given folder.
 * Goes through `<pkg>/package.json` + its `bin` field rather than guessing a
 * path like `vite/bin/vite.js`, because modern packages gate deep imports
 * behind an `exports` map and that path is not always exported.
 */
function resolveBin(fromDir, pkgName, binName = pkgName) {
  const require = createRequire(path.join(fromDir, "package.json"));
  const manifestPath = require.resolve(`${pkgName}/package.json`);
  const manifest = readJson(manifestPath);
  const bin =
    typeof manifest.bin === "string" ? manifest.bin : manifest.bin?.[binName];
  if (!bin) throw new Error(`${pkgName} declares no "${binName}" bin`);
  return path.join(path.dirname(manifestPath), bin);
}

/**
 * Run a dependency's CLI inside a workspace — resolved from that workspace's
 * own `package.json`, so it works with hoisted (npm/yarn classic) and
 * isolated (pnpm, yarn berry node-modules) layouts alike, and without asking
 * which package manager installed it.
 */
export function runWorkspaceBin(name, pkgName, args, options = {}) {
  const ws = workspace(name);
  let bin;
  try {
    bin = resolveBin(ws.dir, pkgName);
  } catch (error) {
    throw new Error(
      `cannot run "${pkgName}" for ${ws.name} (${ws.relative}): ${error.message}.\n` +
        `Install dependencies at the repo root first — npm install / yarn install / pnpm install.`,
      { cause: error },
    );
  }
  runNode([bin, ...args], {
    cwd: ws.dir,
    label: `${pkgName} ${args.join(" ")} — ${ws.name}`,
    ...options,
  });
}

/** `node utility-tools/workspaces.mjs` prints what the declaration resolves to. */
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const all = listWorkspaces();
  console.log(
    `workspaces declared in ${path.relative(ROOT, path.join(ROOT, "package.json"))}:`,
  );
  for (const ws of all) {
    const scripts = Object.keys(ws.pkg.scripts ?? {});
    console.log(
      `  ${ws.name.padEnd(28)} ${ws.relative.padEnd(28)} scripts: ${scripts.join(", ") || "—"}`,
    );
  }
  if (!all.length) {
    console.error(
      "none resolved — the workspaces field points at folders without a package.json",
    );
    process.exitCode = 1;
  }
}
