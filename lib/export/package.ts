import type { CurrentPracticePack, EvidenceLedger, KnowledgeBridgeReport } from "@/lib/domain/schemas";
import { buildPackageEntries } from "@/lib/export/documents";
import { createZip } from "@/lib/export/zip";

export async function downloadBridgePackage(
  report: KnowledgeBridgeReport,
  ledger: EvidenceLedger,
  pack: CurrentPracticePack,
  subjectLabel?: string,
) {
  const entries = buildPackageEntries(report, ledger, pack, subjectLabel);
  const blob = createZip(entries);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `notzero-knowledge-bridge-${report.generatedAt.slice(0, 10)}.zip`;
  link.click();
  // Revoking immediately can cancel the download in some browsers, so the URL is
  // released after the click has been handled.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return { fileCount: entries.length };
}
