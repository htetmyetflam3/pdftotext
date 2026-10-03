import "dotenv/config";
import crypto from "node:crypto";
import express from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import morgan from "morgan";
import path from "node:path";
import fs from "node:fs";
import multer from "multer";
import { rateLimit, ipKeyGenerator } from "express-rate-limit";
import { db, ensureSchema, closeDb, secureDbFiles } from "./backend/db/db.js";
import { SchemaDriftError } from "./backend/db/migrate.js";
import { createSessionMiddleware } from "./backend/db/session.js";
import { headerCheck } from "./backend/cookie/header.js";
import { cookieGenerator } from "./backend/cookie/cgen.js";
import { cookieDBCheck } from "./backend/cookie/sanitized.js";
import { csrfCheck } from "./backend/cookie/csrf.js";
import { createRequest, dailyLimit } from "./backend/db/request.js";
import {
  createIncomingRouter,
  JSON_BODY_LIMIT_BYTES,
} from "./backend/gateway/api/incoming.js";
import { createHiddenProcessor } from "./backend/gateway/api/hidden.js";
import { createEngineQueueRouter } from "./backend/gateway/api/engineCollect.js";
import {
  engineConfig,
  createEngineDispatcher,
} from "./backend/gateway/generator/engine.js";
import { createProcessingQueue } from "./backend/gateway/queue/processingQueue.js";
import { closePraserManager } from "./backend/file/pdf.js";
import { cleanupExpiredRuntimeFiles } from "./backend/file/runtimeCleanup.js";
import {
  DB_FILE,
  FRONTEND_DIR,
  FRONTEND_REACT_DIR,
  abs,
  inputDirFor,
  ensurePraserDirs,
  validatePraserAssets,
} from "./backend/file/paths.js";
import {
  sessionBypassBanner,
  agentUploadBanner,
  gateBypassBanner,
} from "./backend/cookie/devbypass.js";
import { modeBanner, currentMode } from "./backend/mode.js";
import {
  trustProxyValue,
  trustProxyBanner,
  createEdgeGuard,
  edgeContext,
  cookieSecureEnabled,
  cookieSameSite,
  cookieSecurityBanner,
} from "./backend/gateway/edge.js";
const app = express();
const PORT = Number.parseInt(process.env.PORT || "3000", 10);
const HOST = process.env.HOST || "0.0.0.0";
const FRONTEND = abs(FRONTEND_DIR);
const REACT_FRONTEND = abs(FRONTEND_REACT_DIR);
// The release contract is enforced by the build and chain tests below; README files cannot prove that a generated frontend, parser asset, or download boundary is actually usable.
const ARTIFACT_TTL_MS =
  positiveInteger("ARTIFACT_TTL_HOURS", 24, 720) * 60 * 60 * 1000;
function requiredSecret(name) {
  const value = String(process.env[name] || "");
  if (value.length < 32) {
    throw new Error(`${name} must be set to at least 32 characters`);
  }
  return value;
}
function positiveInteger(name, fallback, maximum = Number.MAX_SAFE_INTEGER) {
  const value = Number.parseInt(process.env[name] || String(fallback), 10);
  if (!Number.isSafeInteger(value) || value < 1 || value > maximum) {
    throw new Error(`${name} must be an integer from 1 to ${maximum}`);
  }
  return value;
}
function createConcurrencyGate(maximum) {
  let active = 0;
  return function concurrencyGate(_req, res, next) {
    if (active >= maximum) {
      res.set("Retry-After", "5");
      return res.status(503).json({ error: "Upload service is busy; retry shortly" });
    }
    active += 1;
    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      active = Math.max(0, active - 1);
    };
    res.once("finish", release);
    res.once("close", release);
    return next();
  };
}
const cookieSecret = requiredSecret("COOKIE_SECRET");
const sessionSecret = requiredSecret("SESSION_SECRET");
if (cookieSecret === sessionSecret) {
  throw new Error("COOKIE_SECRET and SESSION_SECRET must be different values");
}
validatePraserAssets();
ensurePraserDirs();
const runArtifactCleanup = () =>
  cleanupExpiredRuntimeFiles({ maxAgeMs: ARTIFACT_TTL_MS })
    .then((removed) => {
      if (removed) console.log(`[cleanup] removed ${removed} expired runtime artifact(s)`);
    })
    .catch((error) => console.error("[cleanup] runtime artifact cleanup failed", error));
runArtifactCleanup();
const cleanupTimer = setInterval(runArtifactCleanup, 60 * 60 * 1000);
cleanupTimer.unref();

// Both SPAs are routed below, so both are boot-critical. Checking only the
// Bootstrap index let `npm run build:bootstrap` (which empties frontend/dist,
// the parent of frontend/dist/react) leave a server that starts happily and
// then answers /react/ with a 500.
const frontendIndex = path.join(FRONTEND, "index.html");
const reactIndex = path.join(REACT_FRONTEND, "index.html");
for (const [label, file] of [
  ["Bootstrap frontend", frontendIndex],
  ["React frontend", reactIndex],
]) {
  if (!fs.existsSync(file)) {
    throw new Error(
      `${label} is missing at ${file}. Run "npm run build" before "npm start".`,
    );
  }
}
const modeLine = modeBanner();
if (modeLine) console.log(modeLine);
for (const line of [
  sessionBypassBanner(),
  agentUploadBanner(),
  gateBypassBanner(),
  cookieSecurityBanner(),
]) {
  if (line) console.log(line);
}
const TRUST_PROXY = trustProxyValue();
if (TRUST_PROXY !== false) app.set("trust proxy", TRUST_PROXY);
const proxyBanner = trustProxyBanner();
if (proxyBanner) console.log(proxyBanner);

