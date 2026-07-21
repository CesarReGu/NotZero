import { Fragment } from "react";
import type { CodeLanguage } from "@/lib/domain/schemas";

type Token = { text: string; kind: "plain" | "comment" | "string" };

const lineCommentStart: Record<CodeLanguage, string[]> = {
  typescript: ["//"],
  javascript: ["//"],
  sql: ["--"],
  dockerfile: ["#"],
  yaml: ["#"],
  shell: ["#"],
  text: [],
};

const languageLabel: Record<CodeLanguage, string> = {
  typescript: "TypeScript",
  javascript: "JavaScript",
  sql: "SQL",
  dockerfile: "Dockerfile",
  yaml: "YAML",
  shell: "Shell",
  text: "Text",
};

/**
 * Marks comments and string literals only. Restrained highlighting keeps the
 * reader on the comparison rather than on a rainbow of token colors, and a
 * hand-rolled pass avoids shipping a syntax-highlighting dependency.
 */
function tokenizeLine(line: string, language: CodeLanguage): Token[] {
  const commentMarkers = lineCommentStart[language];
  const tokens: Token[] = [];
  let buffer = "";
  let quote: string | null = null;

  const flush = (kind: Token["kind"]) => {
    if (buffer) tokens.push({ text: buffer, kind });
    buffer = "";
  };

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (quote) {
      buffer += character;
      if (character === quote && line[index - 1] !== "\\") {
        flush("string");
        quote = null;
      }
      continue;
    }
    const marker = commentMarkers.find((candidate) => line.startsWith(candidate, index));
    if (marker) {
      flush("plain");
      tokens.push({ text: line.slice(index), kind: "comment" });
      return tokens;
    }
    if (character === '"' || character === "'" || character === "`") {
      flush("plain");
      quote = character;
      buffer = character;
      continue;
    }
    buffer += character;
  }
  flush(quote ? "string" : "plain");
  return tokens;
}

export function CodePanel({
  code,
  language,
  startLine,
  label,
}: {
  code: string;
  language: CodeLanguage;
  startLine?: number | null;
  label?: string;
}) {
  const lines = code.split("\n");
  return (
    <pre className="code-panel" data-language={language} aria-label={label}>
      <code>
        {lines.map((line, index) => (
          <span className="code-line" key={index}>
            {startLine ? <span className="code-line-number" aria-hidden="true">{startLine + index}</span> : null}
            <span className="code-line-text">
              {line.length === 0 ? " " : tokenizeLine(line, language).map((token, tokenIndex) => (
                <Fragment key={tokenIndex}>
                  {token.kind === "plain" ? token.text : <span data-token={token.kind}>{token.text}</span>}
                </Fragment>
              ))}
            </span>
          </span>
        ))}
      </code>
    </pre>
  );
}

export function codeLanguageLabel(language: CodeLanguage) {
  return languageLabel[language];
}
