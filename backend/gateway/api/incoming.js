import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { createParser } from '../../file/parser.js';
import { createPdfParser, createDocxParser } from '../../file/pdf.js';
import { createSaveOriginal, deleteStoredFile } from '../../file/saveOriginfile.js';
import { OUTPUT_DIR, QUARANTINE_DIR, abs } from '../../file/paths.js';
import { createTextHolder } from '../text/content.js';
import { createRawSaver, cleanupRawResult } from '../generator/rawSaver.js';
import { createInputHandler } from '../proxy/requestHandler.js';
import {
  readUploadMetadata,
  validateUploadedFileSignature,
} from './uploadMetadata.js';
import {
  createProcessingQueue,
  publicQueueStatus,
} from '../queue/processingQueue.js';
import {
  agentUploadEnabled,
  sessionBypassEnabled,
  quotaBypassEnabled,
} from '../../cookie/devbypass.js';
import { setIdentityCookie } from '../../cookie/emit.js';

/**
 * A bypass opens the User-Agent, cookie and users-row gates and then drops the
 * request into the SAME happy path as a browser — cookieGenerator upserts a
 * real visitor row for it, so the quota counts against the database exactly as
 * it does for everyone else. This flag therefore only governs the submissions
 * bookkeeping, which a throwaway agent identity has no use for.
 */
const bypassIdentityFor = (req) => sessionBypassEnabled(req) || agentUploadEnabled(req);

export const MAX_TEXT_INPUT_CHARS = Number.parseInt(
  process.env.MAX_TEXT_INPUT_CHARS || '1000000',
  10,
);
if (
  !Number.isSafeInteger(MAX_TEXT_INPUT_CHARS) ||
  MAX_TEXT_INPUT_CHARS < 1 ||
  MAX_TEXT_INPUT_CHARS > 10_000_000
) {
  throw new Error('MAX_TEXT_INPUT_CHARS must be an integer from 1 to 10000000');
}

/**
 * Bytes the JSON body parser must accept for MAX_TEXT_INPUT_CHARS to mean
 * anything.
 *
 * The route's own "Text submission is too large" 413 sat behind a hard-coded
 * 1 MB express.json limit, so with the default of 1,000,000 characters it
 * could never fire: the parser rejected the body first, with a different
 * message. Worse for the language this site exists for — Myanmar text is three
 * bytes per character in UTF-8, so the real ceiling was ~330k characters, a
 * third of the configured limit, and the user saw "Request body is too large"
 * instead of a limit they could reason about.
 *
 * UTF-8 is at most 4 bytes per code unit pair; JSON escaping adds the quotes
 * and the {"text":…} envelope. Sizing the parser from the character limit
 * keeps the two in agreement whichever way MAX_TEXT_INPUT_CHARS is tuned.
 */
export const JSON_BODY_LIMIT_BYTES = MAX_TEXT_INPUT_CHARS * 4 + 64 * 1024;

