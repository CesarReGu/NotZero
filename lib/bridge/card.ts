import type { CurrentPracticePack, KnowledgeBridgeReport } from "@/lib/domain/schemas";

export function bridgeCardContent(report: KnowledgeBridgeReport, pack: CurrentPracticePack) {
  const coverage = report.requirementCoverage ?? [];
  const connected = coverage.filter((item) => ["current", "transferable", "small_bridge"].includes(item.group)).length;
  const bridge = report.findings.find((finding) => finding.group === "small_bridge") ?? report.findings.find((finding) => finding.group === "transferable") ?? report.findings[0];
  return {
    headline: connected > 0 ? `Your evidence connects to ${connected} of ${coverage.length} reviewed requirements.` : "Your evidence needs a more specific bridge.",
    bridge: bridge.title,
    action: report.nextSteps[0].title,
    counts: [
      { value: report.counts.current + report.counts.transferable, label: "supported strengths" },
      { value: report.counts.smallBridge, label: "practical bridges" },
      { value: report.counts.genuineGap, label: "genuine gaps" },
      { value: report.counts.insufficientEvidence, label: "unknowns" },
    ],
    marketDate: pack.observedThrough,
  };
}

function wrappedLines(context: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (context.measureText(candidate).width <= maxWidth) line = candidate;
    else { if (line) lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  return lines;
}

export async function downloadBridgeCard(report: KnowledgeBridgeReport, pack: CurrentPracticePack) {
  const content = bridgeCardContent(report, pack);
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 630;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser cannot create the bridge card.");

  context.fillStyle = "#f6f7fb";
  context.fillRect(0, 0, 1200, 630);
  context.fillStyle = "#11162a";
  context.fillRect(0, 0, 1200, 14);
  context.fillStyle = "#3347e8";
  context.fillRect(64, 62, 54, 6);
  context.font = "800 24px ui-sans-serif, system-ui, sans-serif";
  context.fillStyle = "#3347e8";
  context.fillText("NOTZERO", 64, 110);
  context.font = "700 18px ui-monospace, monospace";
  context.fillStyle = "#5b6278";
  context.fillText(`KNOWLEDGE BRIDGE · MARKET ${content.marketDate}`, 64, 145);

  context.font = "750 54px ui-sans-serif, system-ui, sans-serif";
  context.fillStyle = "#11162a";
  wrappedLines(context, content.headline, 760).slice(0, 3).forEach((line, index) => context.fillText(line, 64, 225 + index * 62));

  const countColors = ["#009e73", "#d55e00", "#882255", "#697085"];
  content.counts.forEach((item, index) => {
    const x = 850 + (index % 2) * 145;
    const y = 190 + Math.floor(index / 2) * 150;
    context.fillStyle = countColors[index];
    context.fillRect(x, y, 112, 5);
    context.font = "800 48px ui-sans-serif, system-ui, sans-serif";
    context.fillStyle = "#11162a";
    context.fillText(String(item.value), x, y + 58);
    context.font = "700 14px ui-sans-serif, system-ui, sans-serif";
    context.fillStyle = "#5b6278";
    wrappedLines(context, item.label, 115).forEach((line, lineIndex) => context.fillText(line, x, y + 84 + lineIndex * 18));
  });

  context.fillStyle = "#ffffff";
  context.fillRect(64, 430, 1072, 142);
  context.strokeStyle = "#d9ddea";
  context.strokeRect(64, 430, 1072, 142);
  context.font = "800 14px ui-monospace, monospace";
  context.fillStyle = "#8f3f00";
  context.fillText("SHORTEST BRIDGE", 88, 465);
  context.font = "750 24px ui-sans-serif, system-ui, sans-serif";
  context.fillStyle = "#11162a";
  context.fillText(content.bridge.slice(0, 66), 88, 500);
  context.font = "800 14px ui-monospace, monospace";
  context.fillStyle = "#3347e8";
  context.fillText("FIRST MOVE", 620, 465);
  context.font = "750 24px ui-sans-serif, system-ui, sans-serif";
  context.fillStyle = "#11162a";
  wrappedLines(context, content.action, 480).slice(0, 2).forEach((line, index) => context.fillText(line, 620, 500 + index * 30));

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("The bridge card could not be encoded.");
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "notzero-knowledge-bridge.png";
  link.click();
  URL.revokeObjectURL(url);
}
