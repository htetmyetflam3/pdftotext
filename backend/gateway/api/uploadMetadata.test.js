import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  readUploadMetadata,
  validateUploadedFileSignature,
} from './uploadMetadata.js';
const intent = {
  v: 1,
  source: 'converter', content: 'text', job: 'extracting', method: 'default',
  originalName: 'book.pdf', uploadName: '20260930T141233Z__book.pdf',
  clickedAt: '2026-09-30T14:12:33Z', fileFormat: 'pdf', conversion: 'txt', desired: 'docx',
  detector: { name: 'pdf.js', pages: 2, textPages: 2, imagePages: 0,
    myanmarChars: 20, myanmarLetters: 18, imageBytes: 0, textBytes: 100,
    confirmed: false },
};
const file = { originalname: intent.uploadName };
test('preserves the complete valid v1 metadata object', () => {
  const result = readUploadMetadata({ metadata: JSON.stringify(intent) }, file);
  assert.deepEqual(result, intent);
});
test('plain text requests need no upload metadata', () => {
  assert.equal(readUploadMetadata({}, null), null);
});
test('rejects missing metadata and filename mismatches for files', () => {
  assert.throws(() => readUploadMetadata({}, file), /require metadata/);
  assert.throws(
    () => readUploadMetadata({ metadata: JSON.stringify(intent) }, { originalname: 'other.pdf' }),
    /uploadName/,
  );
});
test('rejects demo metadata because demos never reach the server', () => {
  const demo = {
    v: 1, source: 'demo', originalName: 'sample.pdf', uploadName: 'sample.pdf',
    fileFormat: 'pdf', conversion: 'txt', desired: 'txt',
  };
  assert.throws(
    () => readUploadMetadata(
      { metadata: JSON.stringify(demo) },
      { originalname: 'sample.pdf' },
    ),
    /Unsupported metadata.source/,
  );
});
test('rejects contradictory routing combinations', () => {
  const bad = { ...intent, job: 'ocr', content: 'text' };
  assert.throws(() => readUploadMetadata({ metadata: JSON.stringify(bad) }, file), /OCR job/);
  const pdfNull = { ...intent, method: 'null' };
  assert.throws(() => readUploadMetadata({ metadata: JSON.stringify(pdfNull) }, file), /DOCX-only/);
});
test('rejects unsafe display filenames', () => {
  const bad = { ...intent, originalName: '../book.pdf' };
  assert.throws(
    () => readUploadMetadata({ metadata: JSON.stringify(bad) }, file),
    /safe filename/,
  );
});
test('validates PDF bytes rather than trusting extension or Content-Type', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'linga-signature-test-'));
  const validPath = path.join(dir, 'valid.pdf');
  const fakePath = path.join(dir, 'fake.pdf');
  try {
    await fs.writeFile(validPath, '%PDF-1.4\n1 0 obj\nendobj\n%%EOF\n');
    await fs.writeFile(fakePath, 'not a pdf');
    assert.equal(
      await validateUploadedFileSignature({ path: validPath, originalname: 'book.pdf' }),
      'pdf',
    );
    await assert.rejects(
      validateUploadedFileSignature({ path: fakePath, originalname: 'book.pdf' }),
      /signature|truncated/i,
    );
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});
test('source is the final workflow and desired is the requested output', () => {
  const run = (source, job, desired = 'txt', fileFormat = 'pdf') =>
    readUploadMetadata({ metadata: JSON.stringify({
      ...intent,
      source,
      job,
      desired,
      conversion: 'txt',
      fileFormat,
      content: job === 'ocr' ? 'image' : intent.content,
      originalName: `book.${fileFormat}`,
      uploadName: `20260930T141233Z__book.${fileFormat}`,
    }) }, { originalname: `20260930T141233Z__book.${fileFormat}` });
  assert.equal(run('converter', 'extracting').source, 'converter');
  assert.equal(run('analysis', 'extracting').job, 'extracting-analysis');
  assert.equal(run('analysis', 'extracting', 'pdf', 'docx').desired, 'pdf');
  assert.throws(() => run('unknown', 'extracting'), /Unsupported metadata.source/);
});
