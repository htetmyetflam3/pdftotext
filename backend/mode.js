export const MODE_DEV = 'development';
export const MODE_PROD = 'production';
export function rawMode() {
  return String(process.env.MODE ?? '').trim();
}
export function modeSet() {
  return rawMode() !== '';
}
/**
 * The mode in force: 'development' only for an explicit MODE=development,
 * 'production' for everything else — including unset and unrecognised values.
 */
export function currentMode() {
  return rawMode().toLowerCase() === MODE_DEV ? MODE_DEV : MODE_PROD;
}
export function isDevelopment() {
  return currentMode() === MODE_DEV;
}
export function isProduction() {
  return currentMode() === MODE_PROD;
}
/**
 * How to name the mode in a message, truthfully for all three states:
 * `MODE=development` | `MODE=production` | `MODE unset (→ production)`.
 * A banner that said "MODE=production" when the variable was never set would be
 * the same kind of half-truth this module was written to remove.
 */
export function modeLabel() {
  if (modeUnrecognised()) return `MODE=${JSON.stringify(rawMode())} (→ ${MODE_PROD})`;
  if (!modeSet()) return `MODE unset (→ ${MODE_PROD})`;
  return `MODE=${currentMode()}`;
}
export function modeUnrecognised() {
  const raw = rawMode().toLowerCase();
  return raw !== '' && raw !== MODE_DEV && raw !== MODE_PROD;
}
/**
 * Boot banner, or null when there is nothing worth saying.
 *
 * MODE=production needs no line of its own (that is the quiet, enforced
 * posture — the devbypass banners speak when a flag was set and ignored).
 * MODE=development is announced because it is the one state that can open
 * doors, and an unset/typo'd MODE is announced because "I set MODE, why is
 * everything 403" is the failure this module exists to make visible.
 */
export function modeBanner() {
  if (modeUnrecognised()) {
    return `[mode] MODE=${JSON.stringify(rawMode())} is not "${MODE_DEV}" or "${MODE_PROD}" — treating it as ${MODE_PROD}. Set MODE=${MODE_DEV} for the dev posture.`;
  }
  if (!modeSet()) {
    return `[mode] MODE is unset — treating it as ${MODE_PROD}: every dev bypass is inert even with its flag set. Set MODE=${MODE_DEV} for the dev posture (NODE_ENV is not read for this).`;
  }
  if (isDevelopment()) {
    return `[mode] MODE=${MODE_DEV} — dev posture: DEV_BYPASS_*/ALLOW_AGENT_UPLOAD may open their gates.`;
  }
  return null;
}