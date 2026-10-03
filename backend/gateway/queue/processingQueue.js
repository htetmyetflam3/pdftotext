import crypto from 'node:crypto';
import { createReadStream } from 'node:fs';
import fs from 'node:fs/promises';
const now = () => new Date().toISOString();
async function snapshot(filePath) {
  const hash = crypto.createHash('sha256');
  let bytes = 0;
  const stream = createReadStream(filePath);
  for await (const chunk of stream) {
    bytes += chunk.length;
    hash.update(chunk);
  }
  return { bytes, sha256: hash.digest('hex') };
}
function tokenMatches(presented, expected) {
  if (typeof presented !== 'string' || typeof expected !== 'string') return false;
  const a = Buffer.from(presented);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
/**
 * Job lifecycle (single `state` field per record):
 *
 *   RECEIVED → SITE_PROCESSING → SOURCE_READY → FINISHED
 *                            ↘ FAILED
 *
 * Engine round (hidden analysis processing only, starts from a locally
 * finished job):
 *
 *   FINISHED → ENGINE_ACCEPTED → ANALYSING → FINISHED
 *                          ↘ FAILED        ↘ EXPIRED
 *
 * Terminal states: FINISHED, FAILED, EXPIRED. Transitions are guarded by the
 * expected prior state, so a request can never move a job out of a state the
 * contract does not allow (a replayed Engine call, a double retrieval, a stale
 * token, …). Maps are mutated synchronously, which makes every transition
 * atomic in this single-threaded process.
 */
export const QUEUE_STATES = [
  'RECEIVED',
  'SITE_PROCESSING',
  'SOURCE_READY',
  'ENGINE_ACCEPTED',
  'ANALYSING',
  'FINISHED',
  'FAILED',
  'EXPIRED',
];
export const ANALYSIS_JOBS = new Set(['extracting-analysis', 'conversion-analysis']);
export class QueueRejection extends Error {
  constructor(kind, message) {
    super(message || kind);
    this.kind = kind;
  }
}
export function publicQueueStatus(record) {
  if (!record) return null;
  return {
    submitId: record.submitId,
    state: record.state,
    finalFilename: record.finalFilename,
    finalBytes: record.finalBytes,
    downloadUrl:
      record.state === 'FINISHED' && record.submitId && record.finalPath
        ? `/api/submit/file/${encodeURIComponent(record.submitId)}`
        : null,
    error: record.error,
  };
}
/**
 * In-process Site processing queue. This is job lifecycle state, not quota
 * state. Records are keyed by formId first and gain submitId after the raw
 * save mints it. Input measurements are immutable after enqueue.
 *
 * ONE shared instance is created at the application composition root and
 * injected into the incoming, hidden, Engine-queue and delivery routers, so
 * every one of them sees the same jobs.
 */
export function createProcessingQueue({
  max = 500,
  ttlMs = 24 * 60 * 60 * 1000,
  metadataStore = null,
  randomBytes = crypto.randomBytes,
} = {}) {
  const records = new Map();
  const bySubmitId = new Map();
  function discard(id, record) {
    records.delete(id);
    if (record.submitId) bySubmitId.delete(record.submitId);
    if (record.engineTimer) clearTimeout(record.engineTimer);
    const files = new Set(
      [record.inputPath, record.rawPath, record.originalPath, record.finalPath].filter(Boolean),
    );
    for (const file of files) fs.unlink(file).catch(() => {});
  }
  function prune() {
    const cutoff = Date.now() - ttlMs;
    for (const [id, record] of records) {
      if (Date.parse(record.queuedAt) < cutoff) discard(id, record);
    }
    while (records.size >= max) {
      const [id, record] = records.entries().next().value;
      discard(id, record);
    }
  }
  function clone(record) {
    if (!record) return null;
    const snapshotFields = { ...record };
    delete snapshotFields.engineTimer;
    return structuredClone(snapshotFields);
  }
  async function enqueue({ formId, userId, sessionId, clientIp, intent, file, inputPath }) {
    prune();
    if (records.has(formId)) throw new Error('Processing queue already contains this formId');
    const measured = await snapshot(inputPath);
    const record = {
      formId,
      submitId: null,
      userId: String(userId),
      sessionId,
      clientIp: String(clientIp || ''),
      task: intent.task,
      job: intent.job ?? null,
      outputFormat: intent.outputFormat,
      requestedExtension: intent.outputFormat,
      requestMetadata: structuredClone(intent),
      originalName: intent.originalName,
      uploadName: intent.uploadName,
      managerFilename: null,
      finalFilename: null,
      inputPath,
      inputMimeType: file.mimetype || 'application/octet-stream',
      inputFormat: intent.inputFormat,
      inputBytes: measured.bytes,
      inputSha256: measured.sha256,
      uploadedAt: intent.clickedAt || now(),
      queuedAt: now(),
      managerQueuedAt: null,
      managerStartedAt: null,
      managerFinishedAt: null,
      managerPath: null,
      managerMimeType: null,
      managerFormat: null,
      managerBytes: null,
      managerSha256: null,
      lineCount: null,
      textChars: null,
      textBytes: null,
      pageCount: null,
      encodingCounts: null,
      rawPath: null,
      rawBytes: null,
      rawSha256: null,
      originalPath: null,
      jobToken: null,
      engineAcceptedAt: null,
      engineExpiresAt: null,
      engineTimer: null,
      engineServed: false,
      analysisStartedAt: null,
      analysisFinishedAt: null,
      finalPath: null,
      finalMimeType: null,
      finalBytes: null,
      finalSha256: null,
      readyAt: null,
      deliveredAt: null,
      state: 'RECEIVED',
      error: null,
    };
    records.set(formId, record);
    return clone(record);
  }
  function recordFor(formId) {
    const record = records.get(formId);
    if (!record) throw new QueueRejection('unknown', 'Processing queue record not found');
    return record;
  }
  function mutate(formId, fn) {
    const record = recordFor(formId);
    fn(record);
    return clone(record);
  }
  /**
   * Shared Engine-call binding: the record must exist, the one-time token must
   * match in constant time, and every identity field must equal exactly what
   * the hidden dispatch stored. A stale token expires the round. Nothing in
   * the thrown kind names which field matched.
   *
   * The retrieval call additionally binds the source filename and requested
   * extension verbatim. The result call does not bind the filename: the
   * artifact carries its own safe name + requested extension, validated as
   * payload by the queue route.
   */
  function bindEngineCall(meta, { checkFilename = true, checkExtension = true } = {}) {
    const record = records.get(meta.formId);
    if (!record) throw new QueueRejection('unknown', 'Unknown processing job');
    if (Date.now() > Date.parse(record.engineExpiresAt || 0)) {
      if (record.state === 'ENGINE_ACCEPTED' || record.state === 'ANALYSING') {
        record.state = 'EXPIRED';
        record.error = 'Analysis job expired';
      }
      throw new QueueRejection('expired', 'Job token has expired');
    }
    const binds =
      tokenMatches(meta.jobToken, record.jobToken) &&
      String(meta.submitId) === String(record.submitId) &&
      String(meta.userId) === String(record.userId) &&
      String(meta.sessionId) === String(record.sessionId) &&
      (!checkFilename || String(meta.filename) === String(record.uploadName)) &&
      (!checkExtension || String(meta.extension) === String(record.requestedExtension));
    if (!binds) throw new QueueRejection('mismatch', 'Job metadata mismatch');
    return record;
  }
  return {
    enqueue,
    managerQueued(formId) {
      return mutate(formId, (r) => {
        r.state = 'SITE_PROCESSING';
        r.managerQueuedAt = now();
      });
    },
    managerStarted(formId) {
      return mutate(formId, (r) => {
        r.state = 'SITE_PROCESSING';
        r.managerStartedAt = now();
      });
    },
    async managerFinished(formId, result) {
      const measured = await snapshot(result.file);
      return mutate(formId, (r) => {
        r.state = 'SOURCE_READY';
        r.managerFinishedAt = now();
        r.managerPath = result.file;
        r.managerFilename = result.filename || result.file.split(/[\\/]/).pop();
        r.managerMimeType = result.mimeType || 'application/octet-stream';
        r.managerFormat = result.output;
        r.managerBytes = measured.bytes;
        r.managerSha256 = measured.sha256;
        r.lineCount = result.lineCount ?? null;
        r.textChars = result.textChars ?? null;
        r.textBytes = result.textBytes ?? null;
        r.pageCount = result.pages ?? result.pageCount ?? null;
        r.encodingCounts = result.counts ? structuredClone(result.counts) : null;
      });
    },
    /**
     * Bind the raw-save result and persist the submissions row from the queue's
     * retained request metadata. DB lifecycle updates belong here rather than
     * in requestHandler, so disk, queue and DB advance as one responsibility.
     * The raw text is the Site-owned source the Engine queue may later serve;
     * its byte count and sha256 are measured once here, so the serve headers
     * describe exactly what goes on the wire.
     */
    async bindSavedResult(
      formId,
      { submitId, filename, bridgePath, originalPath = null, bypassIdentity = false },
    ) {
      const record = recordFor(formId);
      const raw = bridgePath ? await snapshot(bridgePath) : { bytes: null, sha256: null };
      if (metadataStore) {
        await metadataStore.finalizeUpload({
          userId: record.userId,
          visitorHash: record.sessionId,
          formId,
          submitId,
          filename,
          bridgePath,
          originalName: record.originalName,
          bypassIdentity,
        });
      }
      return mutate(formId, (r) => {
        r.submitId = submitId;
        r.rawPath = bridgePath || null;
        r.rawBytes = raw.bytes;
        r.rawSha256 = raw.sha256;
        r.originalPath = originalPath;
        r.state = 'SOURCE_READY';
        bySubmitId.set(submitId, formId);
      });
    },
    async ready(formId, { file, filename, mimeType }) {
      const measured = await snapshot(file);
      return mutate(formId, (r) => {
        r.state = 'FINISHED';
        r.finalPath = file;
        r.finalFilename = filename || file.split(/[\\/]/).pop();
        r.finalMimeType = mimeType || 'application/octet-stream';
        r.finalBytes = measured.bytes;
        r.finalSha256 = measured.sha256;
        r.readyAt = now();
      });
    },
    delivered(formId) {
      return mutate(formId, (r) => {
        r.deliveredAt = now();
      });
    },
    fail(formId, publicMessage = 'Processing failed') {
      return mutate(formId, (r) => {
        if (r.engineTimer) clearTimeout(r.engineTimer);
        r.state = 'FAILED';
        r.error = String(publicMessage || 'Processing failed');
      });
    },
    /**
     * Mint the one-time, server-only job token and open the Engine round.
     * Only a locally FINISHED analysis job may start a round; a round left
     * untouched past ttlMs expires terminally.
     */
    mintAnalysisToken(formId, { ttlMs }) {
      const record = recordFor(formId);
      if (record.task !== 'analysis' || (record.job && !ANALYSIS_JOBS.has(record.job))) {
        throw new QueueRejection('state', 'Submission is not an analysis job');
      }
      if (record.state !== 'FINISHED') {
        throw new QueueRejection(
          'state',
          `Job state ${record.state} cannot start an Engine round`,
        );
      }
      const token = randomBytes(16).toString('hex');
      record.jobToken = token;
      record.engineServed = false;
      record.engineAcceptedAt = now();
      record.engineExpiresAt = new Date(Date.now() + ttlMs).toISOString();
      record.analysisStartedAt = null;
      record.analysisFinishedAt = null;
      record.error = null;
      record.state = 'ENGINE_ACCEPTED';
      if (record.engineTimer) clearTimeout(record.engineTimer);
      record.engineTimer = setTimeout(() => {
        const current = records.get(formId);
        if (
          current &&
          (current.state === 'ENGINE_ACCEPTED' || current.state === 'ANALYSING')
        ) {
          current.state = 'EXPIRED';
          current.error = 'Analysis job expired';
        }
      }, ttlMs);
      record.engineTimer.unref();
      return token;
    },
    /**
     * The dispatch could not be delivered (Engine not configured / refused):
     * fail safely. The locally finished result stays deliverable and the queue
     * state returns to FINISHED; ordinary /api/submit behaviour is untouched.
     */
    abortAnalysis(formId, message = 'Analysis service is unavailable') {
      const record = recordFor(formId);
      if (record.state === 'ENGINE_ACCEPTED') {
        if (record.engineTimer) clearTimeout(record.engineTimer);
        record.state = 'FINISHED';
      }
      record.jobToken = null;
      record.error = String(message);
      return clone(record);
    },
    failAnalysis(formId, message = 'Analysis failed') {
      const record = recordFor(formId);
      if (record.state !== 'ENGINE_ACCEPTED' && record.state !== 'ANALYSING') {
        return clone(record);
      }
      if (record.engineTimer) clearTimeout(record.engineTimer);
      record.state = 'FAILED';
      record.error = String(message);
      return clone(record);
    },
    /**
     * Engine queue retrieval: atomically moves ENGINE_ACCEPTED → ANALYSING and
     * returns the Site-owned source descriptor. A second retrieval (or any
     * other state) is refused — the token is one-time and the source path is
     * resolved from queue state only, never from the request.
     */
    beginAnalysis(meta) {
      const record = bindEngineCall(meta);
      if (record.state !== 'ENGINE_ACCEPTED' || record.engineServed) {
        throw new QueueRejection('state', 'Source was already retrieved for this job');
      }
      record.state = 'ANALYSING';
      record.engineServed = true;
      record.analysisStartedAt = now();
      return clone(record);
    },
    /**
     * Same binding for the result call; expected state is ANALYSING. The
     * artifact's own filename/extension are payload, validated by the queue
     * route against the requested extension — not part of the binding.
     */
    beginAnalysisResult(meta) {
      const record = bindEngineCall(meta, { checkFilename: false, checkExtension: false });
      if (record.state !== 'ANALYSING' || !record.engineServed) {
        throw new QueueRejection('state', 'Job is not awaiting an Engine result');
      }
      return clone(record);
    },
    /**
     * ANALYSING → FINISHED with the validated, Site-stored artifact selected
     * for the user-requested extension. One-shot: the state gate rejects any
     * replayed completion.
     */
    completeAnalysis(formId, { file, filename, mimeType, bytes, sha256 }) {
      const record = recordFor(formId);
      if (record.state !== 'ANALYSING') {
        throw new QueueRejection('state', 'Job is not awaiting an Engine result');
      }
      if (record.engineTimer) clearTimeout(record.engineTimer);
      record.jobToken = null;
      record.finalPath = file;
      record.finalFilename = filename;
      record.finalMimeType = mimeType || 'application/octet-stream';
      record.finalBytes = bytes;
      record.finalSha256 = sha256;
      record.analysisFinishedAt = now();
      record.readyAt = now();
      record.error = null;
      record.state = 'FINISHED';
      return clone(record);
    },
    getByFormId(formId) {
      return clone(records.get(formId));
    },
    getBySubmitId(submitId) {
      const formId = bySubmitId.get(submitId);
      return formId ? this.getByFormId(formId) : null;
    },
    dispose() {
      for (const record of records.values()) {
        if (record.engineTimer) clearTimeout(record.engineTimer);
      }
    },
  };
}