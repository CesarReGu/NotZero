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

import { createTraceEvent, safeTraceMessage, type ModelTraceSink } from "@/lib/openai/trace";

export type ModelOutputReason = "incomplete" | "refusal" | "empty";

export class ModelOutputError extends Error {
  constructor(message: string, public reason: ModelOutputReason, public retryable: boolean, public autoRetryable = true) {
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
// A stage lease is 180 seconds. Stop a stuck upstream request before that lease
// expires so a second driver cannot start the same model call and spend twice.
export const DEFAULT_REQUEST_TIMEOUT_MS = 120_000;

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

function requestShape(body: string) {
  try {
    const parsed = JSON.parse(body) as { model?: unknown; reasoning?: { effort?: unknown }; input?: unknown; max_output_tokens?: unknown; tools?: Array<{ type?: unknown }> };
    const input = typeof parsed.input === "string" ? parsed.input.length : JSON.stringify(parsed.input ?? "").length;
    return {
      model: typeof parsed.model === "string" ? parsed.model : undefined,
      reasoningEffort: typeof parsed.reasoning?.effort === "string" ? parsed.reasoning.effort : undefined,
      inputCharacters: input,
      maxOutputTokens: typeof parsed.max_output_tokens === "number" ? parsed.max_output_tokens : undefined,
      tools: Array.isArray(parsed.tools) ? parsed.tools.map((tool) => typeof tool?.type === "string" ? tool.type : "unknown") : undefined,
    };
  } catch {
    return {};
  }
}

function responseShape(body: unknown) {
  const parsed = (body ?? {}) as {
    id?: unknown;
    status?: unknown;
    incomplete_details?: { reason?: unknown } | null;
    output?: Array<{ type?: unknown; content?: Array<{ type?: unknown; text?: unknown }> } | null> | null;
    usage?: { input_tokens?: unknown; output_tokens?: unknown; total_tokens?: unknown; output_tokens_details?: { reasoning_tokens?: unknown } } | null;
  };
  const outputItems = Array.isArray(parsed.output) ? parsed.output : [];
  const content = outputItems.flatMap((item) => Array.isArray(item?.content) ? item.content : []);
  const outputTextCharacters = content.reduce((total, item) => total + (typeof item?.text === "string" ? item.text.length : 0), 0);
  const usage = parsed.usage;
  return {
    responseId: typeof parsed.id === "string" ? parsed.id : undefined,
    responseStatus: typeof parsed.status === "string" ? parsed.status : undefined,
    incompleteReason: typeof parsed.incomplete_details?.reason === "string" ? parsed.incomplete_details.reason : undefined,
    outputItemTypes: outputItems.flatMap((item) => typeof item?.type === "string" ? [item.type] : []).concat(content.flatMap((item) => typeof item?.type === "string" ? [item.type] : [])),
    outputTextCharacters,
    usage: usage ? {
      inputTokens: typeof usage.input_tokens === "number" ? usage.input_tokens : undefined,
      outputTokens: typeof usage.output_tokens === "number" ? usage.output_tokens : undefined,
      reasoningTokens: typeof usage.output_tokens_details?.reasoning_tokens === "number" ? usage.output_tokens_details.reasoning_tokens : undefined,
      totalTokens: typeof usage.total_tokens === "number" ? usage.total_tokens : undefined,
    } : undefined,
  };
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
  timeoutMs?: number;
  trace?: ModelTraceSink;
}): Promise<unknown> {
  const sleep = args.sleep ?? sleepReal;
  const maxRetries = args.maxRateLimitRetries ?? DEFAULT_MAX_RATE_LIMIT_RETRIES;
  const timeoutMs = args.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
  const shape = requestShape(args.body);
  for (let attempt = 0; ; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const startedAt = Date.now();
    args.trace?.(createTraceEvent({ kind: "request", label: args.label, model: shape.model, reasoningEffort: shape.reasoningEffort, attempt: attempt + 1, requestBytes: args.body.length, inputCharacters: shape.inputCharacters, maxOutputTokens: shape.maxOutputTokens, tools: shape.tools }));
    let response: Response;
    try {
      response = await args.fetcher(OPENAI_RESPONSES_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${args.apiKey}`, "Content-Type": "application/json" },
        body: args.body,
        signal: controller.signal,
      });
    } catch (error) {
      if (controller.signal.aborted) {
        const message = `OpenAI ${args.label} timed out after ${timeoutMs}ms.`;
        args.trace?.(createTraceEvent({ kind: "error", label: args.label, model: shape.model, reasoningEffort: shape.reasoningEffort, attempt: attempt + 1, durationMs: Date.now() - startedAt, errorCode: "request_timeout", retryable: true, message }));
        throw new OpenAiRequestError(message, 408, "request_timeout", true);
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
    if (response.ok) {
      try {
        const parsed = await response.json();
        args.trace?.(createTraceEvent({ kind: "response", label: args.label, model: shape.model, reasoningEffort: shape.reasoningEffort, attempt: attempt + 1, status: response.status, durationMs: Date.now() - startedAt, ...responseShape(parsed) }));
        return parsed;
      } catch (error) {
        const message = error instanceof Error ? safeTraceMessage(error.message) : "OpenAI returned an unreadable response.";
        args.trace?.(createTraceEvent({ kind: "error", label: args.label, model: shape.model, reasoningEffort: shape.reasoningEffort, attempt: attempt + 1, status: response.status, durationMs: Date.now() - startedAt, errorCode: "invalid_json", retryable: true, message }));
        throw new ModelOutputError("OpenAI returned an unreadable response.", "empty", true);
      }
    }

    const status = response.status;
    const raw = await response.text().catch(() => "");
    const { code, type, message } = parseErrorBody(raw);
    const rateLimited = isRateLimited(status, code, type);

    if (rateLimited && attempt < maxRetries) {
      const wait = retryDelayMs(response, attempt);
      args.trace?.(createTraceEvent({ kind: "retry", label: args.label, model: shape.model, reasoningEffort: shape.reasoningEffort, attempt: attempt + 1, status, durationMs: Date.now() - startedAt, waitMs: Math.round(wait), errorCode: code ?? type ?? "rate_limit", retryable: true, message: "Waiting before retrying a transient rate limit." }));
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
    args.trace?.(createTraceEvent({ kind: "error", label: args.label, model: shape.model, reasoningEffort: shape.reasoningEffort, attempt: attempt + 1, status, durationMs: Date.now() - startedAt, errorCode: codeLabel, retryable: error.retryable, message: safeTraceMessage(error.message) }));
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
        ? "The model reached its output-token limit before completing the structured result. Retry after the model route or output budget changes."
        : `The model stopped before completing the structured result (${reason}).`,
      "incomplete",
      true,
      false,
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
 * True when a caller may try the request again: a truncated or empty structured
 * result, or a retryable upstream status. The job driver applies the stricter
 * {@link isAutoRetryableModelError} policy before resending paid work.
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

/**
 * Whether the job driver may resend the same paid stage automatically. A
 * truncated structured response is retryable by a person after changing the
 * route or input, but resending it unchanged can burn the same budget again.
 * Request timeouts are treated the same way because the upstream may still
 * have consumed tokens even though this worker stopped waiting.
 */
export function isAutoRetryableModelError(error: unknown): boolean {
  if (error instanceof ModelOutputError) return error.retryable && error.autoRetryable;
  if (error instanceof OpenAiRequestError) return error.retryable && error.code !== "request_timeout";
  return isRetryableModelError(error);
}
