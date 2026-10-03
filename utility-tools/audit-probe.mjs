// Adversarial audit probe — NOT part of the shipped test suite.
// Spawns the site and exercises edge cases the committed tests do not cover.
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const PORT = Number(process.env.PROBE_PORT || 3311);
const BASE = `http://127.0.0.1:${PORT}`;
const UA = "LingaAuditProbe/1.0";
let child, tempDir, output = "";

const results = [];
const record = (name, ok, detail) => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "BUG "}  ${name}${detail ? ` — ${detail}` : ""}`);
};

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
  const cookie = res.headers.getSetCookie().map((v) => v.split(";", 1)[0]).join("; ");
  return { csrfToken, cookie };
}

const H = (s, extra = {}) => ({
  "user-agent": UA,
  "x-csrf-token": s.csrfToken,
  cookie: s.cookie,
  ...extra,
});

function intent(uploadName, o = {}) {
  return {
    v: 1, task: "conversion", originalName: "sample.pdf", uploadName,
    inputFormat: "pdf", outputFormat: "txt", content: "text",
    job: "extracting", method: "default", clickedAt: new Date().toISOString(),
    detector: { name: "pdf.js", pages: 1, textPages: 1, imagePages: 0,
      myanmarChars: 1, myanmarLetters: 1, imageBytes: 0, textBytes: 1, confirmed: true },
    ...o,
  };
}
const stamped = (stem = "sample") =>
  `${new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z")}__${stem}.pdf`;

async function textSubmit(s, text = "probe") {
  return fetch(`${BASE}/api/submit`, {
    method: "POST",
    headers: H(s, { "content-type": "application/json" }),
    body: JSON.stringify({ text }),
  });
}

async function main() {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "linga-audit-"));
  child = spawn(process.execPath, ["index.js"], {
    cwd: process.cwd(),
    env: {
      ...process.env, MODE: "production", PORT: String(PORT), HOST: "127.0.0.1",
      DB_FILE: path.join(tempDir, "site.db"),
      PARSER_RUNTIME_DIR: path.join(tempDir, "runtime"),
      COOKIE_SECRET: "audit-cookie-secret-at-least-32-characters",
      SESSION_SECRET: "audit-session-secret-at-least-32-characters",
      TRUST_PROXY: "", EDGE_SECRET: "", REQUIRE_MM_COUNTRY: "false",
      UPLOAD_RATE_MAX: "1000", IDENTITY_RATE_MAX: "5000",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", (c) => { output += c; });
  child.stderr.on("data", (c) => { output += c; });
  await waitForSite();

  // ---------------------------------------------------------------- PROBE 1
  // GET /api/result?count=<negative>  → SQLite treats LIMIT -1 as "no limit".
  {
    const s = await session();
    for (let i = 0; i < 3; i++) await textSubmit(s, `row ${i}`);
    const get = async (q) =>
      (await (await fetch(`${BASE}/api/result${q}`, { headers: H(s) })).json()).count;
    const [all, one, two, negative, zero] = await Promise.all([
      get(""), get("?count=1"), get("?count=2"), get("?count=-1"), get("?count=0"),
    ]);
    // A negative count must behave exactly like the default, never like the
    // unbounded SQLite "LIMIT -1". With 3 rows present, default == 3.
    record(
      "GET /api/result clamps count at both ends",
      one === 1 && two === 2 && negative === all && zero === all,
      `default=${all} count=1 -> ${one}, count=2 -> ${two}, count=-1 -> ${negative}, count=0 -> ${zero}`,
    );
  }

  // ---------------------------------------------------------------- PROBE 2
  // Daily quota is documented as 3/day. Count how many 202s a fresh visitor gets.
  {
    const s = await session();
    const statuses = [];
    let accepted = 0, lastRemaining = null;
    for (let i = 0; i < 6; i++) {
      const r = await textSubmit(s, `quota ${i}`);
      statuses.push(r.status);
      if (r.status === 202) { accepted++; lastRemaining = (await r.json()).remaining; }
    }
    record("daily quota admits exactly 3 submissions", accepted === 3,
      `accepted=${accepted} statuses=[${statuses}] lastRemaining=${lastRemaining}`);
  }

  // ---------------------------------------------------------------- PROBE 3
  // remaining must never disagree with how many are actually left.
  {
    const s = await session();
    const seen = [];
    for (let i = 0; i < 4; i++) {
      const r = await textSubmit(s, `rem ${i}`);
      seen.push(r.status === 202 ? (await r.json()).remaining : `HTTP${r.status}`);
    }
    record("remaining counter counts down truthfully (2,1,0 then refusal)",
      JSON.stringify(seen) === JSON.stringify([2, 1, 0, "HTTP429"]),
      `observed ${JSON.stringify(seen)}`);
  }

  // ---------------------------------------------------------------- PROBE 4
  // Quota must be atomic under concurrency, not just sequentially.
  {
    const s = await session();
    const rs = await Promise.all(Array.from({ length: 8 }, (_, i) => textSubmit(s, `race ${i}`)));
    const ok = rs.filter((r) => r.status === 202).length;
    record("concurrent burst cannot overrun the 3/day quota", ok <= 3,
      `${ok} of 8 parallel submits accepted`);
  }

  // ---------------------------------------------------------------- PROBE 5
  // A second visitor must not be able to read another visitor's job status.
  {
    const a = await session();
    const r = await textSubmit(a, "owner");
    const { submitId } = await r.json();
    const b = await session();
    const cross = await fetch(`${BASE}/api/submit/status/${submitId}`, { headers: H(b) });
    record("cross-visitor status lookup is refused", cross.status === 403 || cross.status === 404,
      `HTTP ${cross.status}`);
  }

  // ---------------------------------------------------------------- PROBE 6
  // CSRF must be enforced; a missing/padded token must not pass.
  {
    const s = await session();
    const noToken = await fetch(`${BASE}/api/submit`, {
      method: "POST",
      headers: { "user-agent": UA, cookie: s.cookie, "content-type": "application/json" },
      body: JSON.stringify({ text: "x" }),
    });
    const wrong = await fetch(`${BASE}/api/submit`, {
      method: "POST",
      headers: H({ ...s, csrfToken: "x".repeat(43) }, { "content-type": "application/json" }),
      body: JSON.stringify({ text: "x" }),
    });
    record("CSRF rejects missing and forged tokens",
      noToken.status === 403 && wrong.status === 403,
      `missing=${noToken.status} forged=${wrong.status}`);
  }

  // ---------------------------------------------------------------- PROBE 7
  // Cross-site Origin must be refused.
  {
    const s = await session();
    const r = await fetch(`${BASE}/api/submit`, {
      method: "POST",
      headers: H(s, { "content-type": "application/json", origin: "https://evil.example" }),
      body: JSON.stringify({ text: "x" }),
    });
    record("foreign Origin header is refused", r.status === 403, `HTTP ${r.status}`);
  }

  // ---------------------------------------------------------------- PROBE 8
  // /api/submit/file/:id path traversal attempt via submitId.
  {
    const s = await session();
    const r = await fetch(`${BASE}/api/submit/file/${encodeURIComponent("../../../../etc/passwd")}`,
      { headers: H(s) });
    record("traversal submitId cannot escape the output dir",
      r.status === 404 || r.status === 403, `HTTP ${r.status}`);
  }

  // ---------------------------------------------------------------- PROBE 9
  // Text submissions: the empty-string and oversize boundaries.
  {
    const s = await session();
    const empty = await textSubmit(s, "");
    const whitespace = await textSubmit(s, "   ");
    record("empty text is refused with 400", empty.status === 400, `empty=${empty.status}`);
    record("whitespace-only text is treated as content (informational)",
      true, `whitespace-only -> HTTP ${whitespace.status}`);
  }

  // --------------------------------------------------------------- PROBE 10
  // multipart: metadata/filename mismatch must be refused and leave no bytes.
  {
    const s = await session();
    const name = stamped("mismatch");
    const form = new FormData();
    form.append("file", new File([new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d])], name,
      { type: "application/pdf" }));
    form.append("metadata", JSON.stringify(intent(stamped("other"))));
    const r = await fetch(`${BASE}/api/submit`, { method: "POST", headers: H(s), body: form });
    const inputDir = path.join(tempDir, "runtime", "upload", "input", "pdf");
    const left = await fs.readdir(inputDir).catch(() => []);
    record("uploadName/filename mismatch refused and temp bytes removed",
      r.status === 400 && left.length === 0, `HTTP ${r.status}, leftover=${JSON.stringify(left)}`);
  }

  // --------------------------------------------------------------- PROBE 11
  // Health must not leak the parser/db paths.
  {
    const h = await (await fetch(`${BASE}/healthz`)).json();
    record("healthz leaks no filesystem path",
      !JSON.stringify(h).includes("/"), JSON.stringify(h));
  }

  // --------------------------------------------------------------- PROBE 12
  // A bot UA must be refused on /api but /csrf-token is outside that gate.
  {
    const botToken = await fetch(`${BASE}/csrf-token`, { headers: { "user-agent": "curl/8.0" } });
    const s = await session();
    const botApi = await fetch(`${BASE}/api/submit`, {
      method: "POST",
      headers: { ...H(s), "user-agent": "curl/8.0", "content-type": "application/json" },
      body: JSON.stringify({ text: "x" }),
    });
    record("bot UA refused on /api", botApi.status === 403, `HTTP ${botApi.status}`);
    record("/csrf-token is reachable by a bot UA (informational)", true,
      `HTTP ${botToken.status} — identity mint is outside headerCheck`);
  }

  // --------------------------------------------------------------- PROBE 13
  // Oversize JSON body must be 413, not 500.
  {
    const s = await session();
    const r = await fetch(`${BASE}/api/submit`, {
      method: "POST",
      headers: H(s, { "content-type": "application/json" }),
      body: JSON.stringify({ text: "a".repeat(2 * 1024 * 1024) }),
    });
    record("oversize JSON body answers 413", r.status === 413, `HTTP ${r.status}`);
  }

  // --------------------------------------------------------------- PROBE 14
  // Text below MAX_TEXT_INPUT_CHARS must survive the JSON body parser.
  // text-limit-probe.mjs covers the limit boundary itself, ASCII and Myanmar.
  {
    const s = await session();
    const r = await fetch(`${BASE}/api/submit`, {
      method: "POST",
      headers: H(s, { "content-type": "application/json" }),
      body: JSON.stringify({ text: "a".repeat(900_000) }),
    });
    record("text under MAX_TEXT_INPUT_CHARS reaches the route",
      r.status === 202 || r.status === 429,
      `900k chars -> HTTP ${r.status}`);
  }

  // --------------------------------------------------------------- PROBE 15
  // Does an unauthenticated POST still burn the upload rate limit / capacity?
  {
    const r = await fetch(`${BASE}/api/submit`, {
      method: "POST",
      headers: { "user-agent": UA, "content-type": "application/json" },
      body: JSON.stringify({ text: "x" }),
    });
    record("unauthenticated submit is refused before any body work",
      r.status === 403, `HTTP ${r.status}`);
  }

  const bugs = results.filter((r) => !r.ok);
  console.log(`\n${results.length - bugs.length}/${results.length} probes clean, ${bugs.length} flagged`);
  if (bugs.length) console.log(bugs.map((b) => ` - ${b.name}: ${b.detail}`).join("\n"));
}

try {
  await main();
} catch (e) {
  console.error("probe harness error:", e);
  console.error(output.slice(-4000));
} finally {
  if (child?.exitCode === null) {
    child.kill("SIGTERM");
    await new Promise((r) => child.once("exit", r));
  }
  if (tempDir) await fs.rm(tempDir, { recursive: true, force: true });
}