class ClientError extends Error {
  constructor(status, message, options) {
    super(message, options);
    this.status = status;
    this.publicMessage = message;
  }
}
const maybeUpload = (upload) => (req, res, next) => {
  const ct = req.headers['content-type'] || '';
  ct.includes('multipart/form-data')
    ? upload.single('file')(req, res, next)
    : next();
};
function isInsideOutput(filePath) {
  const output = abs(OUTPUT_DIR);
  const relative = path.relative(output, path.resolve(filePath));
  return relative !== '' && !relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative);
}
export function createIncomingRouter({
  upload,
  db: _db,
  request,
  artifactTtlMs,
  queue = null,
  hiddenProcessor = null,
}) {
  const processingQueue =
    queue ||
    createProcessingQueue({
      metadataStore: request,
      ...(artifactTtlMs ? { ttlMs: artifactTtlMs } : {}),
    });
  const saveOriginal = createSaveOriginal({ quarantineDir: QUARANTINE_DIR });
  const parser = createParser({
    saveOriginal,
    pdfParser: createPdfParser().parse,
    docxParser: createDocxParser().parse,
  });
  const inputHandler = createInputHandler({
    textHolder: createTextHolder(),
    metadataGuard: request,
    rawSaver: createRawSaver(),
  });
  const router = Router();
  async function preBodyQuota(req, res, next) {
    try {
      const quota = await request.checkQuota({
        userId: req.userId,
        cookieData: req.cookieData,
        quotaDisabled: quotaBypassEnabled(req),
        allowCookieFallback: bypassIdentityFor(req),
      });
      if (!quota.allowed) {
        return res.status(429).json({ error: 'Quota exceeded', remaining: 0 });
      }
      return next();
    } catch (error) {
      return next(error);
    }
  }
  router.post('/', preBodyQuota, maybeUpload(upload), async (req, res) => {
    let queueFormId = null;
    let quarantinePath = null;
    let parserArtifactPath = null;
    let rawResult = null;
    try {
      const source = req.file ? 'file' : 'text';
      let uploadMetadata = null;
      if (req.file) {
        try {
          uploadMetadata = readUploadMetadata(req.body, req.file);
        } catch (error) {
          throw new ClientError(400, error.message, { cause: error });
        }
        try {
          await validateUploadedFileSignature(req.file);
        } catch (error) {
          throw new ClientError(400, 'Uploaded file signature is invalid', { cause: error });
        }
      } else {
        const text = req.body?.text;
        if (typeof text !== 'string' || text.length === 0) {
          throw new ClientError(400, 'No text provided');
        }
        if (text.length > MAX_TEXT_INPUT_CHARS) {
          throw new ClientError(413, 'Text submission is too large');
        }
      }

      const bypassIdentity = bypassIdentityFor(req);
      const consumed = await request.consumeQuota({
        userId: req.userId,
        cookieData: req.cookieData,
        quotaDisabled: quotaBypassEnabled(req),
        allowCookieFallback: bypassIdentity,
      });
      if (!consumed.allowed) {
        throw new ClientError(429, 'Quota exceeded');
      }
      // The cookie IS the counter on the bypass path, so the incremented value
      // has to go back to the caller or the next request reuses the old count.
      if (consumed.cookieChanged) setIdentityCookie(res, req.cookieData);

      const formId = await request.createUploadSession({
        userId: req.userId,
        visitorHash: req.visitorHash,
        source,
        bypassIdentity,
      });
      queueFormId = formId;
      let parsedText = null;
      const praserJob = {};
      if (req.file) {
        let parsed;
        try {
          parsed = await parser(req.file, praserJob, {
            intent: uploadMetadata,
            onSaved: async (savedPath) => {
              quarantinePath = savedPath;
              await processingQueue.enqueue({
                formId,
                userId: req.userId,
                sessionId: req.visitorHash,
                clientIp: req.edge?.ip || req.ip || req.socket?.remoteAddress,
                intent: uploadMetadata,
                file: req.file,
                inputPath: savedPath,
              });
              processingQueue.managerQueued(formId);
              processingQueue.managerStarted(formId);
            },
          });
        } catch (error) {
          parserArtifactPath = praserJob.manager?.file || null;
          throw new ClientError(422, 'Uploaded file could not be parsed', { cause: error });
        }
        parsedText = parsed.textContent;
        quarantinePath = parsed.savedPath;
        if (!praserJob.manager?.file) {
          throw new Error('Parser completed without an artifact');
        }
        parserArtifactPath = praserJob.manager.file;
        await processingQueue.managerFinished(formId, praserJob.manager);
      }
      rawResult = await inputHandler({
        req,
        formId,
        parsedText,
        quarantinePath,
        bypassIdentity,
      });
      quarantinePath = null;
      if (req.file) {
        await processingQueue.bindSavedResult(formId, {
          bypassIdentity,
          submitId: rawResult.submitId,
          filename: rawResult.filename,
          bridgePath: rawResult.rawPath,
          originalPath: rawResult.originalPath,
        });
        await processingQueue.ready(formId, {
          file: praserJob.manager.file,
          filename: `${path.parse(uploadMetadata.uploadName).name}.${praserJob.manager.output}`,
          mimeType: praserJob.manager.mimeType,
        });
      }
      const publicProcessing = req.file
        ? publicQueueStatus(processingQueue.getByFormId(formId))
        : null;
      res.status(202).json({
        formId,
        submitId: rawResult.submitId,
        ...(source === 'text' ? { text: req.body.text } : {}),
        remaining: consumed.remaining,
        ...(Number.isInteger(consumed.limit) ? { limit: consumed.limit } : {}),
        status: publicProcessing?.state ?? 'FINISHED',
        ...(publicProcessing ? { processing: publicProcessing } : {}),
      });
      if (hiddenProcessor && req.file && uploadMetadata?.task === 'analysis') {
        Promise.resolve(hiddenProcessor({ formId })).catch((error) =>
          console.error('[incoming] hidden analysis invocation failed', error),
        );
      }
      return;
    } catch (error) {
      console.error('[incoming]', error);
      await Promise.allSettled([
        deleteStoredFile(req.file?.path),
        deleteStoredFile(quarantinePath),
        deleteStoredFile(parserArtifactPath),
        cleanupRawResult(rawResult),
      ]);
      if (queueFormId && processingQueue.getByFormId(queueFormId)) {
        processingQueue.fail(queueFormId, 'Processing failed');
      }
      if (queueFormId) {
        try {
          await request.failUpload({
            userId: req.userId,
            formId: queueFormId,
            bypassIdentity: bypassIdentityFor(req),
          });
        } catch (dbError) {
          console.error('[incoming] failed to mark submission failed', dbError);
        }
      }
      const status = Number.isInteger(error.status) ? error.status : 500;
      const message = error.publicMessage || 'Submission processing failed';
      return res.status(status).json({ error: message });
    }
  });
  router.get('/status/:submitId', (req, res) => {
    const record = processingQueue.getBySubmitId(req.params.submitId);
    if (!record) return res.status(404).json({ error: 'Processing job not found' });
    if (record.userId !== String(req.userId) || record.sessionId !== req.visitorHash) {
      return res.status(403).json({ error: 'Processing job metadata mismatch' });
    }
    return res.json(publicQueueStatus(record));
  });
  router.get('/file/:submitId', (req, res, next) => {
    const record = processingQueue.getBySubmitId(req.params.submitId);
    if (!record) return res.status(404).json({ error: 'Processing job not found' });
    if (record.userId !== String(req.userId) || record.sessionId !== req.visitorHash) {
      return res.status(403).json({ error: 'Processing job metadata mismatch' });
    }
    if (record.state !== 'FINISHED' || !record.finalPath) {
      return res.status(409).json({ error: 'Processing file is not ready', state: record.state });
    }
    const filePath = path.resolve(record.finalPath);
    if (!isInsideOutput(filePath) || !fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Processing file is unavailable' });
    }
    processingQueue.delivered(record.formId);
    const filename = path.basename(record.finalFilename || `${record.submitId}.txt`);
    return res.download(filePath, filename, { dotfiles: 'allow' }, (error) => {
      if (error && !res.headersSent) next(error);
    });
  });
  return router;
}