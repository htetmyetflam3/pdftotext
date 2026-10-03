// FILE: frontend/analysis-task.test.mjs
//
// Node --test over the analysis-task module (the separate build-part session
// that overrides the task after the yes/no loop) and its React TS mirror.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ANALYSIS_TASK,
  ANALYSIS_TASK_PREFIX,
  ANALYSIS_VARIANTS,
  analysisVariantFromTask,
  analysisVariantFromJob,
  overrideTask,
} from "./frontend-bootstrap/js/analysis-task.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)));

test("job variants remain available for routing, but do not rewrite task", () => {
  assert.deepEqual(ANALYSIS_VARIANTS, ["extracting", "conversion"]);
  assert.equal(analysisVariantFromTask("analysis-extracting"), "extracting");
  assert.equal(analysisVariantFromTask("analysis-conversion"), "conversion");
  assert.equal(analysisVariantFromJob("extracting-analysis"), "extracting");
  assert.equal(analysisVariantFromJob("conversion-analysis"), "conversion");
  // bare analysis carries no variant; nothing else parses at all
  assert.equal(analysisVariantFromTask(ANALYSIS_TASK), "");
  assert.equal(analysisVariantFromTask("analysis-bogus"), null);
  assert.equal(analysisVariantFromTask("analysis-"), null);
  assert.equal(analysisVariantFromTask("conversion"), null);
  assert.equal(analysisVariantFromTask("demo"), null);
  assert.equal(analysisVariantFromJob("extracting"), null);
  assert.equal(analysisVariantFromJob("ocr"), null);
  assert.equal(analysisVariantFromJob("bogus-analysis"), null);
  // no double prefix, no nasties
  assert.equal(analysisVariantFromTask("analysis-analysis-extracting"), null);
  assert.equal(analysisVariantFromTask("analysis- analysis"), null);
  assert.equal(ANALYSIS_TASK_PREFIX, "analysis-");
});

test("overrideTask appends only analysis job variants", () => {
  assert.equal(overrideTask("analysis", "extracting-analysis"), "analysis-extracting");
  assert.equal(overrideTask("analysis", "conversion-analysis"), "analysis-conversion");
  assert.equal(overrideTask("conversion", "extracting"), "conversion");
  assert.equal(overrideTask("conversion", "ocr"), "conversion");
  assert.equal(overrideTask("demo", undefined), "demo");
});

test("the build part emits source and conversion without a task field", async () => {
  const { buildPayload } = await import("./frontend-bootstrap/js/upload.js");
  const plan = {
    name: "book.pdf",
    inputFormat: "pdf",
    kind: "pdf-text",
    readable: true,
    detector: {
      name: "pdf.js", pages: 1, textPages: 1, imagePages: 0,
      myanmarChars: 1, myanmarLetters: 1, imageBytes: 0, textBytes: 10,
      confirmed: false,
    },
  };
  const at = new Date("2026-09-30T14:12:33.000Z");

  const analysisText = buildPayload({ plan, flow: "analysis", at });
  assert.equal(analysisText.source, "analysis");
  assert.equal(analysisText.job, "extracting");
  assert.equal(analysisText.fileFormat, "pdf");
  assert.equal(analysisText.conversion, "txt");
  assert.equal("task" in analysisText, false);

  const analysisOcr = buildPayload({ plan: { ...plan, kind: "pdf-scan" }, flow: "analysis", at });
  assert.equal(analysisOcr.source, "analysis");
  assert.equal(analysisOcr.job, "conversion-analysis");
  assert.equal("task" in analysisOcr, false);

  const conversion = buildPayload({ plan, flow: "conversion", at });
  assert.equal(conversion.source, "converter");
  assert.equal(conversion.job, "extracting");
  assert.equal(conversion.conversion, "txt");
  assert.equal("task" in conversion, false);
});

test("the React mirror stays a type-only mirror", () => {
  const ts = readFileSync(path.join(ROOT, "frontend-react/src/lib/analysis-task.ts"), "utf8");
  const js = readFileSync(path.join(ROOT, "frontend-bootstrap/js/analysis-task.js"), "utf8");
  for (const fn of [
    "analysisVariantFromTask",
    "analysisVariantFromJob",
    "overrideTask",
    "ANALYSIS_TASK_PREFIX",
    "ANALYSIS_VARIANTS",
  ]) {
    assert.ok(ts.includes(fn), `TS mirror lost ${fn}`);
    assert.ok(js.includes(fn), `JS module lost ${fn}`);
  }
});
