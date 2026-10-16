import { locate, type LineMap } from "./diagnostics";
import type { Diagnostic } from "./types";

const FILE_ERROR = /^(?:\.\/)?(.+?\.(?:tex|cls|sty|bbl|aux|toc|lof|lot)):(\d+): (.*)$/;
const BANG_ERROR = /^! (.*)$/;
const SOURCE_LINE = /^l\.(\d+) /;
const UNDEFINED = /LaTeX Warning: (Reference|Citation) `([^']*)' on page (\d+) undefined on input line (\d+)/;

const MISSING_GLYPH = /Missing character: There is no (.+?) \(U\+([0-9A-Fa-f]+)\) in font/;

const empty = { file: null, line: null, column: null, source: null };

/** Reads the log of XeLaTeX run with -file-line-error, an error names the file and the line, and the lines after it say what was wrong. */
export function parseTexLog(log: string, lineMap: LineMap): Diagnostic[] {
  const lines = log.split(/\r?\n/);
  const found: Diagnostic[] = [];
  const seen = new Set<string>();
  const missingChars: string[] = [];
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
      // TeX goes on after an error that it says it ignored, the PDF is made. The glue one comes with every long table and means nothing.
      const ignored = /^ignored error:/.test(head);
      if (ignored && /Infinite glue shrinkage/.test(head)) continue;
      found.push({ severity: ignored ? "warning" : "error", message, file: path, line: number, column: null, source: locate(lineMap, path, number) });
      continue;
    }
    const glyph = MISSING_GLYPH.exec(text);
    if (glyph) {
      const char = String.fromCodePoint(Number.parseInt(glyph[2] ?? "0", 16));
      if (!missingChars.includes(char)) missingChars.push(char);
      continue;
    }
    const undefinedName = UNDEFINED.exec(text);
    if (undefinedName) {
      const [, kind = "", key = "", page = ""] = undefinedName;
      // One for each name, the page of the first use is the one that is told
      const once = `undefined ${kind.toLowerCase()} ${key}`;
      if (!seen.has(once)) {
        seen.add(once);
        found.push({ severity: "warning", message: `${once} on page ${page}`, ...empty });
      }
    }
  }
  // A character that the font does not have prints as an empty box, the log says so once for each use
  if (missingChars.length > 0) found.push({ severity: "warning", code: "glyph-missing", message: missingChars.join(" "), ...empty });
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
