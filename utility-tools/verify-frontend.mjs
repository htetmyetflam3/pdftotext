/**
 * FILE: utility-tools/verify-frontend.mjs
 *
 * The frontend half of `npm test`, previously a single shell chain:
 *
 *   node --test frontend/analysis-task.test.mjs && node frontend/verify-frontend-contract.mjs
 *   && node frontend/frontend-bootstrap/verify-mirror.mjs
 *   && cd frontend/frontend-react && node verify-overlay-and-slider.mjs
 *
 * The trailing `cd` is load-bearing: verify-overlay-and-slider.mjs reads
 * "public/samples/…" and "../dist/react/index.html" relative to the working
 * directory. Spelling that as `cd x && y` makes the whole line shell- and
 * shell-operator-dependent; here each check simply declares the cwd it needs.
 */
import path from "node:path";
import { ROOT, runNode, workspace } from "./workspaces.mjs";

const bootstrap = workspace("@linga/frontend-bootstrap");
const react = workspace("@linga/frontend-react");

const CHECKS = [
  {
    label: "analysis-task parity (node --test)",
    args: ["--test", path.join(ROOT, "frontend/analysis-task.test.mjs")],
    cwd: ROOT,
  },
  {
    label: "frontend visibility contract",
    args: [path.join(ROOT, "frontend/verify-frontend-contract.mjs")],
    cwd: ROOT,
  },
  {
    label: "bootstrap mirror (jsdom, shipped build)",
    args: [path.join(bootstrap.dir, "verify-mirror.mjs")],
    cwd: bootstrap.dir,
  },
  {
    label: "react overlay + slider",
    // needs cwd = the react workspace: it reads public/ and ../dist/react
    args: [path.join(react.dir, "verify-overlay-and-slider.mjs")],
    cwd: react.dir,
  },
];

try {
  for (const check of CHECKS)
    runNode(check.args, { cwd: check.cwd, label: check.label });
  console.log("\nfrontend checks: all passed");
} catch (error) {
  console.error(`\nfrontend checks failed: ${error.message}`);
  process.exit(error.exitCode ?? 1);
}
