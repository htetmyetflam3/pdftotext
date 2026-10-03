// Exercises the DEV_BYPASS_* / ALLOW_AGENT_UPLOAD matrix.
//
// Two things are checked per configuration:
//   1. Which session STORE is in use. schema.sql deliberately omits `sessions`
//      (SqliteSessionStore creates it on first run), so "does the sessions
//      table exist in a fresh DB file" is an exact detector for SQLite vs
//      MemoryStore.
//   2. Whether an upload actually completes end to end.
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const Database = require("better-sqlite3");

let port = 3360;

async function run(label, env, { ua = "Mozilla/5.0 (probe)", uploads = 1 } = {}) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "linga-bypass-"));
  const dbFile = path.join(tempDir, "site.db");
  const PORT = port++;
  const BASE = `http://127.0.0.1:${PORT}`;
  let output = "";

  const child = spawn(process.execPath, ["index.js"], {
    cwd: process.cwd(),
    env: {
      ...process.env, PORT: String(PORT), HOST: "127.0.0.1",
      DB_FILE: dbFile, PARSER_RUNTIME_DIR: path.join(tempDir, "runtime"),
      COOKIE_SECRET: "bypass-cookie-secret-at-least-32-characters",
      SESSION_SECRET: "bypass-session-secret-at-least-32-characters",
      TRUST_PROXY: "", EDGE_SECRET: "", REQUIRE_MM_COUNTRY: "false",
      DEV_BYPASS_SESSION: "", ALLOW_AGENT_UPLOAD: "", DEV_BYPASS_QUOTA: "",
      DEV_BYPASS_HEADER: "", DEV_BYPASS_IP: "", DAILY_UPLOAD_LIMIT: "",
      ...env,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", (c) => { output += c; });
  child.stderr.on("data", (c) => { output += c; });

  const deadline = Date.now() + 20_000;
  let up = false;
  while (Date.now() < deadline && !up) {
    if (child.exitCode !== null) break;
    try { if ((await fetch(`${BASE}/healthz`)).ok) up = true; } catch {}
    if (!up) await new Promise((r) => setTimeout(r, 100));
  }

  let store = "?", upload = "?";
  if (up) {
    try {
      const tok = await fetch(`${BASE}/csrf-token`, { headers: { "user-agent": ua } });
      const { csrfToken } = await tok.json();
      const cookie = tok.headers.getSetCookie().map((v) => v.split(";", 1)[0]).join("; ");
      let jar = cookie;
      const codes = [];
      for (let i = 0; i < uploads; i++) {
        const res = await fetch(`${BASE}/api/submit`, {
          method: "POST",
          headers: { "user-agent": ua, "x-csrf-token": csrfToken, cookie: jar,
            "content-type": "application/json" },
          body: JSON.stringify({ text: `bypass probe ${i}` }),
        });
        const set = res.headers.getSetCookie();
        if (set.length) {
          const fresh = set.map((v) => v.split(";", 1)[0]).join("; ");
          jar = [...new Map([...jar.split("; "), ...fresh.split("; ")]
            .map((c) => [c.split("=")[0], c])).values()].join("; ");
        }
        const body = await res.json().catch(() => ({}));
        codes.push(res.status === 202 ? `202(rem ${body.remaining})` : `${res.status}`);
      }
      upload = codes.join(" ");
    } catch (e) { upload = `threw: ${e.message}`; }

    const db = new Database(dbFile, { readonly: true });
    const hasSessions = db
      .prepare("SELECT count(*) n FROM sqlite_master WHERE type='table' AND name='sessions'")
      .get().n > 0;
    const users = db.prepare("SELECT count(*) n FROM users").get().n;
    db.close();
    store = `${hasSessions ? "SQLite" : "Memory"}/u${users}`;
  } else {
    store = "boot failed";
    upload = output.split("\n").find((l) => /Error/.test(l))?.slice(0, 50) || "n/a";
  }

  const banner = (output.match(/\[devbypass\][^\n]*/g) || []).length ? "yes" : "no";
  console.log(
    `${label.padEnd(46)} ${store.padEnd(11)} ${banner.padEnd(7)} ${upload}`,
  );

  if (child.exitCode === null) {
    child.kill("SIGTERM");
    await new Promise((r) => child.once("exit", r));
  }
  await fs.rm(tempDir, { recursive: true, force: true });
}

console.log(`${"configuration".padEnd(46)} ${"store".padEnd(11)} ${"banner".padEnd(7)} uploads`);
console.log("-".repeat(100));

const LOOPBACK = "127.0.0.1";
const ALL = { ALLOW_AGENT_UPLOAD: "true", DEV_BYPASS_SESSION: "true",
  DEV_BYPASS_HEADER: "true", DEV_BYPASS_QUOTA: "true", DEV_BYPASS_IP: LOOPBACK };

await run("production, no flags (shipped default)", { MODE: "production" }, { uploads: 4 });
await run("production + EVERY flag + IP paired", { MODE: "production", ...ALL }, { uploads: 4 });
await run("production + EVERY flag, bot UA", { MODE: "production", ...ALL }, { ua: "curl/8.0" });
await run("MODE unset + EVERY flag + IP paired", { MODE: undefined, ...ALL }, { uploads: 4 });
await run("MODE=prod (typo) + EVERY flag + IP", { MODE: "prod", ...ALL }, { uploads: 4 });
console.log("-".repeat(104));
await run("production + DAILY_UPLOAD_LIMIT=0 (no flags)", { MODE: "production", DAILY_UPLOAD_LIMIT: "0" }, { uploads: 6 });
await run("production + DAILY_UPLOAD_LIMIT=5 (no flags)", { MODE: "production", DAILY_UPLOAD_LIMIT: "5" }, { uploads: 6 });
console.log("-".repeat(104));
await run("dev + only DEV_BYPASS_IP (pairs, grants nothing)", { MODE: "development", DEV_BYPASS_IP: LOOPBACK }, { uploads: 4 });
await run("dev + ALLOW_AGENT_UPLOAD, no IP paired", { MODE: "development", ALLOW_AGENT_UPLOAD: "true" }, { ua: "curl/8.0" });
await run("dev + ALLOW_AGENT_UPLOAD, IP mismatch", { MODE: "development", ALLOW_AGENT_UPLOAD: "true", DEV_BYPASS_IP: "203.0.113.9" }, { ua: "curl/8.0" });
await run("dev + ALLOW_AGENT_UPLOAD + IP (quota ON)", { MODE: "development", ALLOW_AGENT_UPLOAD: "true", DEV_BYPASS_IP: LOOPBACK }, { ua: "curl/8.0", uploads: 4 });
await run("dev + AGENT + IP + DEV_BYPASS_QUOTA", { MODE: "development", ALLOW_AGENT_UPLOAD: "true", DEV_BYPASS_IP: LOOPBACK, DEV_BYPASS_QUOTA: "true" }, { ua: "curl/8.0", uploads: 4 });
await run("dev + DEV_BYPASS_SESSION + IP (quota ON)", { MODE: "development", DEV_BYPASS_SESSION: "true", DEV_BYPASS_IP: LOOPBACK }, { ua: "curl/8.0", uploads: 4 });
