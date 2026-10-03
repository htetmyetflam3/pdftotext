const JOBS = new Set(['extracting', 'ocr', 'extracting-analysis', 'conversion-analysis']);
const METHODS = new Set(['default', 'manual', 'null']);
const OUTPUTS = new Set(['txt', 'docx', 'pdf']);
export function managerPayload(intent) {
  if (!JOBS.has(intent.job)) throw new Error('Unsupported manager job');
  if (!METHODS.has(intent.method)) throw new Error('Unsupported manager method');
  if (!OUTPUTS.has(intent.outputFormat)) throw new Error('Unsupported output format');
  return {
    job: intent.job,
    method: intent.method,
    output: intent.source === 'analysis' || intent.job === 'conversion-analysis' ? 'docx' : intent.desired ?? intent.outputFormat,
  };
}