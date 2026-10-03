import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const PORT = 3210;
const BASE = `http://127.0.0.1:${PORT}`;
let child;
let tempDir;
let output = "";

async function waitForSite() {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`site exited before health check:\n${output}`);
    }
    try {
      const response = await fetch(`${BASE}/healthz`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`site did not become healthy:\n${output}`);
}

async function browserSession() {
  const response = await fetch(`${BASE}/csrf-token`, {
    headers: { "user-agent": "LingaPreproductionTest/1.0" },
  });
  assert.equal(response.status, 200);
  const { csrfToken } = await response.json();
  assert.match(csrfToken, /^[A-Za-z0-9_-]{43}$/);
  const setCookies = response.headers.getSetCookie();
  assert.ok(setCookies.some((value) => /^userData=.*HttpOnly/i.test(value)));
  const cookie = setCookies
    .map((value) => value.split(";", 1)[0])
    .join("; ");
  return { csrfToken, cookie };
}

function uploadIntent(uploadName, overrides = {}) {
  // Mirrors buildPayload() in both SPAs. #46 reshaped this contract —
  // task -> derived from source, inputFormat -> fileFormat,
  // outputFormat -> conversion + desired — but this fixture kept the old
  // field names, so every multipart case was rejected with 400 before it
  // reached the parser. It went unnoticed because test:chain was not part
  // of `npm test`.
  return {
    v: 1,
    source: "converter",
    content: "text",
    job: "extracting",
    method: "default",
    originalName: "sample.pdf",
    uploadName,
    clickedAt: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
    fileFormat: "pdf",
    conversion: "txt",
    desired: "txt",
    detector: {
      name: "pdf.js",
      pages: 100,
      textPages: 100,
      imagePages: 0,
      myanmarChars: 1,
      myanmarLetters: 1,
      imageBytes: 0,
      textBytes: 1,
      confirmed: true,
    },
    ...overrides,
  };
}


function timestampedName(stem = "sample", ext = "pdf") {
  const stamp = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
  return `${stamp}__${stem}.${ext}`;
}

before(async () => {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "linga-site-chain-"));
  child = spawn(process.execPath, ["index.js"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      MODE: "production",
      PORT: String(PORT),
      HOST: "127.0.0.1",
      DB_FILE: path.join(tempDir, "site.db"),
      PARSER_RUNTIME_DIR: path.join(tempDir, "runtime"),
      COOKIE_SECRET: "chain-cookie-secret-at-least-32-characters",
      SESSION_SECRET: "chain-session-secret-at-least-32-characters",
      TRUST_PROXY: "",
      EDGE_SECRET: "",
      REQUIRE_MM_COUNTRY: "false",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", (chunk) => { output += chunk; });
  child.stderr.on("data", (chunk) => { output += chunk; });
  await waitForSite();
});

after(async () => {
  if (child?.exitCode === null) {
    child.kill("SIGTERM");
    await new Promise((resolve) => child.once("exit", resolve));
  }
  if (tempDir) await fs.rm(tempDir, { recursive: true, force: true });
});

test("preproduction health reports parser-only topology", async () => {
  const response = await fetch(`${BASE}/healthz`);
  assert.equal(response.status, 200);
  const health = await response.json();
  assert.equal(health.ok, true);
  assert.equal(health.parser, "ready");
  assert.equal(health.engine, "not-wired");
  assert.equal(health.cloudflare, "not-wired");
});

test("serves both built frontends", async () => {
  const bootstrap = await fetch(`${BASE}/`);
  assert.equal(bootstrap.status, 200);
  const csp = bootstrap.headers.get("content-security-policy") || "";
  assert.match(csp, /default-src 'self'/);
  assert.doesNotMatch(csp, /unsafe-eval/);
  assert.match(await bootstrap.text(), /AKKHARA/);

  const react = await fetch(`${BASE}/react/`);
  assert.equal(react.status, 200);
  assert.match(await react.text(), /AKKHARA/);
});

test("production CSRF + cookie chain accepts a Site-only text submit", async () => {
  const tokenResponse = await fetch(`${BASE}/csrf-token`, {
    headers: { "user-agent": "LingaPreproductionTest/1.0" },
  });
  assert.equal(tokenResponse.status, 200);
  const { csrfToken } = await tokenResponse.json();
  const setCookies = tokenResponse.headers.getSetCookie();
  const cookie = setCookies.map((value) => value.split(";", 1)[0]).join("; ");
  assert.match(cookie, /userData=/);
  assert.match(cookie, /csrf_token=/);

  const response = await fetch(`${BASE}/api/submit`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "user-agent": "LingaPreproductionTest/1.0",
      "x-csrf-token": csrfToken,
      cookie,
    },
    body: JSON.stringify({ text: "မြန်မာစာ parser preproduction test" }),
  });
  assert.equal(response.status, 202);
  const body = await response.json();
  assert.equal(body.status, "FINISHED");
  assert.ok(body.formId);
  assert.ok(body.submitId);
  assert.equal(Object.hasOwn(body, "engine"), false);
});

