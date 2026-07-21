/**
 * Shared reader for OpenAI Responses API output. All four NotZero stages
 * (evidence extraction, practice-pack generation, bridge comparison, and the
 * guided-program solution layer) call the Responses API with strict JSON Schema
 * output, so they share one robust reader.
 *
 * It exists to close two silent-failure modes that produced opaque "the model
 * response did not include structured output text" errors in production. The
 * first is truncation: at high reasoning effort a response can spend its whole
 * output-token budget on reasoning and return `status: "incomplete"` with no
 * output text. The second is a safety refusal. Both are turned into typed,
 * actionable errors here so a caller can record and safely retry them instead of
 * degrading the whole analysis into a confusing partial result.
 */

export type ModelOutputReason = "incomplete" | "refusal" | "empty";

export class ModelOutputError extends Error {
  constructor(message: string, public reason: ModelOutputReason, public retryable: boolean) {
    super(message);
    this.name = "ModelOutputError";
  }
}

/**
 * A non-2xx HTTP response from the Responses API, carrying the status and the
 * OpenAI error `code`/`type` so a caller can tell a transient rate limit apart
 * from a terminal quota or key problem instead of collapsing all of 401/403/429
 * into one opaque message. The status and code stay in the {@link Error.message}
 * too, so string-based classification (and server logs) keep working.
 */
export class OpenAiRequestError extends Error {
  constructor(message: string, public status: number, public code: string | undefined, public retryable: boolean) {
    super(message);
    this.name = "OpenAiRequestError";
  }
}

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
// A sustained token-per-minute limit is the pipeline's most likely failure at
// high reasoning effort: several large calls fire in the same minute, so one
// stage can trip the bucket even when the key and quota are fine. OpenAI says
// unsuccessful requests still count toward the limit, so an immediate resend
// never helps — the only fix is to wait for the bucket to refill. These bound
// that wait so a single call stays well inside a stage lease.
const DEFAULT_MAX_RATE_LIMIT_RETRIES = 3;
const MAX_BACKOFF_MS = 4_000;

const sleepReal = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, Math.max(0, ms)));

type ResponsesErrorBody = { error?: { message?: string; type?: string; code?: string } };

function parseErrorBody(raw: string): { code?: string; type?: string; message?: string } {
  try {
    const parsed = JSON.parse(raw) as ResponsesErrorBody;
    return { code: parsed.error?.code, type: parsed.error?.type, message: parsed.error?.message };
  } catch {
    return {};
  }
}

// A transient, worth-waiting rate limit: a 429 the body explicitly marks as a
// rate limit (rate_limit_exceeded, or a per-requests/per-tokens limit). A 429
// marked insufficient_quota is a billing wall, not a rate limit, and a 429 with
// no recognizable signal is treated as terminal rather than retried blindly.
function isRateLimited(status: number, code?: string, type?: string): boolean {
  if (status !== 429) return false;
  if (code === "insufficient_quota" || type === "insufficient_quota") return false;
  return code === "rate_limit_exceeded" || code === "rate_limit_reached" || type === "tokens" || type === "requests";
}

// "1.5s", "6ms", "1m2s", or a bare seconds count (Retry-After). Returns NaN when
// nothing usable is present so the caller falls back to exponential backoff.
function parseResetHeader(value: string): number {
  const trimmed = value.trim();
  if (/^\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed) * 1000;
  let total = 0;
  let matched = false;
  for (const [, amount, unit] of trimmed.matchAll(/(\d+(?:\.\d+)?)(ms|h|m|s)/g)) {
    matched = true;
    const n = Number(amount);
    total += unit === "ms" ? n : unit === "s" ? n * 1000 : unit === "m" ? n * 60_000 : n * 3_600_000;
  }
  return matched ? total : NaN;
}

function retryDelayMs(response: Response, attempt: number): number {
  const header =
    response.headers.get("retry-after") ??
    response.headers.get("x-ratelimit-reset-tokens") ??
    response.headers.get("x-ratelimit-reset-requests");
  const fromHeader = header ? parseResetHeader(header) : NaN;
  const base = Number.isFinite(fromHeader) ? fromHeader : 500 * 2 ** attempt;
  const jitter = base * 0.25 * Math.random();
  return Math.min(MAX_BACKOFF_MS, base + jitter);
}

/**
 * The one place every stage sends a Responses API request. It returns the parsed
 * JSON body on success and, on failure, either waits out a transient rate limit
 * and retries or throws a typed {@link OpenAiRequestError} the job layer can
 * classify. `sleep` is injectable so tests exercise the backoff path with no
 * real delay. `fetcher` is injectable for the same reason the adapters already
 * inject it.
 */
