// FILE: frontend/verify-frontend-contract.mjs
//
// Frontend visibility contract, enforced in CI:
//   1. The frontend chain sees exactly ONE endpoint: /api/submit (delivered
//      by readDelivery / pollDelivery from the delivery libs).
//   2. Hidden is never referenced. Both delivery libs keep only the dormant,
//      documented constant ANALYSIS_HIDDEN_ENDPOINT = null, and no shipped
//      frontend source may carry hidden/Engine-dispatch vocabulary.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC_TREES = [
  "frontend/frontend-bootstrap/js",
  "frontend/frontend-react/src",
];
const DELIVERY_LIBS = [
  "frontend/frontend-bootstrap/js/delivery.js",
  "frontend/frontend-react/src/lib/delivery.ts",
];
const FORBIDDEN = [
  /\/api\/hidden/,
  /api\/hidden/,
  /resolveSubmission/,
  /jobToken/i,
  /x-api-key/i,
  /ENGINE_JOB_URL/,
  /ENGINE_TO_SITE_KEY/,
  /\/api\/internal\/engine/,
];

let failures = 0;
const fail = (message) => {
  console.error(`[frontend-contract] FAIL  ${message}`);
  failures += 1;
};
const ok = (message) => console.log(`[frontend-contract] ok    ${message}`);

// 1) The dormant documented constant must exist in both delivery libs.
for (const rel of DELIVERY_LIBS) {
  const full = path.join(ROOT, rel);
  if (!fs.existsSync(full)) {
    fail(`${rel} is missing`);
    continue;
  }
  const source = fs.readFileSync(full, "utf8");
  if (/export\s+const\s+ANALYSIS_HIDDEN_ENDPOINT(\s*:\s*string\s*\|\s*null)?\s*=\s*null;/.test(source)) {
    ok(`${rel} exports the documented dormant ANALYSIS_HIDDEN_ENDPOINT = null`);
  } else {
    fail(`${rel} lost the documented dormant ANALYSIS_HIDDEN_ENDPOINT = null selector constant`);
  }
}

// 2) No shipped frontend source may mention hidden or Engine-dispatch vocabulary.
const scanDir = (dir, bag = []) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) scanDir(full, bag);
    else if (/\.(js|jsx|ts|tsx|mjs|cjs|html|css)$/.test(entry.name)) bag.push(full);
  }
  return bag;
};
for (const tree of SRC_TREES) {
  const full = path.join(ROOT, tree);
  if (!fs.existsSync(full)) {
    fail(`${tree} is missing`);
    continue;
  }
  for (const file of scanDir(full)) {
    const rel = path.relative(ROOT, file);
    const source = fs.readFileSync(file, "utf8");
    for (const pattern of FORBIDDEN) {
      if (pattern.test(source)) {
        fail(`${rel} contains forbidden pattern ${pattern} — hidden must stay server-side`);
      }
    }
  }
  ok(`${tree} scanned: no hidden / Engine-dispatch references`);
}

if (failures > 0) {
  console.error(`[frontend-contract] ${failures} contract violation(s)`);
  process.exit(1);
}
console.log("[frontend-contract] all checks passed");
