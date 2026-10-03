// FILE: utility-tools/regenerate-env.test.mjs
//
// Contract for the owner's regenerate-env.js, with the directional bridge
// names matched: FSM_KEY -> SITE_TO_ENGINE_KEY (Site hidden -> Engine) and
// ENGINE_KEY_ANSWER -> ENGINE_TO_SITE_KEY (Engine -> Site queue answer).
// The Site's own engineConfig()/checkEngineKey() gate those two names, so
// the rotation surface can never drift back to the stale vocabulary.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { regenerateEnv } from "./regenerate-env.js";
import { engineConfig, checkEngineKey, ENGINE_KEY_RE } from "../backend/gateway/generator/engine.js";

const HEX64 = /^[0-9a-f]{64}$/;

const FIXTURE = [
  "# frozen header comment",
  "PORT=3000",
  "MODE=development",
  "NODE_ENV=development",
  `COOKIE_SECRET=${"a".repeat(64)}`,
  `SESSION_SECRET=${"b".repeat(64)}`,
  "TRUST_PROXY=false",
  "EDGE_SECRET=",
  `FSM_KEY=${"c".repeat(64)}`,
  `ENGINE_KEY_ANSWER=${"d".repeat(64)}`,
  "ENGINE_JOB_URL=https://engine.internal/job",
  "COOKIE_SOMETHING_ELSE=untouched-prefix-safety",
  "# trailing comment",
  "",
].join("\n");

const tmpEnv = (content = FIXTURE) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "linga-regen-"));
  const file = path.join(dir, ".env");
  fs.writeFileSync(file, content, "utf8");
  return { dir, file };
};

const readLines = (file) => fs.readFileSync(file, "utf8").split("\n");

test("one run manages the joined name set: cookie/session/edge 64-hex, engine pair 32-hex", async (t) => {
  const { dir, file } = tmpEnv();
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const values = await regenerateEnv({ filePath: file, print: false });

  assert.match(values.COOKIE_SECRET, HEX64);
  assert.match(values.SESSION_SECRET, HEX64);
  assert.match(values.SITE_TO_ENGINE_KEY, ENGINE_KEY_RE, "Site->Engine is 32 hex (checkEngineKey shape)");
  assert.match(values.ENGINE_TO_SITE_KEY, ENGINE_KEY_RE, "Engine->Site is 32 hex (checkEngineKey shape)");
  assert.notEqual(values.COOKIE_SECRET, values.SESSION_SECRET);
  assert.notEqual(values.SITE_TO_ENGINE_KEY, values.ENGINE_TO_SITE_KEY, "directional pair is independent");

  const lines = readLines(file);
  for (const name of ["MODE", "NODE_ENV", "COOKIE_SECRET", "SESSION_SECRET", "TRUST_PROXY", "EDGE_SECRET", "SITE_TO_ENGINE_KEY", "ENGINE_TO_SITE_KEY"]) {
    assert.equal(lines.filter((l) => l.startsWith(`${name}=`)).length, 1, `${name} appears exactly once`);
  }
  assert.ok(lines.includes("MODE=production"));
  assert.ok(lines.includes("NODE_ENV=production"));
  assert.ok(lines.includes("TRUST_PROXY=false"), "TRUST_PROXY preserved");
  assert.equal(values.TRUST_PROXY, "false");
  assert.equal(values.EDGE_SECRET, "", "blank EDGE_SECRET stays blank");

  // names that must NOT be regenerated anymore stay verbatim, untouched
  assert.ok(lines.includes(`FSM_KEY=${"c".repeat(64)}`));
  assert.ok(lines.includes(`ENGINE_KEY_ANSWER=${"d".repeat(64)}`));
  assert.ok(lines.includes("COOKIE_SOMETHING_ELSE=untouched-prefix-safety"));
  assert.ok(lines.includes("ENGINE_JOB_URL=https://engine.internal/job"));
  assert.ok(lines.includes("# frozen header comment"));
  assert.ok(lines.includes("# trailing comment"));

  assert.equal(fs.statSync(file).mode & 0o777, 0o600);
});

test("edge rotation semantics: blank stays, set rotates, --enable-edge forces", async (t) => {
  const { dir, file } = tmpEnv();
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const blank = await regenerateEnv({ filePath: file, print: false });
  assert.equal(blank.EDGE_SECRET, "");

  const withEdge = await regenerateEnv({ filePath: file, enableEdge: true, print: false });
  assert.match(withEdge.EDGE_SECRET, HEX64);
  const rotated = await regenerateEnv({ filePath: file, print: false });
  assert.match(rotated.EDGE_SECRET, HEX64);
  assert.notEqual(rotated.EDGE_SECRET, withEdge.EDGE_SECRET, "set EDGE_SECRET rotates every run");
});

test("reruns rotate everything secret; the file satisfies the Site's own engineConfig", async (t) => {
  const { dir, file } = tmpEnv();
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const first = await regenerateEnv({ filePath: file, print: false });
  const second = await regenerateEnv({ filePath: file, print: false });
  for (const name of ["COOKIE_SECRET", "SESSION_SECRET", "SITE_TO_ENGINE_KEY", "ENGINE_TO_SITE_KEY"]) {
    assert.notEqual(second[name], first[name], `${name} rotates on rerun`);
  }

  const env = {};
  for (const line of readLines(file)) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line);
    if (m) env[m[1]] = m[2].trim();
  }
  const cfg = engineConfig(env);
  assert.equal(cfg.jobUrl, "https://engine.internal/job");
  assert.equal(checkEngineKey(cfg.siteToEngineKey), "ok");
  assert.equal(checkEngineKey(cfg.engineToSiteKey), "ok");
  assert.equal(cfg.siteToEngineKey, second.SITE_TO_ENGINE_KEY);
});

test("duplicates collapse, export-prefixed managed lines update in place, missing files throw", async (t) => {
  const dup = `COOKIE_SECRET=${"1".repeat(64)}\nCOOKIE_SECRET=${"2".repeat(64)}\nexport SESSION_SECRET=${"3".repeat(64)}\n`;
  const { dir, file } = tmpEnv(dup);
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  await regenerateEnv({ filePath: file, print: false });
  const text = fs.readFileSync(file, "utf8");
  assert.equal((text.match(/^COOKIE_SECRET=/gm) || []).length, 1, "stale duplicate removed");
  assert.ok(!text.includes(`${"2".repeat(64)}`));
  const session = text.split("\n").find((l) => l.startsWith("export SESSION_SECRET="));
  assert.ok(session, "export prefix preserved");
  assert.ok(!session.includes(`${"3".repeat(64)}`), "value rotated under the same line");

  await assert.rejects(
    () => regenerateEnv({ filePath: path.join(dir, "missing.env"), print: false }),
    /not found/i,
  );
});
