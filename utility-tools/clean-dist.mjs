/**
 * FILE: utility-tools/clean-dist.mjs
 *
 * `rm -rf frontend/dist`, minus the shell. `rm` is not on PATH everywhere
 * (Windows, slim CI images), and the old script only worked when the shell
 * npm picked was POSIX. fs.rmSync is the same operation on every platform.
 */
import fs from "node:fs";
import path from "node:path";
import { ROOT } from "./workspaces.mjs";

const targets = process.argv.slice(2);
const dirs = targets.length ? targets : ["frontend/dist"];

for (const target of dirs) {
  const dir = path.resolve(ROOT, target);
  if (!dir.startsWith(ROOT + path.sep)) {
    console.error(`refusing to delete outside the repo: ${target}`);
    process.exit(1);
  }
  const existed = fs.existsSync(dir);
  fs.rmSync(dir, { recursive: true, force: true });
  console.log(
    `clean: ${existed ? "removed" : "nothing to remove at"} ${path.relative(ROOT, dir)}`,
  );
}
