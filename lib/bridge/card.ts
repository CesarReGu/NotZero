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
  // The NotZero mark: same arch path as components/notzero-mark.tsx,
  // placed at 1.1 scale so its baseline sits on the wordmark baseline.
  const markPath = new Path2D("M4.5 25.6 L4.5 15.8 A 11.5 11.5 0 0 1 27.5 15.8 L27.5 25.6 A 1.4 1.4 0 0 1 26.1 27 L20.2 27 L20.2 20.3 A 6 6 0 1 0 11.8 20.3 L11.8 27 L5.9 27 A 1.4 1.4 0 0 1 4.5 25.6 Z");
  context.save();
  context.translate(62, 81.3);
  context.scale(1.1, 1.1);
  context.fillStyle = "#3347e8";
  context.fill(markPath);
  context.restore();
  context.font = "800 24px ui-sans-serif, system-ui, sans-serif";
  context.fillStyle = "#3347e8";
  context.fillText("NOTZERO", 101, 110);
  context.font = "700 18px ui-monospace, monospace";
  context.fillStyle = "#5b6278";
  context.fillText(`KNOWLEDGE BRIDGE · MARKET ${content.marketDate}`, 64, 145);

  context.font = "750 54px ui-sans-serif, system-ui, sans-serif";
  context.fillStyle = "#11162a";
  wrappedLines(context, content.headline, 760).slice(0, 3).forEach((line, index) => context.fillText(line, 64, 225 + index * 62));

  // Two rows of counts that must clear the panel at y=424, including a wrapped
  // second label line.
  const countColors = ["#009e73", "#d55e00", "#882255", "#697085"];
  content.counts.forEach((item, index) => {
    const x = 850 + (index % 2) * 145;
    const y = 178 + Math.floor(index / 2) * 126;
    context.fillStyle = countColors[index];
    context.fillRect(x, y, 112, 5);
    context.font = "800 48px ui-sans-serif, system-ui, sans-serif";
    context.fillStyle = "#11162a";
    context.fillText(String(item.value), x, y + 58);
    context.font = "700 14px ui-sans-serif, system-ui, sans-serif";
    context.fillStyle = "#5b6278";
    wrappedLines(context, item.label, 115).forEach((line, lineIndex) => context.fillText(line, x, y + 84 + lineIndex * 18));
  });

  // Two equal columns with a gutter. Both sides wrap inside their own column
  // width so a long title can never run into the neighbouring column.
  const panelTop = 424;
  const panelHeight = 158;
  const columnWidth = 476;
  const leftX = 88;
  const rightX = 636;
  context.fillStyle = "#ffffff";
  context.fillRect(64, panelTop, 1072, panelHeight);
  context.strokeStyle = "#d9ddea";
  context.strokeRect(64, panelTop, 1072, panelHeight);
  context.fillStyle = "#e4e8f4";
  context.fillRect(600, panelTop + 22, 1, panelHeight - 44);

  const columns = [
    { x: leftX, eyebrow: "SHORTEST BRIDGE", eyebrowColor: "#8f3f00", text: content.bridge },
    { x: rightX, eyebrow: "FIRST MOVE", eyebrowColor: "#3347e8", text: content.action },
  ];
  for (const column of columns) {
    context.font = "800 14px ui-monospace, monospace";
    context.fillStyle = column.eyebrowColor;
    context.fillText(column.eyebrow, column.x, panelTop + 36);
    context.font = "750 23px ui-sans-serif, system-ui, sans-serif";
    context.fillStyle = "#11162a";
    wrappedLines(context, column.text, columnWidth)
      .slice(0, 3)
      .forEach((line, index) => context.fillText(line, column.x, panelTop + 74 + index * 31));
  }

  context.font = "600 14px ui-sans-serif, system-ui, sans-serif";
  context.fillStyle = "#5b6278";
  context.fillText("Every claim traces to a submitted file and a dated posting.", 64, 606);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("The bridge card could not be encoded.");
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "notzero-knowledge-bridge.png";
  link.click();
  URL.revokeObjectURL(url);
}
