import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { extname } from "node:path";

const tracked = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
  .split("\0")
  .filter(Boolean);

const forbiddenNames = [
  /(^|\/)\.env(\.|$)/i,
  /(^|\/)AGENTS\.md$/i,
  /(^|\/)OPENAI_BUILD_WEEK_REQUIREMENTS\.md$/i,
  /(^|\/)(uploads?|analysis-cache|data\/private)(\/|$)/i,
  /(^|\/)(credentials?|secrets?)(\.|\/|$)/i,
];
const forbiddenExtensions = new Set([
  ".dll",
  ".dylib",
  ".exe",
  ".key",
  ".p12",
  ".pem",
  ".so",
]);
const secretPatterns = [
  /sk-[A-Za-z0-9_-]{20,}/,
  /gh[pousr]_[A-Za-z0-9]{20,}/,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /(?:OPENAI_API_KEY|GITHUB_TOKEN)\s*=\s*[^\s#]+/,
];

const violations = [];
let scanned = 0;
for (const path of tracked) {
  // A file deleted in the working tree is still listed until the deletion is
  // staged. It has no content to scan, so skip it rather than crash.
  if (!existsSync(path)) continue;
  scanned += 1;
  if (path !== ".env.example" && forbiddenNames.some((pattern) => pattern.test(path))) {
    violations.push(`${path}: forbidden tracked path`);
    continue;
  }
  if (forbiddenExtensions.has(extname(path).toLowerCase())) {
    violations.push(`${path}: unexpected binary or credential extension`);
    continue;
  }

  const contents = readFileSync(path);
  if (contents.includes(0)) continue;
  const text = contents.toString("utf8");
  for (const pattern of secretPatterns) {
    if (pattern.test(text)) {
      violations.push(`${path}: matched sensitive-value pattern`);
      break;
    }
  }
}

if (violations.length) {
  throw new Error(`Repository audit failed:\n${violations.join("\n")}`);
}

console.log(`Audited ${scanned} of ${tracked.length} tracked files. No blocked paths or obvious secrets found.`);
