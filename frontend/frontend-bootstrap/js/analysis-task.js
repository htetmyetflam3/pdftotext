/**
 * The analysis-task module.
 *
 * A separate session for the task token, living in the build part of an
 * upload: `buildPayload()` runs after the yes/no loop and asks THIS module —
 * not the old `task: flow` line — what the final task is.
 *
 * Task is the parent upload area. Conversion sends `conversion` unchanged.
 * The analysis upload adds its job variant to the task at the request boundary:
 *
 *   extracting-analysis → analysis-extracting
 *   conversion-analysis → analysis-conversion
 *
 * The backend validates that pair and normalizes the queue record back to
 * canonical task `analysis`.
 */
export const ANALYSIS_TASK = "analysis";
export const ANALYSIS_TASK_PREFIX = "analysis-";
export const ANALYSIS_VARIANTS = ["extracting", "conversion"];
export function analysisVariantFromTask(task = "") {
  if (task === ANALYSIS_TASK) return "";
  if (!String(task).startsWith(ANALYSIS_TASK_PREFIX)) return null;
  const variant = String(task).slice(ANALYSIS_TASK_PREFIX.length);
  return ANALYSIS_VARIANTS.includes(variant) ? variant : null;
}
export function analysisVariantFromJob(job = "") {
  if (!String(job).endsWith("-analysis")) return null;
  const variant = String(job).slice(0, job.length - "-analysis".length);
  return ANALYSIS_VARIANTS.includes(variant) ? variant : null;
}
/**
 * The override: called from the build part, after the yes/no loop, instead
 * of the previous `task: flow`. Analysis flows become the suffixed token
 * whose variant comes from the routed job (the yes/no answer is already
 * inside route()'s job); unknown variants fall back to bare "analysis".
 */
export function overrideTask(flow, job) {
  if (flow !== ANALYSIS_TASK) return flow;
  const variant = analysisVariantFromJob(job);
  return variant ? `${ANALYSIS_TASK_PREFIX}${variant}` : ANALYSIS_TASK;
}