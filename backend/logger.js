export const palette = {
  rst: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  keyword: '\x1b[38;5;203m',
  string: '\x1b[38;5;114m',
  func: '\x1b[38;5;215m',
  var: '\x1b[38;5;251m',
  num: '\x1b[38;5;75m',
  method: '\x1b[38;5;80m',
  op: '\x1b[38;5;183m',
  comment: '\x1b[38;5;245m',
  brace: '\x1b[38;5;215m',
  http: '\x1b[30;104m',
  site: '\x1b[30;102m',
  engine: '\x1b[30;105m',
  ok: '\x1b[38;5;114m',
  err: '\x1b[38;5;203m',
  warn: '\x1b[38;5;215m',
  info: '\x1b[38;5;80m',
  proc: '\x1b[38;5;183m',
};
export const moduleBadges = {
  HTTP: { code: palette.http, label: 'HTTP' },
  SITE: { code: palette.site, label: 'SITE' },
  ENGINE: { code: palette.engine, label: 'ENGINE' },
};
export const statusColors = {
  success: palette.ok,
  fail: palette.err,
  error: palette.err,
  processing: palette.proc,
  info: palette.info,
  warn: palette.warn,
};
export function stamp() {
  const now = new Date();
  const d = now.toLocaleString('en-GB', {
    timeZone: 'Asia/Yangon',
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const ms = String(now.getMilliseconds()).padStart(3, '0');
  return `${d}.${ms}`;
}
export function log(...args) {
  console.log(`[${stamp()}]`, ...args);
}
export default {
  palette,
  moduleBadges,
  statusColors,
  stamp,
  log,
};