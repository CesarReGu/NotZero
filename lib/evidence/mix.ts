import type { EvidenceClass, EvidenceLedger } from "@/lib/domain/schemas";

const evidenceClassOrder: EvidenceClass[] = ["demonstrated", "expected_exposure", "self_reported", "inferred", "unknown"];

export function deriveEvidenceMix(ledger: EvidenceLedger) {
  return evidenceClassOrder.map((evidenceClass) => ({
    evidenceClass,
    count: ledger.claims.filter((claim) => claim.evidenceClass === evidenceClass).length,
  }));
}
