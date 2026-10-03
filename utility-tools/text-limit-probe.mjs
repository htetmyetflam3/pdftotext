// Proves MAX_TEXT_INPUT_CHARS is reachable: the route's own 413 must fire
// above the limit, for ASCII *and* for Myanmar text (3 bytes per character in
// UTF-8, which is what this site is for).
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const PORT = 3333;
const BASE = `http://127.0.0.1:${PORT}`;
const UA = "LingaTextLimitProbe/1.0";
const LIMIT = 50_000; // small, so the probe is fast; the ratio is what matters
let child, tempDir, output = "";

const log = (ok, name, detail) =>
  console.log(`${ok ? "PASS" : "BUG "}  ${name}${detail ? ` — ${detail}` : ""}`);

async function waitForSite() {
  const deadline = Date.now() + 25_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`site exited:\n${output}`);
    try { if ((await fetch(`${BASE}/healthz`)).ok) return; } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`site never healthy:\n${output}`);
}
async function session() {
  const res = await fetch(`${BASE}/csrf-token`, { headers: { "user-agent": UA } });
  const { csrfToken } = await res.json();
  return { csrfToken, cookie: res.headers.getSetCookie().map((v) => v.split(";", 1)[0]).join("; ") };
}
async function submit(s, text) {
  const res = await fetch(`${BASE}/api/submit`, {
    method: "POST",
    headers: { "user-agent": UA, "x-csrf-token": s.csrfToken, cookie: s.cookie,
      "content-type": "application/json" },
    body: JSON.stringify({ text }),
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

try {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "linga-textlimit-"));
  child = spawn(process.execPath, ["index.js"], {
    cwd: process.cwd(),
    env: { ...process.env, MODE: "production", PORT: String(PORT), HOST: "127.0.0.1",
      DB_FILE: path.join(tempDir, "site.db"),
      PARSER_RUNTIME_DIR: path.join(tempDir, "runtime"),
      COOKIE_SECRET: "textlimit-cookie-secret-at-least-32-chars",
      SESSION_SECRET: "textlimit-session-secret-at-least-32-chars",
      TRUST_PROXY: "", EDGE_SECRET: "", REQUIRE_MM_COUNTRY: "false",
      MAX_TEXT_INPUT_CHARS: String(LIMIT), UPLOAD_RATE_MAX: "500", IDENTITY_RATE_MAX: "500" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", (c) => { output += c; });
  child.stderr.on("data", (c) => { output += c; });
  await waitForSite();

  // Myanmar is 3 bytes/char in UTF-8. Under the old hard-coded 1mb cap with a
  // 1,000,000-char limit, Myanmar text died at ~330k chars with the parser's
  // "Request body is too large" and the configured limit was unreachable.
  const mm = "မြန်မာ";
  const mmText = mm.repeat(Math.ceil((LIMIT - 10) / mm.length)).slice(0, LIMIT - 10);
  const mmBytes = Buffer.byteLength(mmText, "utf8");

  const underAscii = await submit(await session(), "a".repeat(LIMIT - 10));
  log(underAscii.status === 202, "ASCII just under the limit is accepted",
    `HTTP ${underAscii.status}`);

  const underMm = await submit(await session(), mmText);
  log(underMm.status === 202,
    "Myanmar text just under the limit is accepted",
    `${mmText.length} chars = ${mmBytes} bytes -> HTTP ${underMm.status}`);

  const over = await submit(await session(), "a".repeat(LIMIT + 10));
  log(over.status === 413 && /Text submission is too large/.test(over.body.error || ""),
    "over the limit hits the route's own 413, not the body parser's",
    `HTTP ${over.status} ${JSON.stringify(over.body.error)}`);
} catch (e) {
  console.error("harness error:", e); console.error(output.slice(-2000));
} finally {
  if (child?.exitCode === null) { child.kill("SIGTERM"); await new Promise((r) => child.once("exit", r)); }
  if (tempDir) await fs.rm(tempDir, { recursive: true, force: true });
}
