import "server-only";
import { z } from "zod";

const emptyAsUnset = (value: unknown) => value === "" ? undefined : value;

// GPT-5.6 reasoning effort levels documented for the Responses API.
export const reasoningEffortSchema = z.enum(["none", "low", "medium", "high", "xhigh", "max"]);
export type ReasoningEffort = z.infer<typeof reasoningEffortSchema>;

const serverConfigSchema = z.object({
  OPENAI_API_KEY: z.preprocess(emptyAsUnset, z.string().min(1).optional()),
  // GPT-5.6 Luna is reserved for the comparison and guided-program stages.
  NOTZERO_MODEL: z.string().min(1).default("gpt-5.6-luna"),
  // GPT-5.4 nano handles extraction and classification. GPT-5.4 mini handles
  // current-posting search. Both are official API model IDs, not ChatGPT UI
  // labels, and both support the Responses API and structured outputs.
  NOTZERO_FAST_MODEL: z.string().min(1).default("gpt-5.4-nano"),
  NOTZERO_SEARCH_MODEL: z.string().min(1).default("gpt-5.4-mini"),
  NOTZERO_REASONING_EFFORT: reasoningEffortSchema.default("medium"),
  NOTZERO_FAST_REASONING_EFFORT: reasoningEffortSchema.default("low"),
  NOTZERO_SEARCH_REASONING_EFFORT: reasoningEffortSchema.default("low"),
  NOTZERO_ENABLE_LIVE_ANALYSIS: z.enum(["true", "false"]).default("false"),
  // Grounds generated (non-curated) packs in real postings found by GPT-5.6 web
  // search. When off, those fields still work but fall back to representative
  // role archetypes. Turn off for a model tier without the web-search tool so a
  // known-unsupported search is not attempted on every analysis.
  NOTZERO_ENABLE_JOB_SEARCH: z.enum(["true", "false"]).default("true"),
  // Allows a visitor to run live analysis with their own OpenAI key, sent per
  // request and never stored. Deployments that must not accept outside keys can
  // turn it off.
  NOTZERO_ALLOW_USER_KEYS: z.enum(["true", "false"]).default("true"),
  NOTZERO_ANALYSIS_VERSION: z.string().min(1).default("phase-7"),
  NOTZERO_SESSION_REQUEST_LIMIT: z.coerce.number().int().min(1).max(100).default(8),
  NOTZERO_SESSION_LIVE_LIMIT: z.coerce.number().int().min(1).max(20).default(3),
  NOTZERO_GLOBAL_LIVE_LIMIT: z.coerce.number().int().min(1).max(10_000).default(25),
  NOTZERO_CACHE_TTL_SECONDS: z.coerce.number().int().min(60).max(86_400).default(1_800),
});

export type ServerConfig = {
  model: string;
  fastModel: string;
  searchModel: string;
  reasoningEffort: ReasoningEffort;
  fastReasoningEffort: ReasoningEffort;
  searchReasoningEffort: ReasoningEffort;
  liveAnalysisEnabled: boolean;
  jobSearchEnabled: boolean;
  allowUserKeys: boolean;
  analysisVersion: string;
  hasOpenAIKey: boolean;
  sessionRequestLimit: number;
  sessionLiveLimit: number;
  globalLiveLimit: number;
  cacheTtlSeconds: number;
};

export function readServerConfig(environment = process.env): ServerConfig {
  const result = serverConfigSchema.safeParse(environment);
  if (!result.success) {
    const fields = result.error.issues.map((issue) => issue.path.join(".")).join(", ");
    throw new Error(`Invalid server configuration: ${fields}`);
  }

  if (result.data.NOTZERO_ENABLE_LIVE_ANALYSIS === "true" && !result.data.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required when live analysis is enabled.");
  }

  return {
    model: result.data.NOTZERO_MODEL,
    fastModel: result.data.NOTZERO_FAST_MODEL,
    searchModel: result.data.NOTZERO_SEARCH_MODEL,
    reasoningEffort: result.data.NOTZERO_REASONING_EFFORT,
    fastReasoningEffort: result.data.NOTZERO_FAST_REASONING_EFFORT,
    searchReasoningEffort: result.data.NOTZERO_SEARCH_REASONING_EFFORT,
    liveAnalysisEnabled: result.data.NOTZERO_ENABLE_LIVE_ANALYSIS === "true",
    jobSearchEnabled: result.data.NOTZERO_ENABLE_JOB_SEARCH === "true",
    allowUserKeys: result.data.NOTZERO_ALLOW_USER_KEYS === "true",
    analysisVersion: result.data.NOTZERO_ANALYSIS_VERSION,
    hasOpenAIKey: Boolean(result.data.OPENAI_API_KEY),
    sessionRequestLimit: result.data.NOTZERO_SESSION_REQUEST_LIMIT,
    sessionLiveLimit: result.data.NOTZERO_SESSION_LIVE_LIMIT,
    globalLiveLimit: result.data.NOTZERO_GLOBAL_LIVE_LIMIT,
    cacheTtlSeconds: result.data.NOTZERO_CACHE_TTL_SECONDS,
  };
}
