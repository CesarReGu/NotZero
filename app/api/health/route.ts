import { readServerConfig } from "@/lib/config/server";

export async function GET() {
  const config = readServerConfig();

  return Response.json({
    status: "ok",
    analysisVersion: config.analysisVersion,
    liveAnalysisEnabled: config.liveAnalysisEnabled,
    operationalControls: {
      sessionRequestLimit: config.sessionRequestLimit,
      sessionLiveLimit: config.sessionLiveLimit,
      globalLiveLimit: config.globalLiveLimit,
      cacheTtlSeconds: config.cacheTtlSeconds,
    },
  });
}
