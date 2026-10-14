import type { Diagnostic, SourceRef } from "./types";

/** Maps a line of a generated file back to the source block. */
export type LineMap = Map<string, { documentId: string; blockLines: (number | null)[] }>;

const HEADER = /^(error|warning): (.*)$/;
const LOCATION = /([^\s:`'"]+\.typ):(\d+):(\d+)/g;

/**
 * Parses typst human readable diagnostics.
 * An error inside a template helper still names the content file in its call trace,
 * so the first location that belongs to a generated content file wins.
 */
export function parseDiagnostics(raw: string, lineMap: LineMap, root = ""): Diagnostic[] {
  const stderr = relativize(raw, root);
  const blocks: { severity: "error" | "warning"; message: string; body: string[] }[] = [];
  for (const raw of stderr.split(/\r?\n/)) {
    const header = HEADER.exec(raw);
    if (header) {
      blocks.push({ severity: header[1] === "warning" ? "warning" : "error", message: header[2] ?? "", body: [] });
    } else {
      blocks.at(-1)?.body.push(raw);
    }
  }

  return blocks.map((block) => {
    const locations = [...block.body.join("\n").matchAll(LOCATION)].map((m) => ({
      file: (m[1] ?? "").replace(/\\/g, "/"),
      line: Number(m[2]),
      column: Number(m[3]),
    }));
    const primary = locations[0];
    const mapped = locations.find((l) => lineMap.has(l.file));
    return {
      severity: block.severity,
      message: block.message,
      file: (mapped ?? primary)?.file ?? null,
      line: (mapped ?? primary)?.line ?? null,
      column: (mapped ?? primary)?.column ?? null,
      source: mapped ? locate(lineMap, mapped.file, mapped.line) : null,
    };
  });
}

/**
 * Turns absolute paths into build relative ones.
 * Windows prints them as \\?\C:\dir with backslashes, which also hides the file from the line map.
 */
export function relativize(text: string, root: string): string {
  const unix = text.replace(/\\\\\?\\/g, "").replace(/\\/g, "/");
  if (root === "") return unix;
  const base = root.replace(/\\/g, "/").replace(/\/+$/, "");
  return unix.split(`${base}/`).join("");
}

/** Finds the last block that starts on or before the line. */
export function locate(lineMap: LineMap, file: string, line: number): SourceRef | null {
  const entry = lineMap.get(file);
  if (!entry) return null;
  let found: number | null = null;
  entry.blockLines.forEach((start, block) => {
    if (start !== null && start <= line) found = block;
  });
  return found === null ? null : { documentId: entry.documentId, block: found };
}
