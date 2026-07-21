import { extractText, getDocumentProxy } from "unpdf";
import type { EvidenceSource, EvidenceSourceType } from "@/lib/domain/schemas";
import { ACADEMIC_EXTENSIONS, EVIDENCE_LIMITS, IGNORED_OR_SECRET_NAMES, PROJECT_EXTENSIONS } from "@/lib/evidence/limits";

export type ExtractedSource = {
  metadata: EvidenceSource;
  normalizedText: string;
};

export class EvidenceInputError extends Error {
  constructor(public code: string, message: string, public status = 400) {
    super(message);
  }
}

function extensionOf(name: string) {
  const match = name.toLowerCase().match(/\.[a-z0-9]+$/);
  return match?.[0] ?? "";
}

function normalizeText(value: string) {
  return value
    .normalize("NFKC")
    .replace(/\r\n?/g, "\n")
    .replace(/[\t\u00a0]+/g, " ")
    .replace(/[ ]{2,}/g, " ")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

async function sha256(value: Uint8Array | string) {
  const input = typeof value === "string" ? new TextEncoder().encode(value) : value;
  const digest = await crypto.subtle.digest("SHA-256", new Uint8Array(input).buffer);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function scanSensitiveContent(text: string) {
  const patterns = [
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i,
    /\bsk-[A-Za-z0-9_-]{20,}\b/,
    /\b(?:api[_-]?key|secret|password)\s*[:=]\s*["']?[^\s"']{10,}/i,
    /\bAKIA[0-9A-Z]{16}\b/,
  ];
  return patterns.some((pattern) => pattern.test(text));
}

function scanPersonalContent(text: string) {
  return /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(text)
    || /\b(?:\+?\d[\s().-]?){9,14}\b/.test(text);
}

export async function extractEvidenceFile(
  file: File,
  sourceType: EvidenceSourceType,
  index: number,
): Promise<{ source: ExtractedSource; warnings: string[] }> {
  const name = file.name.replaceAll("\\", "/");
  if (IGNORED_OR_SECRET_NAMES.some((pattern) => pattern.test(name))) {
    throw new EvidenceInputError("rejected_filename", `${file.name} is ignored because it may contain secrets, dependencies, or generated output.`);
  }
  if (file.size === 0 || file.size > EVIDENCE_LIMITS.fileBytes) {
    throw new EvidenceInputError("file_size", `${file.name} must be between 1 byte and 2 MB.`);
  }
  const extension = extensionOf(name);
  const allowed = sourceType === "curriculum" || sourceType === "supporting_document"
    ? ACADEMIC_EXTENSIONS
    : new Set([...ACADEMIC_EXTENSIONS, ...PROJECT_EXTENSIONS]);
  if (!allowed.has(extension)) {
    throw new EvidenceInputError("unsupported_file", `${file.name} is not an accepted ${sourceType.replaceAll("_", " ")} file.`);
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  let text: string;
  let pageCount: number | undefined;
  if (extension === ".pdf") {
    try {
      const pdf = await getDocumentProxy(bytes);
      const extracted = await extractText(pdf, { mergePages: true });
      text = extracted.text;
      pageCount = extracted.totalPages;
    } catch {
      throw new EvidenceInputError("unreadable_file", `${file.name} could not be read as a PDF.`);
    }
  } else {
    if (bytes.includes(0)) {
      throw new EvidenceInputError("binary_file", `${file.name} appears to be binary rather than readable text.`);
    }
    text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  }

  const normalizedText = normalizeText(text).slice(0, EVIDENCE_LIMITS.charactersPerFile);
  if (normalizedText.length < 20) {
    throw new EvidenceInputError("insufficient_text", `${file.name} does not contain enough readable text to analyze.`);
  }

  const warnings: string[] = [];
  if (scanSensitiveContent(normalizedText)) {
    throw new EvidenceInputError("secret_detected", `${file.name} appears to contain a credential or private key. Remove it before continuing.`);
  }
  if (scanPersonalContent(normalizedText)) {
    warnings.push(`${file.name} may contain personal contact information. Review it before analysis.`);
  }
  if (text.length > EVIDENCE_LIMITS.charactersPerFile) {
    warnings.push(`${file.name} was limited to the first ${EVIDENCE_LIMITS.charactersPerFile.toLocaleString("en-US")} characters.`);
  }

  const contentHash = await sha256(bytes);
  const normalizedHash = await sha256(normalizedText.toLowerCase().replace(/\s+/g, " "));
  const safeId = `source-${index + 1}-${normalizedHash.slice(0, 10)}`;
  return {
    source: {
      metadata: {
        id: safeId,
        name,
        sourceType,
        mimeType: file.type || (extension === ".pdf" ? "application/pdf" : "text/plain"),
        sizeBytes: file.size,
        contentHash,
        normalizedHash,
        characterCount: normalizedText.length,
        pageCount,
      },
      normalizedText,
    },
    warnings,
  };
}

export function lineExcerpt(text: string, startLine: number, endLine = startLine) {
  return text.split("\n").slice(startLine - 1, endLine).join("\n").trim();
}