test("real multipart PDF reaches parser artifact and authenticated download", async () => {
  const { csrfToken, cookie } = await browserSession();
  const uploadName = timestampedName();
  const source = await fs.readFile(
    path.join(process.cwd(), "frontend/frontend-bootstrap/public/samples/sample.pdf"),
  );
  const form = new FormData();
  form.append("file", new File([source], uploadName, { type: "application/pdf" }));
  form.append("metadata", JSON.stringify(uploadIntent(uploadName)));

  const response = await fetch(`${BASE}/api/submit`, {
    method: "POST",
    headers: {
      "user-agent": "LingaPreproductionTest/1.0",
      "x-csrf-token": csrfToken,
      cookie,
    },
    body: form,
  });
  assert.equal(response.status, 202, `${await response.clone().text()}\n${output}`);
  const body = await response.json();
  assert.equal(body.status, "FINISHED");
  assert.equal(body.processing.state, "FINISHED");
  assert.match(body.processing.downloadUrl, /^\/api\/submit\/file\//);
  assert.equal(Object.hasOwn(body, "text"), false);

  const download = await fetch(`${BASE}${body.processing.downloadUrl}`, {
    headers: {
      "user-agent": "LingaPreproductionTest/1.0",
      "x-csrf-token": csrfToken,
      cookie,
    },
  });
  assert.equal(download.status, 200, `${await download.clone().text()}\n${output}`);
  assert.match(download.headers.get("content-disposition") || "", /\.txt/);
  const artifact = await download.text();
  assert.match(artifact, /Chapter/);
  assert.ok(artifact.length > 80_000);

  const other = await browserSession();
  const forbidden = await fetch(`${BASE}${body.processing.downloadUrl}`, {
    headers: {
      "user-agent": "LingaPreproductionTest/1.0",
      "x-csrf-token": other.csrfToken,
      cookie: other.cookie,
    },
  });
  assert.equal(forbidden.status, 403);

  const runtime = path.join(tempDir, "runtime");
  const quarantine = await fs.readdir(path.join(runtime, "upload", "quarantine"));
  const input = [
    ...(await fs.readdir(path.join(runtime, "upload", "input", "pdf"))),
    ...(await fs.readdir(path.join(runtime, "upload", "input", "docx"))),
  ];
  const originals = await fs.readdir(path.join(runtime, ".output", "original"));
  assert.deepEqual(quarantine, []);
  assert.deepEqual(input, []);
  assert.equal(originals.length, 1);
});

test("conversion with outputFormat docx actually produces a .docx output file", async () => {
  const { csrfToken, cookie } = await browserSession();
  const uploadName = timestampedName("todocx");
  const source = await fs.readFile(
    path.join(process.cwd(), "frontend/frontend-bootstrap/public/samples/sample.pdf"),
  );
  const form = new FormData();
  form.append("file", new File([source], uploadName, { type: "application/pdf" }));
  form.append("metadata", JSON.stringify(uploadIntent(uploadName, {
    job: "extracting",
    method: "default",
    conversion: "docx",
    desired: "docx",
  })));

  const response = await fetch(`${BASE}/api/submit`, {
    method: "POST",
    headers: {
      "user-agent": "LingaPreproductionTest/1.0",
      "x-csrf-token": csrfToken,
      cookie,
    },
    body: form,
  });
  assert.equal(response.status, 202, `${await response.clone().text()}\n${output}`);
  const body = await response.json();
  assert.equal(body.status, "FINISHED");
  assert.equal(body.processing.state, "FINISHED");
  assert.match(body.processing.finalFilename || "", /\.docx$/);

  // the queue status agrees: a conversion job finished with a docx artifact
  const status = await (
    await fetch(`${BASE}/api/submit/status/${encodeURIComponent(body.submitId)}`, {
      headers: { "user-agent": "LingaPreproductionTest/1.0", "x-csrf-token": csrfToken, cookie },
    })
  ).json();
  assert.equal(status.state, "FINISHED");
  assert.match(status.finalFilename || "", /\.docx$/);

  const download = await fetch(`${BASE}${body.processing.downloadUrl}`, {
    headers: { "user-agent": "LingaPreproductionTest/1.0", "x-csrf-token": csrfToken, cookie },
  });
  assert.equal(download.status, 200, `${await download.clone().text()}\n${output}`);
  assert.match(download.headers.get("content-disposition") || "", /\.docx/);
  const artifact = Buffer.from(await download.arrayBuffer());
  assert.ok(artifact.length > 500, `docx artifact too small: ${artifact.length}`);
  assert.deepEqual(
    artifact.subarray(0, 4),
    Buffer.from([0x50, 0x4b, 0x03, 0x04]),
    "output file is a real DOCX zip package",
  );
});

test("DOCX upload with outputFormat pdf really converts DOCX to PDF", async () => {
  const { csrfToken, cookie } = await browserSession();
  const uploadName = timestampedName("topdf", "docx");

  // A real DOCX package (OPC zip + word/document.xml) built in-test. The
  // signature check, the manager worker and mammoth all see genuine bytes.
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
      "</Types>",
  );
  zip.file(
    "_rels/.rels",
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
      "</Relationships>",
  );
  zip.file(
    "word/document.xml",
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' +
      '<w:p><w:r><w:t>Chapter 1 — DOCX to PDF conversion chain proof.</w:t></w:r></w:p>' +
      '<w:p><w:r><w:t>Second paragraph: the Site manager pipeline writes the PDF bytes.</w:t></w:r></w:p>' +
      "</w:body></w:document>",
  );
  const docxBytes = await zip.generateAsync({
    type: "uint8array",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });

  const form = new FormData();
  form.append(
    "file",
    new File([docxBytes], uploadName, {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    }),
  );
  form.append("metadata", JSON.stringify(
    uploadIntent(uploadName, {
      job: "extracting",
      method: "default",
      originalName: "topdf.docx",
      fileFormat: "docx",
      conversion: "pdf",
      desired: "pdf",
      content: "text",
      detector: {
        name: "mammoth",
        pages: 1,
        textPages: 1,
        imagePages: 0,
        myanmarChars: 0,
        myanmarLetters: 0,
        imageBytes: 0,
        textBytes: 120,
        confirmed: true,
      },
    }),
  ));

  const response = await fetch(`${BASE}/api/submit`, {
    method: "POST",
    headers: {
      "user-agent": "LingaPreproductionTest/1.0",
      "x-csrf-token": csrfToken,
      cookie,
    },
    body: form,
  });
  assert.equal(response.status, 202, `${await response.clone().text()}\n${output}`);
  const body = await response.json();
  assert.equal(body.status, "FINISHED");
  assert.match(body.processing.finalFilename || "", /\.pdf$/);

  const download = await fetch(`${BASE}${body.processing.downloadUrl}`, {
    headers: { "user-agent": "LingaPreproductionTest/1.0", "x-csrf-token": csrfToken, cookie },
  });
  assert.equal(download.status, 200, `${await download.clone().text()}\n${output}`);
  assert.match(download.headers.get("content-disposition") || "", /\.pdf/);
  const artifact = await download.arrayBuffer().then(Buffer.from);
  // PDF.js/render pipeline: real PDF bytes out of a DOCX input
  assert.equal(artifact.subarray(0, 5).toString("latin1"), "%PDF-");
  assert.ok(artifact.includes(Buffer.from("%%EOF")), "PDF trailer missing");
  assert.ok(artifact.length > 300, `pdf artifact too small: ${artifact.length}`);

  // the original DOCX is stored silently (server-generated UUID name) with
  // its bytes untouched; it is never what the download serves
  const runtimeOutput = path.join(tempDir, "runtime", ".output");
  const originals = await fs.readdir(path.join(runtimeOutput, "original"));
  const docxOriginals = await Promise.all(
    originals
      .filter((name) => name.toLowerCase().endsWith(".docx"))
      .map(async (name) => Buffer.from(await fs.readFile(path.join(runtimeOutput, "original", name)))),
  );
  assert.ok(
    docxOriginals.some((bytes) => bytes.equals(Buffer.from(docxBytes))),
    `original DOCX bytes not preserved: ${originals.join(",")}`,
  );
  const status = await (
    await fetch(`${BASE}/api/submit/status/${encodeURIComponent(body.submitId)}`, {
      headers: { "user-agent": "LingaPreproductionTest/1.0", "x-csrf-token": csrfToken, cookie },
    })
  ).json();
  assert.equal(status.state, "FINISHED");
});

