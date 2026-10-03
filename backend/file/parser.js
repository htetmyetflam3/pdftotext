import fs from 'fs/promises';
/**
 * Backend parser for the upload formats.
 *
 * Every FILE is parsed server-side: Burmese files carry Zawgyi/imposter
 * code points that browser extractors (mammoth.js, pdf.js) pass through
 * untouched — only the server-side JavaScript PRASER does the encoding work. The
 * frontend sends plain text submissions only (no file → request-carried
 * `text` field).
 *
 * Backend handles:  TXT (read), PDF (PRASER), DOCX (PRASER)
 */
export function createParser({ saveOriginal, pdfParser, docxParser } = {}) {
  /**
   * @param file multer file
   * @param out  optional per-CALL slot: the PRASER parsers fill it with the
   *             service job their parse created ({ job }). Concurrent callers
   *             must read the job from here, never from the parser's shared
   *             `lastJob` — two uploads in flight overwrite that one.
   */
  return async function parseFile(file, out = null, options = {}) {
    const savedPath = await saveOriginal(file);
    if (options.onSaved) await options.onSaved(savedPath);
    const ext = file.originalname.split('.').pop().toLowerCase();
    let textContent;
    if (ext === 'txt') {
      textContent = await fs.readFile(savedPath, 'utf8');
    } else if (ext === 'pdf') {
      if (!pdfParser) throw new Error('PDF parser not configured');
      textContent = await pdfParser(savedPath, out, options);
    } else if (ext === 'docx') {
      if (!docxParser) throw new Error('DOCX parser not configured');
      textContent = await docxParser(savedPath, out, options);
    } else {
      throw new Error(`Unsupported file type: ${ext}`);
    }
    return { textContent, savedPath, originalName: file.originalname };
  };
}