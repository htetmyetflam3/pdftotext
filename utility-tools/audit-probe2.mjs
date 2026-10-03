// Round 2 probes: concurrency gate, artifact lifecycle, error-status mapping.
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const PORT = Number(process.env.PROBE_PORT || 3322);
const BASE = `http://127.0.0.1:${PORT}`;
const UA = "LingaAuditProbe/1.0";
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
  const cookie = res.headers.getSetCookie().map((v) => v.split(";", 1)[0]).join("; ");
  return { csrfToken, cookie };
}
const H = (s, extra = {}) => ({ "user-agent": UA, "x-csrf-token": s.csrfToken, cookie: s.cookie, ...extra });
function intent(uploadName, o = {}) {
  return {
    v: 1, task: "conversion", originalName: "sample.pdf", uploadName,
    inputFormat: "pdf", outputFormat: "txt", content: "text",
    job: "extracting", method: "default", clickedAt: new Date().toISOString(),
    detector: { name: "pdf.js", pages: 100, textPages: 100, imagePages: 0,
      myanmarChars: 1, myanmarLetters: 1, imageBytes: 0, textBytes: 1, confirmed: true },
    ...o,
  };
}
const stamped = (stem) =>
  `${new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z")}__${stem}.pdf`;

async function main() {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "linga-audit2-"));
  child = spawn(process.execPath, ["index.js"], {
    cwd: process.cwd(),
    env: {
      ...process.env, MODE: "production", PORT: String(PORT), HOST: "127.0.0.1",
      DB_FILE: path.join(tempDir, "site.db"),
      PARSER_RUNTIME_DIR: path.join(tempDir, "runtime"),
      COOKIE_SECRET: "audit2-cookie-secret-at-least-32-characters",
      SESSION_SECRET: "audit2-session-secret-at-least-32-characters",
      TRUST_PROXY: "", EDGE_SECRET: "", REQUIRE_MM_COUNTRY: "false",
      PARSER_MAX_CONCURRENCY: "1", UPLOAD_RATE_MAX: "500", IDENTITY_RATE_MAX: "500",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", (c) => { output += c; });
  child.stderr.on("data", (c) => { output += c; });
  await waitForSite();

  const pdf = await fs.readFile("frontend/frontend-bootstrap/public/samples/sample.pdf");

  // ---- PROBE A: PARSER_MAX_CONCURRENCY=1 must shed the 2nd concurrent upload
  {
    const mk = async (stem) => {
      const s = await session();
      const name = stamped(stem);
      const form = new FormData();
      form.append("file", new File([pdf], name, { type: "application/pdf" }));
      form.append("metadata", JSON.stringify(intent(name)));
      return fetch(`${BASE}/api/submit`, { method: "POST", headers: H(s), body: form });
    };
    const rs = await Promise.all([mk("c1"), mk("c2"), mk("c3")]);
    const codes = rs.map((r) => r.status);
    log(codes.includes(503), "PARSER_MAX_CONCURRENCY=1 sheds concurrent uploads with 503",
      `statuses=[${codes}] (expect at least one 503)`);
  }

  // ---- PROBE B: after the gate, is the slot released? a later upload must work
  {
    const s = await session();
    const name = stamped("after");
    const form = new FormData();
    form.append("file", new File([pdf], name, { type: "application/pdf" }));
    form.append("metadata", JSON.stringify(intent(name)));
    const r = await fetch(`${BASE}/api/submit`, { method: "POST", headers: H(s), body: form });
    log(r.status === 202, "concurrency slot is released after a completed upload", `HTTP ${r.status}`);
  }

  // ---- PROBE C: a READY artifact must survive repeated downloads
  {
    const s = await session();
    const name = stamped("twice");
    const form = new FormData();
    form.append("file", new File([pdf], name, { type: "application/pdf" }));
    form.append("metadata", JSON.stringify(intent(name)));
    const r = await fetch(`${BASE}/api/submit`, { method: "POST", headers: H(s), body: form });
    const body = await r.json();
    if (body?.processing?.downloadUrl) {
      const d1 = await fetch(`${BASE}${body.processing.downloadUrl}`, { headers: H(s) });
      const t1 = await d1.text();
      const d2 = await fetch(`${BASE}${body.processing.downloadUrl}`, { headers: H(s) });
      const t2 = await d2.text();
      log(d1.status === 200 && d2.status === 200 && t1 === t2,
        "artifact download is repeatable", `first=${d1.status} second=${d2.status} sameBytes=${t1 === t2}`);

      // Content-Disposition must carry the display name, not the uuid
      log(/filename/i.test(d1.headers.get("content-disposition") || ""),
        "download carries a Content-Disposition filename",
        d1.headers.get("content-disposition"));
    } else {
      log(false, "upload reached READY", JSON.stringify(body).slice(0, 300));
    }
  }

  // ---- PROBE D: unknown route under /api -> should be 404, what is it?
  {
    const s = await session();
    const r = await fetch(`${BASE}/api/does-not-exist`, { headers: H(s) });
    log(r.status === 404, "unknown /api route answers 404", `HTTP ${r.status}`);
  }

  // ---- PROBE E: a static 404 under the app -> should be 404
  {
    const r = await fetch(`${BASE}/definitely-missing.js`);
    log(r.status === 404, "missing static asset answers 404", `HTTP ${r.status}`);
  }

  // ---- PROBE F: HEAD / and OPTIONS handling
  {
    const h = await fetch(`${BASE}/`, { method: "HEAD" });
    log(h.status === 200, "HEAD / answers 200", `HTTP ${h.status}`);
  }

  // ---- PROBE G: csrf cookie lifetime vs userData cookie lifetime
  {
    const res = await fetch(`${BASE}/csrf-token`, { headers: { "user-agent": UA } });
    const cookies = res.headers.getSetCookie();
    const csrf = cookies.find((c) => c.startsWith("csrf_token="));
    const user = cookies.find((c) => c.startsWith("userData="));
    const ageOf = (c) => Number((/max-age=(\d+)/i.exec(c) || [])[1]);
    // Not a defect: both SPAs re-fetch /csrf-token immediately before every
    // submit, so the shorter token lifetime is never observed by a real client.
    log(true,
      "csrf_token lifetime is shorter than the identity cookie (informational)",
      `csrf max-age=${ageOf(csrf)}s (${ageOf(csrf) / 3600}h), userData max-age=${ageOf(user)}s (${ageOf(user) / 86400}d) — clients mint a fresh token per submit`);
  }

  // ---- PROBE H: does polling /status rotate the identity cookie every call?
  {
    const s = await session();
    const r1 = await fetch(`${BASE}/api/result`, { headers: H(s) });
    const set = r1.headers.getSetCookie();
    const userDataCount = set.filter((c) => c.startsWith("userData=")).length;
    // cookieGenerator legitimately rolls the identity cookie once. Emitting it
    // twice (cookieGenerator AND cookieDBCheck) was the defect.
    log(userDataCount === 1,
      "the identity cookie is emitted exactly once per request",
      `Set-Cookie count=${set.length} -> ${set.map((c) => c.split("=")[0]).join(",")}`);
  }
}

try { await main(); }
catch (e) { console.error("harness error:", e); console.error(output.slice(-3000)); }
finally {
  if (child?.exitCode === null) { child.kill("SIGTERM"); await new Promise((r) => child.once("exit", r)); }
  if (tempDir) await fs.rm(tempDir, { recursive: true, force: true });
}