test("Engine queue mount: downstream of hidden, still never behind browser gates", async () => {
  // No CSRF token, no cookies, no browser identity — exactly like an Engine
  // call. If the browser gates (scoped to /api/submit since the mount move)
  // intercepted this subtree, the answer would be the CSRF/origin error;
  // instead the Engine queue router itself refuses with its own bare body.
  const response = await fetch(`${BASE}/api/internal/engine/queue`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ formId: "nope", jobToken: "e".repeat(32) }),
  });
  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), { error: "Refused" });
});

test("multipart signature mismatch is rejected and temporary bytes are removed", async () => {
  const { csrfToken, cookie } = await browserSession();
  const uploadName = timestampedName("fake");
  const form = new FormData();
  form.append("file", new File(["not a pdf"], uploadName, { type: "application/pdf" }));
  form.append("metadata", JSON.stringify(uploadIntent(uploadName, {
    originalName: "fake.pdf",
    detector: {
      ...uploadIntent(uploadName).detector,
      pages: 0,
      textPages: 0,
    },
  })));

  const response = await fetch(`${BASE}/api/submit`, {
    method: "POST",
    headers: {
      "user-agent": "LingaPreproductionTest/1.0",
      "x-csrf-token": csrfToken,
      cookie,
    },
    body: form,
  });
  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /signature|truncated/i);
  const input = await fs.readdir(path.join(tempDir, "runtime", "upload", "input", "pdf"));
  const quarantine = await fs.readdir(path.join(tempDir, "runtime", "upload", "quarantine"));
  assert.deepEqual(input, []);
  assert.deepEqual(quarantine, []);
});
