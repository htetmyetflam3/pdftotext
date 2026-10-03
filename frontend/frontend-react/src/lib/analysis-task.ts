/**
 * The analysis-task module — the mirror's copy of
 * `frontend-bootstrap/js/analysis-task.js` (types added, logic untouched).
 *
 * A separate session for the task token, living in the build part of an
 * upload: `buildPayload()` runs after the yes/no loop and asks THIS module —
 * not the old `task: flow` line — what the final task is.
 *
 * Conversion sends `conversion` unchanged. Analysis adds its job variant at
 * the request boundary: extracting-analysis → analysis-extracting and
 * conversion-analysis → analysis-conversion. The backend normalizes the
 * accepted pair back to canonical task `analysis` for the queue.
 */
export type AnalysisVariant = "extracting" | "conversion";
export type AnalysisTask = "analysis" | `analysis-${AnalysisVariant}`;

export const ANALYSIS_TASK = "analysis";
export const ANALYSIS_TASK_PREFIX = "analysis-";
export const ANALYSIS_VARIANTS: AnalysisVariant[] = ["extracting", "conversion"];

/** "analysis-$" → "$" ; bare "analysis" → "" ; anything else → null. */
export function analysisVariantFromTask(task = ""): AnalysisVariant | "" | null {
  if (task === ANALYSIS_TASK) return "";
  if (!String(task).startsWith(ANALYSIS_TASK_PREFIX)) return null;
  const variant = String(task).slice(ANALYSIS_TASK_PREFIX.length);
  return (ANALYSIS_VARIANTS as string[]).includes(variant)
    ? (variant as AnalysisVariant)
    : null;
}

/** "$-analysis" → "$" ; anything else → null. */
export function analysisVariantFromJob(job = ""): AnalysisVariant | null {
  if (!String(job).endsWith("-analysis")) return null;
  const variant = String(job).slice(0, job.length - "-analysis".length);
  return (ANALYSIS_VARIANTS as string[]).includes(variant)
    ? (variant as AnalysisVariant)
    : null;
}

/**
 * The override: called from the build part, after the yes/no loop, instead
 * of the previous `task: flow`. Analysis flows become the suffixed token
 * whose variant comes from the routed job (the yes/no answer is already
 * inside route()'s job); unknown variants fall back to bare "analysis".
 */
export function overrideTask(flow: string, job?: string): string {
  if (flow !== ANALYSIS_TASK) return flow;
  const variant = analysisVariantFromJob(job ?? "");
  return variant ? `${ANALYSIS_TASK_PREFIX}${variant}` : ANALYSIS_TASK;
}
