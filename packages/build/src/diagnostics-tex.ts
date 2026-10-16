import { locate, type LineMap } from "./diagnostics";
import type { Diagnostic } from "./types";

const FILE_ERROR = /^(?:\.\/)?(.+?\.(?:tex|cls|sty|bbl|aux|toc|lof|lot)):(\d+): (.*)$/;
const BANG_ERROR = /^! (.*)$/;
const SOURCE_LINE = /^l\.(\d+) /;
const UNDEFINED = /LaTeX Warning: (Reference|Citation) `([^']*)' on page (\d+) undefined on input line (\d+)/;

const empty = { file: null, line: null, column: null, source: null };

/** Reads the log of XeLaTeX run with -file-line-error, an error names the file and the line, and the lines after it say what was wrong. */
export function parseTexLog(log: string, lineMap: LineMap): Diagnostic[] {
  const lines = log.split(/\r?\n/);
  const found: Diagnostic[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < lines.length; i += 1) {
    const text = lines[i] ?? "";
    const file = FILE_ERROR.exec(text);
    if (file) {
      const [, path = "", line = "0", head = ""] = file;
      // The command that failed stands on the lines between the message and the line of source
      const context: string[] = [];
      for (let j = i + 1; j < Math.min(i + 8, lines.length); j += 1) {
        const next = lines[j] ?? "";
        if (SOURCE_LINE.test(next) || next.trim() === "") break;
        context.push(next.trim());
      }
      const message = [head, ...context].join(" ").slice(0, 240);
      const key = `${path}:${line}:${message}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const number = Number(line);
      found.push({ severity: "error", message, file: path, line: number, column: null, source: locate(lineMap, path, number) });
      continue;
    }
    const undefinedName = UNDEFINED.exec(text);
    if (undefinedName) {
      const [, kind = "", key = "", page = ""] = undefinedName;
      const message = `undefined ${kind.toLowerCase()} ${key} on page ${page}`;
      if (!seen.has(message)) {
        seen.add(message);
        found.push({ severity: "warning", message, ...empty });
      }
    }
  }
  // An error without a file and line, such as an emergency stop, is only used when nothing else explains the failure
  if (!found.some((d) => d.severity === "error")) {
    for (const text of lines) {
      const bang = BANG_ERROR.exec(text);
      if (bang && !seen.has(bang[1] ?? "")) {
        seen.add(bang[1] ?? "");
        found.push({ severity: "error", message: bang[1] ?? "", ...empty });
      }
    }
  }
  return found;
}