// Validate DAILY_UPLOAD_LIMIT at boot, not on the first upload.
const DAILY_UPLOAD_LIMIT = dailyLimit();
console.log(
  DAILY_UPLOAD_LIMIT === 0
    ? "[quota] DAILY_UPLOAD_LIMIT=0 — no per-visitor daily limit. " +
      `Uploads stay bounded by UPLOAD_RATE_MAX per IP and PARSER_MAX_CONCURRENCY.`
    : `[quota] ${DAILY_UPLOAD_LIMIT} uploads per visitor per day.`,
);
console.log(`[db] sqlite ${abs(DB_FILE)} — applying schema`);
try {
  ensureSchema();
} catch (error) {
  // A drifted or conflicting database used to surface as a raw SqliteError
  // stack from CREATE INDEX. Every other boot-critical asset in this file
  // fails with an actionable message; the database now does too.
  if (error instanceof SchemaDriftError) {
    throw new Error(`Cannot open ${abs(DB_FILE)}.\n${error.message}`, { cause: error });
  }
  throw error;
}
secureDbFiles();

const engineCfg = engineConfig();
const engineDispatcher = createEngineDispatcher({
  jobUrl: engineCfg.jobUrl,
  key: engineCfg.siteToEngineKey,
  acceptTimeoutMs: engineCfg.acceptTimeoutMs,
});
const request = createRequest({ db });
const processingQueue = createProcessingQueue({
  metadataStore: request,
  ttlMs: ARTIFACT_TTL_MS,
});
const hiddenProcessor = createHiddenProcessor({
  queue: processingQueue,
  dispatcher: engineDispatcher,
  jobTimeoutMs: engineCfg.jobTimeoutMs,
});