export async function requestResponses(args: {
  fetcher: typeof fetch;
  apiKey: string;
  body: string;
  label: string;
  sleep?: (ms: number) => Promise<void>;
  maxRateLimitRetries?: number;
}): Promise<unknown> {
  const sleep = args.sleep ?? sleepReal;
  const maxRetries = args.maxRateLimitRetries ?? DEFAULT_MAX_RATE_LIMIT_RETRIES;
  for (let attempt = 0; ; attempt += 1) {
    const response = await args.fetcher(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${args.apiKey}`, "Content-Type": "application/json" },
      body: args.body,
    });
    if (response.ok) return await response.json();

    const status = response.status;
    const raw = await response.text().catch(() => "");
    const { code, type, message } = parseErrorBody(raw);
    const rateLimited = isRateLimited(status, code, type);

    if (rateLimited && attempt < maxRetries) {
      const wait = retryDelayMs(response, attempt);
      console.warn(`[NotZero] ${args.label} rate-limited (429 ${code ?? type ?? "rate_limit"}); waiting ${Math.round(wait)}ms then retrying (${attempt + 1}/${maxRetries}).`);
      await sleep(wait);
      continue;
    }

    const codeLabel = code ?? type;
    const detail = codeLabel ? ` (${codeLabel})` : "";
    const providerMessage = message ? ` ${message}` : "";
    // A 5xx is transient, and a rate limit that outlived the retries is still
    // transient (the visitor can retry once the window clears). Everything else
    // — a rejected key, denied access, or exhausted quota — is the visitor's to
    // fix and must not be retried.
    const error = new OpenAiRequestError(
      `OpenAI ${args.label} failed with status ${status}${detail}.${providerMessage}`.trimEnd(),
      status,
      codeLabel,
      status >= 500 || rateLimited,
    );
    console.warn(`[NotZero] ${args.label} failed: ${status}${detail}.`);
    throw error;
  }
}

/**
 * True when an error is the visitor's to fix and must never be silently retried
 * or degraded past: a rejected key (401), denied access (403), or exhausted
 * quota (429 insufficient_quota). A transient rate limit is explicitly not
 * terminal — the pipeline should wait and retry or fall back instead.
 */
export function isTerminalKeyError(error: unknown): boolean {
  if (error instanceof OpenAiRequestError) {
    if (error.status === 401 || error.status === 403) return true;
    if (error.status === 429) return !error.retryable;
    return false;
  }
  if (error instanceof Error) {
    if (/\binsufficient_quota\b/.test(error.message)) return true;
    if (/\brate_limit_exceeded\b/.test(error.message)) return false;
    return /failed with status 40[13]\b|failed with status 429\b/.test(error.message);
  }
  return false;
}

type ResponsesContent = { type?: string; text?: string; refusal?: string };
type ResponsesBody = {
  status?: string;
  incomplete_details?: { reason?: string } | null;
  output?: Array<{ content?: ResponsesContent[] } | null> | null;
};

/**
 * Extracts the single structured-output text block from a Responses API body,
 * or throws a typed {@link ModelOutputError}. A missing `status` is treated as a
 * completed response, so deterministic test fixtures that return only
 * `{ output: [...] }` keep working.
 */
export function readResponseOutputText(body: unknown): string {
  const parsed = (body ?? {}) as ResponsesBody;

  if (parsed.status === "incomplete") {
    const reason = parsed.incomplete_details?.reason ?? "unknown";
    throw new ModelOutputError(
      reason === "max_output_tokens"
        ? "The model reached its output-token limit before completing the structured result. This is usually transient and safe to retry."
        : `The model stopped before completing the structured result (${reason}).`,
      "incomplete",
      true,
    );
  }

  for (const item of parsed.output ?? []) {
    for (const content of item?.content ?? []) {
      if (typeof content?.refusal === "string" && content.refusal.length > 0) {
        throw new ModelOutputError(`The model declined to produce this result: ${content.refusal}`, "refusal", false);
      }
    }
  }

  for (const item of parsed.output ?? []) {
    for (const content of item?.content ?? []) {
      if (content?.type === "output_text" && typeof content.text === "string" && content.text.length > 0) {
        return content.text;
      }
    }
  }

  throw new ModelOutputError("The model response did not include structured output text.", "empty", true);
}

/**
 * True when an error is worth another attempt with the same inputs: a truncated
 * or empty structured result, or a retryable upstream status (429 is excluded on
 * purpose because it means a rate or spending limit the caller must surface).
 */
export function isRetryableModelError(error: unknown): boolean {
  if (error instanceof ModelOutputError) return error.retryable;
  if (error instanceof OpenAiRequestError) return error.retryable;
  if (error instanceof Error) {
    // A rate limit carries its code in the message even when it is not an
    // OpenAiRequestError; a 5xx is transient. A bare 429 with no rate-limit
    // signal stays non-retryable (a resend only burns more of the budget).
    if (/\brate_limit_exceeded\b/.test(error.message)) return true;
    return /failed with status 5\d\d\b/.test(error.message);
  }
  return false;
}
