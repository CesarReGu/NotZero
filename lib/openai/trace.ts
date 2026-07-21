/**
 * Safe, redacted diagnostics for one Responses API call.
 *
 * Trace events deliberately contain request shape and response metadata only.
 * They never contain prompts, uploaded text, structured output, API keys, or
 * response content. This makes them useful for diagnosing stalls and token
 * limits without turning the temporary Download Log into a data exfiltration
 * path.
 */
export type ModelTraceEvent = {
  id: string;
  at: string;
  kind: "request" | "response" | "retry" | "error";
  label: string;
  model?: string;
  reasoningEffort?: string;
  attempt?: number;
  status?: number;
  durationMs?: number;
  requestBytes?: number;
  inputCharacters?: number;
  maxOutputTokens?: number;
  tools?: string[];
  responseStatus?: string;
  responseId?: string;
  incompleteReason?: string;
  outputItemTypes?: string[];
  outputTextCharacters?: number;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    reasoningTokens?: number;
    totalTokens?: number;
  };
  waitMs?: number;
  errorCode?: string;
  retryable?: boolean;
  message?: string;
};

export type ModelTraceSink = (event: ModelTraceEvent) => void;

export function createTraceEvent(event: Omit<ModelTraceEvent, "id" | "at">): ModelTraceEvent {
  return { id: crypto.randomUUID(), at: new Date().toISOString(), ...event };
}

export function safeTraceMessage(message: string, max = 320) {
  return message.replace(/[\r\n\t]+/g, " ").slice(0, max);
}
