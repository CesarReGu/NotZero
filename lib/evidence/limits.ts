export const EVIDENCE_LIMITS = {
  combinedFiles: 9,
  curriculumFiles: 1,
  supportingFiles: 3,
  projectFiles: 5,
  fileBytes: 2 * 1024 * 1024,
  totalBytes: 8 * 1024 * 1024,
  charactersPerFile: 80_000,
  totalCharacters: 240_000,
} as const;

export const ACADEMIC_EXTENSIONS = new Set([".pdf", ".txt", ".md", ".csv", ".json"]);
export const PROJECT_EXTENSIONS = new Set([
  ".txt", ".md", ".json", ".csv", ".ts", ".tsx", ".js", ".jsx",
  ".py", ".java", ".cs", ".go", ".rs", ".rb", ".php", ".sql",
  ".html", ".css", ".scss", ".xml", ".yml", ".yaml", ".toml", ".ini",
]);

export const IGNORED_OR_SECRET_NAMES = [
  /^\.env(?:\.|$)/i,
  /(?:^|[._-])secrets?(?:[._-]|$)/i,
  /(?:^|[._-])credentials?(?:[._-]|$)/i,
  /(?:^|[._-])private[_-]?key(?:[._-]|$)/i,
  /(?:^|[._-])id_rsa(?:\.|$)/i,
  /package-lock\.json$/i,
  /(?:^|\/)node_modules(?:\/|$)/i,
  /(?:^|\/)(?:dist|build|coverage|\.next)(?:\/|$)/i,
];
