/**
 * FILE: utility-tools/build-frontend.mjs
 *
 * Builds the two frontend workspaces from the repo root, with the working
 * directory set explicitly for each one.
 *
 *   node utility-tools/build-frontend.mjs            # clean, then both
 *   node utility-tools/build-frontend.mjs bootstrap  # just that one, no clean
 *   node utility-tools/build-frontend.mjs react
 *   node utility-tools/build-frontend.mjs --clean bootstrap react
 *
 * Why not `npm run build --workspace …`: that flag is npm-only, so the root
 * script broke under yarn and pnpm. Here Vite is resolved from the
 * workspace's own package.json and executed with `cwd` set to that folder —
 * which is also why `vite.config.js` is found without passing `--config`
 * (that relative path was being resolved against the repo root, the
 * "vite.config.js not found" report).
 *
 * Order matters: the Bootstrap build writes frontend/dist, the React build
 * writes frontend/dist/react *inside* it, so Bootstrap goes first and
 * neither build may empty the shared folder (see vite.config.js).
 */
import {
  listWorkspaces,
  runWorkspaceBin,
  runNode,
  ROOT,
} from "./workspaces.mjs";
import path from "node:path";

const TARGETS = [
  { key: "bootstrap", name: "@linga/frontend-bootstrap" },
  { key: "react", name: "@linga/frontend-react" },
];

const argv = process.argv.slice(2);
const wanted = argv.filter((a) => !a.startsWith("-"));
const forceClean = argv.includes("--clean");
const noClean = argv.includes("--no-clean");

const selected = wanted.length
  ? wanted.map((want) => {
      const target = TARGETS.find((t) => t.key === want || t.name === want);
      if (!target) {
        console.error(
          `unknown build target "${want}". Known: ${TARGETS.map((t) => `${t.key} (${t.name})`).join(", ")}`,
        );
        process.exit(1);
      }
      return target;
    })
  : TARGETS;

// A full build owns the shared output folder; a single-target build does not.
const shouldClean = forceClean || (!noClean && wanted.length === 0);

try {
  if (shouldClean)
    runNode([path.join(ROOT, "utility-tools/clean-dist.mjs")], { cwd: ROOT });

  const declared = listWorkspaces().map((ws) => ws.name);
  for (const target of selected) {
    if (!declared.includes(target.name)) {
      throw new Error(
        `${target.name} is not a declared workspace (declared: ${declared.join(", ")}).\n` +
          `Either restore it in the root "workspaces" field or drop it from this script.`,
      );
    }
    runWorkspaceBin(target.name, "vite", ["build"]);
  }
  console.log("\nbuild: done");
} catch (error) {
  console.error(`\nbuild failed: ${error.message}`);
  process.exit(error.exitCode ?? 1);
}
