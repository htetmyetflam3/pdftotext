import fs from 'node:fs/promises';
const SOURCES = new Set(['converter', 'analysis']);
const ANALYSIS_TASK_PREFIX = 'analysis-';
const ANALYSIS_VARIANT_JOBS = new Map([
  ['extracting', 'extracting-analysis'],
  ['conversion', 'conversion-analysis'],
]);
const CONTENT = new Set(['text', 'image']);
const JOBS = new Set(['extracting', 'ocr', 'extracting-analysis', 'conversion-analysis']);
const METHODS = new Set(['default', 'manual', 'null']);
const INPUTS = new Set(['pdf', 'docx']);
const CONVERSIONS = new Set(['txt', 'docx', 'pdf']);
const DETECTORS = new Set(['pdf.js', 'mammoth']);
function one(value, field) {
  if (Array.isArray(value)) throw new Error(`${field} must be a single value`);
  return value;
}
function requiredString(value, field) {
  if (typeof value !== 'string' || !value) throw new Error(`metadata.${field} is required`);
}
function member(value, values, field) {
  if (!values.has(value)) throw new Error(`Unsupported metadata.${field}: ${String(value)}`);
}
function nonnegative(value, field) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`metadata.detector.${field} must be a non-negative integer`);
  }
}
/**
 * Analysis task tokens carry the job variant at the request boundary:
 * analysis-extracting ⇔ extracting-analysis and
 * analysis-conversion ⇔ conversion-analysis. The queue receives canonical
 * task `analysis` after this filter; conversion remains simply `conversion`.
 */
function filterAnalysisTask(intent) {
  if (typeof intent.task !== 'string' || !intent.task.startsWith(ANALYSIS_TASK_PREFIX)) {
    return intent;
  }
  const variant = intent.task.slice(ANALYSIS_TASK_PREFIX.length);
  const expectedJob = ANALYSIS_VARIANT_JOBS.get(variant);
  if (!expectedJob) throw new Error(`Unsupported metadata.task: ${intent.task}`);
  if (intent.job !== expectedJob) {
    throw new Error(`metadata.task ${intent.task} requires metadata.job ${expectedJob}`);
  }
  return { ...intent, task: 'analysis' };
}
/**
 * Parse and validate the SPA v1 contract without rewriting the parent task
 * or the concrete job.
 */
