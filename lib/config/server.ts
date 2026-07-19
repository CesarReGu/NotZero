import "server-only";
import { z } from "zod";

const serverConfigSchema = z.object({
  OPENAI_API_KEY: z.string().min(1).optional(),
  NOTZERO_MODEL: z.string().min(1).default("gpt-5.6"),
  NOTZERO_ENABLE_LIVE_ANALYSIS: z.enum(["true", "false"]).default("false"),
  NOTZERO_ANALYSIS_VERSION: z.string().min(1).default("phase-5"),
  NOTZERO_SESSION_REQUEST_LIMIT: z.coerce.number().int().min(1).max(100).default(8),
  NOTZERO_SESSION_LIVE_LIMIT: z.coerce.number().int().min(1).max(20).default(3),
  NOTZERO_GLOBAL_LIVE_LIMIT: z.coerce.number().int().min(1).max(10_000).default(25),
  NOTZERO_CACHE_TTL_SECONDS: z.coerce.number().int().min(60).max(86_400).default(1_800),
});

export type ServerConfig = {
  model: string;
  liveAnalysisEnabled: boolean;
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
    liveAnalysisEnabled: result.data.NOTZERO_ENABLE_LIVE_ANALYSIS === "true",
    analysisVersion: result.data.NOTZERO_ANALYSIS_VERSION,
    hasOpenAIKey: Boolean(result.data.OPENAI_API_KEY),
    sessionRequestLimit: result.data.NOTZERO_SESSION_REQUEST_LIMIT,
    sessionLiveLimit: result.data.NOTZERO_SESSION_LIVE_LIMIT,
    globalLiveLimit: result.data.NOTZERO_GLOBAL_LIVE_LIMIT,
    cacheTtlSeconds: result.data.NOTZERO_CACHE_TTL_SECONDS,
  };
}
