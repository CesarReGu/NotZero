import { readServerConfig } from "@/lib/config/server";

export async function GET() {
  const config = readServerConfig();

  return Response.json({
    status: "ok",
    analysisVersion: config.analysisVersion,
    liveAnalysisEnabled: config.liveAnalysisEnabled,
    allowUserKeys: config.allowUserKeys,
    model: config.model,
    fastModel: config.fastModel,
    searchModel: config.searchModel,
    reasoningEffort: config.reasoningEffort,
    fastReasoningEffort: config.fastReasoningEffort,
    searchReasoningEffort: config.searchReasoningEffort,
    operationalControls: {
      sessionRequestLimit: config.sessionRequestLimit,
      sessionLiveLimit: config.sessionLiveLimit,
      globalLiveLimit: config.globalLiveLimit,
      cacheTtlSeconds: config.cacheTtlSeconds,
    },
  });
}
