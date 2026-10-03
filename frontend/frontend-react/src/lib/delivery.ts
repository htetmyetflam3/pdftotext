/**
 * The delivery side of `POST /api/submit` — what happens after the job is
 * accepted. Implemented backend-side in `gateway/queue/processingQueue.js`
 * (`publicQueueStatus`) and `gateway/api/incoming.js`.
 *
 *   GET /api/submit/status/:submitId   → the public projection below
 *   GET /api/submit/file/:submitId     → the artifact, when state is FINISHED
 *
 * Queue state is authoritative and status reads are observation only: the
 * status route never advances processing, so polling is safe to leave running
 * and safe to stop at any time.
 *
 * The browser is only ever given the six public fields. `inputPath`,
 * `managerPath`, `finalPath`, `sessionId`, hashes and the retained request
 * metadata stay server-side, and `readDelivery` reads nothing else, so a
 * backend that over-shares cannot leak into the UI by accident.
 */

export type JobState =
  | "RECEIVED"
  | "SITE_PROCESSING"
  | "SOURCE_READY"
  | "ENGINE_ACCEPTED"
  | "ANALYSING"
  | "FINISHED"
  | "FAILED"
  | "EXPIRED";

export type Delivery = {
  submitId: string;
  state: JobState | "UNKNOWN";
  finalFilename: string | null;
  finalBytes: number | null;
  downloadUrl: string | null;
  error: string | null;
};

/** Terminal states mean "stop polling". */
export const TERMINAL_STATES: JobState[] = ["FINISHED", "FAILED", "EXPIRED"];

export const isTerminal = (state: string): boolean =>
  TERMINAL_STATES.includes(state as JobState);

export const statusUrlFor = (submitId: string) =>
  `/api/submit/status/${encodeURIComponent(submitId)}`;

export const downloadUrlFor = (submitId: string) =>
  `/api/submit/file/${encodeURIComponent(submitId)}`;

const str = (value: unknown): string | null =>
  typeof value === "string" && value ? value : null;

const num = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

/**
 * Normalise either the 202 body or a status body into one shape.
 *
 * The 202 carries `status` (authoritative) plus `processing` (the projection);
 * the status endpoint returns the projection on its own. Both are read, so the
 * SPA works against either response without branching at the call site.
 */
export function readDelivery(body: unknown, fallbackSubmitId = ""): Delivery {
  const b = (body ?? {}) as Record<string, any>;
  const p = (b.processing && typeof b.processing === "object" ? b.processing : b) as Record<
    string,
    any
  >;

  const submitId = str(p.submitId) ?? str(b.submitId) ?? fallbackSubmitId;
  // "pending" was a hard-coded placeholder the backend has since removed; it
  // was never a queue state, so never report it as one.
  const raw = str(p.state) ?? str(b.status);
  const state = (raw && raw !== "pending" ? raw : "UNKNOWN") as Delivery["state"];

  return {
    submitId,
    state,
    finalFilename: str(p.finalFilename),
    finalBytes: num(p.finalBytes),
    downloadUrl:
      str(p.downloadUrl) ?? (state === "FINISHED" && submitId ? downloadUrlFor(submitId) : null),
    error: str(p.error),
  };
}

/**
 * Hidden analysis processing — DISABLED, and by design it never becomes a
 * frontend concern.
 *
 * The frontend knows exactly one submission endpoint: POST /api/submit. Both
 * upload forms hit it and differ only in the metadata (`task`). Analysis
 * submissions stop after the normal Site submission result — no second
 * request ever leaves the page, whatever the task is. Any future analysis
 * processing is driven from the submission's metadata on the server side,
 * after the savers; the queue is the medium, the ordinary read-only
 * status/file routes are the delivery, and this switch exists only to make
 * "no hidden request is made" explicit in the shipped code.
 */
export const ANALYSIS_HIDDEN_ENDPOINT: string | null = null;

export type PollOptions = {
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  /** called on every observed state, so the panel can narrate progress */
  onUpdate?: (delivery: Delivery) => void;
  attempts?: number;
  intervalMs?: number;
  signal?: { aborted: boolean };
};

export const POLL_ATTEMPTS = 40;
export const POLL_INTERVAL_MS = 1500;

/**
 * Poll until terminal, aborted, or the attempt cap. Observation only — the
 * server never advances a job because it was polled.
 *
 * Never throws: the upload already succeeded, so a failed status check is
 * reported as a delivery carrying `error` rather than losing the job.
 */
export async function pollDelivery(
  submitId: string,
  {
    fetchImpl = fetch,
    sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    onUpdate,
    attempts = POLL_ATTEMPTS,
    intervalMs = POLL_INTERVAL_MS,
    signal,
  }: PollOptions = {}
): Promise<Delivery> {
  let last: Delivery = {
    submitId,
    state: "UNKNOWN",
    finalFilename: null,
    finalBytes: null,
    downloadUrl: null,
    error: null,
  };

  for (let attempt = 0; attempt < attempts; attempt++) {
    if (signal?.aborted) return last;

    try {
      const response = await fetchImpl(statusUrlFor(submitId));
      if (response.ok) {
        last = readDelivery(await response.json(), submitId);
      } else {
        last = { ...last, error: `The status endpoint answered ${response.status}.` };
      }
    } catch (error) {
      last = {
        ...last,
        error: error instanceof Error ? error.message : "The status check failed.",
      };
    }

    onUpdate?.(last);
    if (isTerminal(last.state)) return last;

    if (attempt < attempts - 1) await sleep(intervalMs);
  }

  return {
    ...last,
    error: last.error ?? "The job is still running. Check back in a moment.",
  };
}

/** Human-facing label for a state the user may sit on for a while. */
export function stateLabel(state: string): string {
  switch (state) {
    case "RECEIVED":
      return "Queued";
    case "SITE_PROCESSING":
      return "Converting…";
    case "SOURCE_READY":
      return "Converted — preparing…";
    case "ENGINE_ACCEPTED":
    case "ANALYSING":
      return "Analysing…";
    case "FINISHED":
      return "Ready";
    case "FAILED":
      return "Failed";
    case "EXPIRED":
      return "Expired";
    default:
      return "Working…";
  }
}
