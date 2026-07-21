import type { EvidenceSourceType } from "@/lib/domain/schemas";

/**
 * The combined uploader deliberately does not ask a person to label every
 * file. These labels are only provisional routing hints for provenance and
 * project-grounded walkthroughs. The extraction model still interprets the
 * contents and may treat a file differently from its filename hint.
 */
export type ClassifiedEvidenceFile = {
  file: File;
  sourceType: EvidenceSourceType;
};

const CODE_EXTENSIONS = new Set([
  ".c", ".cc", ".cpp", ".cs", ".css", ".go", ".html", ".java", ".js", ".jsx", ".php",
  ".py", ".rb", ".rs", ".scss", ".sql", ".ts", ".tsx", ".xml", ".yml", ".yaml",
]);

const CURRICULUM_NAME = /(?:curriculum|study[-_ ]?plan|syllabus|degree[-_ ]?plan|course[-_ ]?plan|academic[-_ ]?plan|transcript)/i;
const PROJECT_NAME = /(?:capstone|final[-_ ]?project|project|readme|source|src|app|server|train|evaluate|report|description|assignment|portfolio)/i;
const PROFESSIONAL_TASK_NAME = /(?:professional|client|work[-_ ]?sample|brief|case[-_ ]?study|task)/i;

function extensionOf(name: string) {
  const match = name.toLowerCase().match(/\.[a-z0-9]+$/);
  return match?.[0] ?? "";
}

function normalizedName(file: File) {
  return file.name.replaceAll("\\", "/").split("/").pop()?.toLowerCase() ?? "";
}

export function classifyCombinedFiles(inputFiles: File[]): {
  files: ClassifiedEvidenceFile[];
  warnings: string[];
} {
  let curriculumAssigned = false;
  const files = inputFiles.map((file) => {
    const name = normalizedName(file);
    const extension = extensionOf(name);
    let sourceType: EvidenceSourceType = "supporting_document";

    // Source files are the strongest project signal and must be recognized
    // before a generic filename such as "project.py" can match another rule.
    if (CODE_EXTENSIONS.has(extension)) {
      sourceType = "source_file";
    } else if (!curriculumAssigned && CURRICULUM_NAME.test(name)) {
      sourceType = "curriculum";
      curriculumAssigned = true;
    } else if (PROFESSIONAL_TASK_NAME.test(name)) {
      sourceType = "professional_task";
    } else if (PROJECT_NAME.test(name)) {
      sourceType = "project_artifact";
    }

    return { file, sourceType };
  });

  const warnings = [
    "Files were uploaded as one combined evidence set. NotZero used filenames and extensions only as provisional routing hints; the extraction model still interprets each file's content.",
  ];
  if (!files.some((item) => item.sourceType === "curriculum")) {
    warnings.push("No filename clearly identified a curriculum or study-plan document. The model will infer context from the available material, and curriculum-specific conclusions may remain unknown.");
  }

  return { files, warnings };
}