// Log to stdout/stderr for the deployment supervisor. Unbounded request/SQL
// files let unauthenticated traffic exhaust local disk and can retain identity
// metadata, so the production entry never appends them itself.app.use(morgan(currentMode() === "production" ? "combined" : "dev"));
app.use(createEdgeGuard());
app.use(edgeContext);
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://cdn.jsdelivr.net",
          "https://fonts.googleapis.com",
        ],
        fontSrc: [
          "'self'",
          "data:",
          "https://cdn.jsdelivr.net",
          "https://fonts.gstatic.com",
        ],
        imgSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'"],
        workerSrc: ["'self'", "blob:"],
      },
    },
    strictTransportSecurity: cookieSecureEnabled()
      ? { maxAge: 15_552_000, includeSubDomains: true }
      : false,
  }),
);
app.get("/healthz", (_req, res) => {
  res.set("Cache-Control", "no-store");
  res.json({
    ok: true,
    web: "site",
    port: PORT,
    mode: currentMode(),
    parser: "ready",
    engine: engineDispatcher.configured ? "configured" : "not-wired",
    cloudflare: "not-wired",
    proxy: TRUST_PROXY !== false ? TRUST_PROXY : false,
  });
});
app.use(cookieParser());
app.use(
  createSessionMiddleware({
    secret: sessionSecret,
    maxAge: 24 * 60 * 60 * 1000,
  }),
);
app.use(express.static(FRONTEND, { index: false }));
app.get("/", (_req, res) => res.sendFile(frontendIndex));
app.get(["/react", "/react/"], (_req, res) => res.sendFile(reactIndex));
const identityRateLimit = rateLimit({
  windowMs: positiveInteger("IDENTITY_RATE_WINDOW_MINUTES", 60, 1440) * 60 * 1000,
  limit: positiveInteger("IDENTITY_RATE_MAX", 20, 10_000),
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req.edge?.ip || req.ip || "unknown"),
  handler: (_req, res) =>
    res.status(429).json({ error: "Too many identity requests; retry later" }),
});
app.get("/csrf-token", identityRateLimit, cookieGenerator, (req, res) => {
  const existing = req.cookies?.csrf_token;
  const token =
    typeof existing === "string" && /^[A-Za-z0-9_-]{43}$/.test(existing)
      ? existing
      : crypto.randomBytes(32).toString("base64url");
  res.cookie("csrf_token", token, {
    httpOnly: false,
    sameSite: cookieSameSite(),
    secure: cookieSecureEnabled(),
    path: "/",
    maxAge: 60 * 60 * 1000,
  });
  res.set("Cache-Control", "no-store");
  res.json({ csrfToken: token });
});
app.use("/api/submit", headerCheck);
app.use("/api/submit", csrfCheck);
const uploadRateLimit = rateLimit({
  windowMs: positiveInteger("UPLOAD_RATE_WINDOW_MINUTES", 60, 1440) * 60 * 1000,
  limit: positiveInteger("UPLOAD_RATE_MAX", 20, 10_000),
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req.edge?.ip || req.ip || "unknown"),
  handler: (_req, res) =>
    res.status(429).json({ error: "Too many submission attempts; retry later" }),
});
const uploadCapacity = createConcurrencyGate(
  positiveInteger("PARSER_MAX_CONCURRENCY", 2, 16),
);
app.post("/api/submit", uploadRateLimit, uploadCapacity);
app.use("/api/submit", cookieGenerator);
app.use("/api/submit", cookieDBCheck);
// Parse ordinary API bodies only after origin/CSRF/identity and upload-rate
// gates. Multipart file bytes bypass these parsers and remain bounded by Multer.
app.use("/api/submit", express.json({ limit: JSON_BODY_LIMIT_BYTES, strict: true }));
app.use(
  "/api/submit",
  express.urlencoded({ extended: false, limit: "64kb", parameterLimit: 20 }),
);
const UPLOAD_MAX_MB = positiveInteger("UPLOAD_MAX_MB", 64, 256);
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, file, cb) => cb(null, abs(inputDirFor(file.originalname))),
    filename: (_req, file, cb) =>
      cb(null, `${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`),
  }),
  fileFilter: (_req, file, cb) => {
    const valid =
      file.originalname.length <= 255 &&
      /^\d{8}T\d{6}Z__[a-zA-Z0-9._-]+\.(pdf|docx)$/.test(file.originalname);
    cb(valid ? null : new multer.MulterError("LIMIT_UNEXPECTED_FILE", "file"), valid);
  },
  limits: {
    fileSize: UPLOAD_MAX_MB * 1024 * 1024,
    files: 1,
    fields: 4,
    parts: 5,
    fieldSize: 64 * 1024,
  },
});
app.use(
  "/api/submit",
  createIncomingRouter({
    upload,
    db,
    request,
    artifactTtlMs: ARTIFACT_TTL_MS,
    queue: processingQueue,
    hiddenProcessor,
  }),
);
const engineQueueRateLimit = rateLimit({
  windowMs: positiveInteger("ENGINE_QUEUE_RATE_WINDOW_MINUTES", 60, 1440) * 60 * 1000,
  limit: positiveInteger("ENGINE_QUEUE_RATE_MAX", 240, 100_000),
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req.edge?.ip || req.ip || "unknown"),
  handler: (_req, res) => res.status(429).json({ error: "Too many queue calls; retry later" }),
});
app.use(
  "/api/internal/engine/queue",
  engineQueueRateLimit,
  createEngineQueueRouter({
    queue: processingQueue,
    engineToSiteKey: engineCfg.engineToSiteKey,
  }),
);
// Final error boundary keeps parser paths, SQLite details, and stack traces out
// of HTTP responses while still logging them for operators.
app.use((error, _req, res, next) => {
  // Once the response has started streaming (a failed res.download mid-body,
  // for example) there is no status left to set; handing it back to Express
  // destroys the socket instead of throwing ERR_HTTP_HEADERS_SENT in here.
  if (res.headersSent) return next(error);
  console.error("[http]", error);
  if (error instanceof multer.MulterError) {
    const tooLarge = error.code === "LIMIT_FILE_SIZE";
    return res.status(tooLarge ? 413 : 400).json({
      error: tooLarge ? "Uploaded file is too large" : "Invalid multipart upload",
    });
  }
  if (error?.type === "entity.too.large") {
    return res.status(413).json({ error: "Request body is too large" });
  }
  // Errors that already carry a client-facing status keep it. Express's own
  // send/sendFile errors are the common case: a missing file arrives here as
  // statusCode 404, and reporting it as 500 both misleads the client and hides
  // the real condition from monitoring. Only 4xx is honoured — a 5xx from a
  // library still collapses to the generic message below.
  const declared = Number(error?.status ?? error?.statusCode);
  if (Number.isInteger(declared) && declared >= 400 && declared < 500) {
    return res.status(declared).json({
      error: declared === 404 ? "Not found" : "Request could not be processed",
    });
  }
  return res.status(500).json({ error: "Internal server error" });
});
export const server = app.listen(PORT, HOST, () => {
  console.log(`[site] listening at http://${HOST}:${PORT}`);
});
server.requestTimeout = positiveInteger("HTTP_REQUEST_TIMEOUT_MS", 120_000, 600_000);
server.headersTimeout = Math.min(30_000, server.requestTimeout);
server.keepAliveTimeout = 5_000;
server.maxHeadersCount = 100;
let closing = false;
async function shutdown(signal) {
  if (closing) return;
  closing = true;
  console.log(`[site] ${signal} — shutting down`);
  clearInterval(cleanupTimer);
  processingQueue.dispose();
  await new Promise((resolve) => server.close(resolve));
  await closePraserManager().catch(() => {});
  try {
    closeDb();
  } catch {}
}
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => {
    shutdown(signal)
      .then(() => process.exit(0))
      .catch((err) => {
        console.error("[site] shutdown failed", err);
        process.exit(1);
      });
  });
}
export default app;