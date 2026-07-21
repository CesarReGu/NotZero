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
  if (error instanceof Error) return /failed with status 5\d\d\b/.test(error.message);
  return false;
}
