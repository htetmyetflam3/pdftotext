// How far does "a new session is a new quota" actually go, from one IP,
// with the limits the shipped .env sets? Quantifies the intentional
// allowance and finds what the real binding constraint is.
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const Database = require("better-sqlite3");

const PORT = 3366;
const BASE = `http://127.0.0.1:${PORT}`;
const UA = "Mozilla/5.0 (X11; Linux x86_64) Chrome/140 Safari/537.36";
let child, tempDir, output = "";

async function waitForSite() {
  const deadline = Date.now() + 25_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`exited:\n${output}`);
    try { if ((await fetch(`${BASE}/healthz`)).ok) return; } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`never healthy:\n${output}`);
}

try {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "linga-cycle-"));
  const dbFile = path.join(tempDir, "site.db");
  child = spawn(process.execPath, ["index.js"], {
    cwd: process.cwd(),
    env: {
      ...process.env, MODE: "production", PORT: String(PORT), HOST: "127.0.0.1",
      DB_FILE: dbFile, PARSER_RUNTIME_DIR: path.join(tempDir, "runtime"),
      COOKIE_SECRET: "cycle-cookie-secret-at-least-32-characters",
      SESSION_SECRET: "cycle-session-secret-at-least-32-characters",
      TRUST_PROXY: "", EDGE_SECRET: "", REQUIRE_MM_COUNTRY: "false",
      // the values the shipped .env carries
      IDENTITY_RATE_MAX: "20", IDENTITY_RATE_WINDOW_MINUTES: "60",
      UPLOAD_RATE_MAX: "20", UPLOAD_RATE_WINDOW_MINUTES: "60",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", (c) => { output += c; });
  child.stderr.on("data", (c) => { output += c; });
  await waitForSite();

  let identities = 0, accepted = 0, quota429 = 0, rate429 = 0, identityBlocked = 0;

  // One attacker, one IP, cycling cookies as fast as it can.
  for (let session = 0; session < 40; session++) {
    const tok = await fetch(`${BASE}/csrf-token`, { headers: { "user-agent": UA } });
    if (tok.status !== 200) { identityBlocked++; continue; }
    identities++;
    const { csrfToken } = await tok.json();
    const cookie = tok.headers.getSetCookie().map((v) => v.split(";", 1)[0]).join("; ");

    for (let i = 0; i < 4; i++) {           // try to exceed 3 on each identity
      const res = await fetch(`${BASE}/api/submit`, {
        method: "POST",
        headers: { "user-agent": UA, "x-csrf-token": csrfToken, cookie,
          "content-type": "application/json" },
        body: JSON.stringify({ text: `cycle ${session}-${i}` }),
      });
      if (res.status === 202) accepted++;
      else {
        const body = await res.json().catch(() => ({}));
        if (/Quota/i.test(body.error || "")) quota429++; else rate429++;
      }
    }
  }

  const db = new Database(dbFile, { readonly: true });
  const users = db.prepare("SELECT count(*) n FROM users").get().n;
  const subs = db.prepare("SELECT count(*) n FROM submissions").get().n;
  const maxUsed = db.prepare("SELECT max(daily_quota_used) m FROM users").get().m;
  db.close();

  console.log("one IP, cycling fresh cookies, shipped .env limits (20/hr each)");
  console.log("-".repeat(66));
  console.log(`  identities minted            ${identities}`);
  console.log(`  /csrf-token refused          ${identityBlocked}  (identity rate limit)`);
  console.log(`  uploads ACCEPTED             ${accepted}`);
  console.log(`  refused by per-visitor quota ${quota429}`);
  console.log(`  refused by per-IP rate limit ${rate429}`);
  console.log(`  users rows created           ${users}`);
  console.log(`  submissions stored           ${subs}`);
  console.log(`  max daily_quota_used on any  ${maxUsed}  (per-visitor cap held)`);
  console.log("-".repeat(66));
  console.log(`  binding constraint: ${accepted <= 20 ? "the per-IP UPLOAD_RATE_MAX" : "none — quota cycling won"}`);
} catch (e) {
  console.error("harness error:", e); console.error(output.slice(-2000));
} finally {
  if (child?.exitCode === null) { child.kill("SIGTERM"); await new Promise((r) => child.once("exit", r)); }
  if (tempDir) await fs.rm(tempDir, { recursive: true, force: true });
}
