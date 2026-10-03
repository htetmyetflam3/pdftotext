import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'url';
import { PRASER_JS, RAW_TXT_DIR, abs } from './paths.js';
import { managerPayload } from '../gateway/queue/managerHandoff.js';
/**
 * The praser module — ONE path, from the site's own path map:
 * `<web>/Public/PRASER/JS/module/prase.mjs` (the praser web's layout; the site's
 * round-trip and parity scripts use the same path). No candidate lists.
 */
const PRASER_MODULE = abs(PRASER_JS);
const MANAGER_MODULE = path.join(path.dirname(PRASER_MODULE), 'manager.mjs');
let manager = null;
async function loadManager() {
  if (manager) return manager;
  if (!existsSync(MANAGER_MODULE)) {
    throw new Error(`praser manager not found at ${MANAGER_MODULE}`);
  }
  const { Manager } = await import(pathToFileURL(MANAGER_MODULE).href);
  manager = new Manager({ outputDir: abs(RAW_TXT_DIR) });
  return manager;
}
export async function closePraserManager() {
  if (manager) {
    await manager.close();
    manager = null;
  }
}
export const praserModuleAvailable = () => existsSync(MANAGER_MODULE);
function stripCliArtifact(raw) {
  return raw
    .split('\n')
    .filter((line) => !line.startsWith('#'))
    .join('\n')
    .replace(/^--- Page \d+ ---$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
/**
 * Build a parser around the praser module. The caller passes the SAVED PATH
 * (see parser.js); the praser reads it and writes its text into the site's raw
 * text dir, which is what this returns.
 *
 * @param {string} label - human label for error messages ('PDF' | 'DOCX')
 */
function createPraserParser(label) {
  return {
    async parse(filePath, out = null, options = {}) {
      const intent = options.intent;
      if (!intent) throw new Error(`${label} upload intent is required`);
      const routing = managerPayload(intent);
      const filename = intent.uploadName;
      const outPath = abs(path.join(
        RAW_TXT_DIR,
        `${crypto.randomUUID()}.${routing.output}`,
      ));
      await fs.mkdir(path.dirname(outPath), { recursive: true });
      let jobManager;
      try {
        jobManager = await loadManager();
      } catch (err) {
        throw new Error(`${label} manager unavailable: ${err.message}`, { cause: err });
      }
      let reply;
      try {
        reply = await jobManager.dispatch({
          ...routing,
          inPath: filePath,
          filename,
          inputKind: intent.inputFormat,
          outPath,
        });
        await fs.chmod(reply.file || outPath, 0o600);
      } catch (err) {
        await fs.unlink(outPath).catch(() => {});
        throw new Error(`${label} manager failed`, { cause: err });
      }
      if (out) out.manager = {
        ...reply,
        ...routing,
        file: reply.file || outPath,
        filename: path.basename(reply.file || outPath),
      };
      const raw = typeof reply.text === 'string'
        ? reply.text
        : routing.output === 'txt'
          ? await fs.readFile(reply.file || outPath, 'utf8')
          : '';
      const text = stripCliArtifact(raw);
      if (!text && (intent.task !== 'conversion' || routing.output === 'txt')) {
        const hint =
          label === 'PDF'
            ? ' It is most likely a scan — image-only pages carry no text to extract.'
            : '';
        throw new Error(`No text found in this ${label}.${hint}`);
      }
      if (out) out.job = null;
      return text;
    },
    async bindIdentity() {
      return null;
    },
  };
}
export function createPdfParser() {
  return createPraserParser('PDF');
}
export function createDocxParser() {
  return createPraserParser('DOCX');
}