export function readUploadMetadata(body = {}, file = null) {
  if (!file) return null;
  const raw = one(body.metadata, 'metadata');
  if (typeof raw !== 'string') throw new Error('File uploads require metadata JSON');
  let intent;
  try {
    intent = JSON.parse(raw);
  } catch (error) {
    throw new Error('metadata must be valid JSON', { cause: error });
  }
  if (!intent || Array.isArray(intent) || typeof intent !== 'object') {
    throw new Error('metadata must be a JSON object');
  }
  if (intent.v !== 1) throw new Error('metadata.v must be 1');
  member(intent.source, SOURCES, 'source');
  requiredString(intent.originalName, 'originalName');
  requiredString(intent.uploadName, 'uploadName');
  if (
    intent.originalName.length > 255 ||
    /[\u0000-\u001f\u007f]/.test(intent.originalName) ||
    intent.originalName.includes('/') ||
    intent.originalName.includes('\\')
  ) {
    throw new Error('metadata.originalName is not a safe filename');
  }
  if (
    intent.uploadName.includes('/') ||
    intent.uploadName.includes('\\') ||
    file.originalname.includes('/') ||
    file.originalname.includes('\\')
  ) {
    throw new Error('Upload filename must not contain path separators');
  }
  if (
    intent.uploadName.length > 255 ||
    !/^\d{8}T\d{6}Z__[a-zA-Z0-9._-]+\.(pdf|docx)$/.test(intent.uploadName)
  ) {
    throw new Error('Upload filename must follow frontend timestamped format');
  }
  member(intent.fileFormat, INPUTS, 'fileFormat');
  if (intent.desired === undefined) intent.desired = intent.conversion;
  member(intent.desired, CONVERSIONS, 'desired');
  if (intent.conversion === undefined) intent.conversion = intent.desired;
  member(intent.conversion, CONVERSIONS, 'conversion');
  // Keep the legacy internal names for the queue while the wire contract uses
  // source/fileFormat/conversion. Source is the final workflow; task is no
  // longer accepted from the browser.
  Object.defineProperties(intent, {
    inputFormat: { value: intent.fileFormat, enumerable: false, writable: true },
    outputFormat: { value: intent.desired, enumerable: false, writable: true },
    task: { value: intent.source === 'analysis' ? 'analysis' : 'conversion', enumerable: false, writable: true },
  });
  if (intent.source === 'analysis' && intent.job === 'extracting') {
    intent.job = 'extracting-analysis';
  }
  if (file.originalname !== intent.uploadName) {
    throw new Error('Uploaded filename does not match metadata.uploadName');
  }
  if (extension(file.originalname) !== intent.inputFormat) {
    throw new Error('Uploaded filename extension does not match metadata.inputFormat');
  }
  if (extension(intent.originalName) !== intent.inputFormat) {
    throw new Error('Original filename extension does not match metadata.inputFormat');
  }
  member(intent.content, CONTENT, 'content');
  member(intent.job, JOBS, 'job');
  member(intent.method, METHODS, 'method');
  requiredString(intent.clickedAt, 'clickedAt');
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(intent.clickedAt)) {
    throw new Error('metadata.clickedAt must be an ISO-8601 UTC timestamp');
  }
  const d = intent.detector;
  if (!d || Array.isArray(d) || typeof d !== 'object') {
    throw new Error('metadata.detector is required');
  }
  member(d.name, DETECTORS, 'detector.name');
  for (const field of ['pages', 'textPages', 'imagePages', 'myanmarChars', 'myanmarLetters', 'imageBytes', 'textBytes']) {
    nonnegative(d[field], field);
  }
  if (typeof d.confirmed !== 'boolean') {
    throw new Error('metadata.detector.confirmed must be a boolean');
  }
  if (intent.task === 'conversion' && !['extracting', 'ocr'].includes(intent.job)) {
    throw new Error('Conversion task has an incompatible job');
  }
  if (intent.task === 'analysis' && !['extracting-analysis', 'conversion-analysis'].includes(intent.job)) {
    throw new Error('Analysis task has an incompatible job');
  }
  if (
    intent.job === 'ocr' &&
    (intent.inputFormat !== 'pdf' || intent.content !== 'image' || intent.method !== 'default')
  ) {
    throw new Error('OCR job requires PDF image content and default method');
  }
  if (intent.method === 'null' && intent.inputFormat !== 'docx') {
    throw new Error('The null method is DOCX-only');
  }
  return intent;
}
function extension(name = '') {
  const dot = name.lastIndexOf('.');
  return dot < 0 ? '' : name.slice(dot + 1).toLowerCase();
}
/**
 * Confirm that the bytes agree with the validated extension before the file is
 * handed to the expensive parser. This is deliberately independent of the
 * browser's forgeable Content-Type header.
 */
export async function validateUploadedFileSignature(file) {
  if (!file?.path) throw new Error('Uploaded file is missing');
  const format = extension(file.originalname || file.filename || '');
  const handle = await fs.open(file.path, 'r');
  try {
    const stat = await handle.stat();
    if (!stat.isFile() || stat.size < 4) throw new Error('Uploaded file is empty or truncated');
    const prefix = Buffer.alloc(Math.min(1024, stat.size));
    await handle.read(prefix, 0, prefix.length, 0);
    if (format === 'pdf') {
      if (prefix.indexOf(Buffer.from('%PDF-')) < 0) {
        throw new Error('Uploaded PDF has an invalid file signature');
      }
      const tailSize = Math.min(4096, stat.size);
      const tail = Buffer.alloc(tailSize);
      await handle.read(tail, 0, tailSize, stat.size - tailSize);
      if (!tail.includes(Buffer.from('%%EOF'))) {
        throw new Error('Uploaded PDF is truncated or has no PDF trailer');
      }
      return 'pdf';
    }
    if (format === 'docx') {
      if (!prefix.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]))) {
        throw new Error('Uploaded DOCX has an invalid ZIP file signature');
      }
      return 'docx';
    }
    throw new Error('Only PDF and DOCX uploads are accepted');
  } finally {
    await handle.close();
  }
}