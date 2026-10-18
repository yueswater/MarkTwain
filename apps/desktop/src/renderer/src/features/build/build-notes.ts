import type { BuildDiagnostic } from "../../../../shared/ipc";

export type WarningItem =
  | { kind: "configMissing"; fields: string[] }
  | { kind: "citation"; keys: string[] }
  | { kind: "unknownCitation"; keys: string[] }
  | { kind: "glyphMissing"; chars: string }
  | { kind: "brokenRef"; label: string; source: BuildDiagnostic["source"] }
  | { kind: "duplicateLabel"; label: string; source: BuildDiagnostic["source"] }
  | { kind: "defaultChapter"; title: string; source: BuildDiagnostic["source"] }
  | { kind: "image"; reason: "missing" | "unreadable"; source: BuildDiagnostic["source"] }
  | { kind: "approximate"; feature: string }
  | { kind: "math"; latex: string }
  | { kind: "font"; font: string }
  | { kind: "other"; message: string; file: string | null; line: number | null; source: BuildDiagnostic["source"] };

const FONT = /^unknown font family:\s*(.+)$/i;

/** Everything the warning area lists. The area is shown only when this is not empty. */
export function warningItems(diagnostics: readonly BuildDiagnostic[], mathFailures: readonly string[]): WarningItem[] {
  const warnings = diagnostics.filter((d) => d.severity === "warning");
  const items: WarningItem[] = [];

  // One line for all unfilled settings and one for all citations without a bibliography
  const fields = warnings.filter((d) => d.code === "config-missing").map((d) => d.message);
  if (fields.length > 0) items.push({ kind: "configMissing", fields });
  const keys = warnings.filter((d) => d.code === "citation-no-bibliography").map((d) => d.message);
  if (keys.length > 0) items.push({ kind: "citation", keys });
  for (const d of warnings) if (d.code === "glyph-missing") items.push({ kind: "glyphMissing", chars: d.message });
  // A reference to something that is not in the thesis prints its label, so it is listed with its block
  for (const d of warnings) if (d.code === "reference-broken") items.push({ kind: "brokenRef", label: d.message, source: d.source });
  for (const d of warnings) if (d.code === "label-duplicate") items.push({ kind: "duplicateLabel", label: d.message, source: d.source });
  // A chapter that was made and never written in
  for (const d of warnings) if (d.code === "default-chapter") items.push({ kind: "defaultChapter", title: d.message, source: d.source });
  // Every picture is listed with the block that holds it, so it can be found
  for (const d of warnings) {
    if (d.code === "image-missing" || d.code === "image-unreadable") items.push({ kind: "image", reason: d.code === "image-missing" ? "missing" : "unreadable", source: d.source });
  }
  const unknown = warnings.filter((d) => d.code === "citation-unknown").map((d) => d.message);
  if (unknown.length > 0) items.push({ kind: "unknownCitation", keys: unknown });

  // A feature that LaTeX output only approximates, each is listed once
  for (const d of warnings.filter((w) => w.code === "latex-approximate")) items.push({ kind: "approximate", feature: d.message });

  for (const latex of mathFailures) items.push({ kind: "math", latex });

  const seen = new Set<string>();
  for (const d of warnings) {
    if (d.code === "config-missing" || d.code === "citation-no-bibliography" || d.code === "citation-unknown" || d.code === "image-missing" || d.code === "image-unreadable" || d.code === "glyph-missing" || d.code === "reference-broken" || d.code === "label-duplicate" || d.code === "latex-approximate" || d.code === "default-chapter") continue;
    // A warning that repeats on every page is listed once
    if (seen.has(d.message)) continue;
    seen.add(d.message);
    const font = FONT.exec(d.message);
    if (font) items.push({ kind: "font", font: font[1]!.trim() });
    else items.push({ kind: "other", message: d.message, file: d.file, line: d.line, source: d.source });
  }
  return items;
}

/** The area under the pages exists only when there is an error or something to list. */
export function showNotes(errors: readonly BuildDiagnostic[], items: readonly WarningItem[]): boolean {
  return errors.length > 0 || items.length > 0;
}

/** The name of a field of the thesis settings for a key of config.yml, title-en is titleEn, so the label of the field can be found. */
export function configFieldName(key: string): string {
  return key.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

export type FriendlyKind = "picture" | "duplicate" | "reference" | "command" | "brackets" | "missingFile" | "capacity" | "other";

/**
 * What an error of the build means for the person who writes, from the words of Typst and of TeX.
 * The raw message stays, it is the detail for someone who knows the tool and for a bug report.
 */
export function friendlyKind(message: string): FriendlyKind {
  if (/failed to decode image|unable to load picture|cannot determine size of graphic|unknown graphics extension|image format/i.test(message)) return "picture";
  if (/label .* occurs multiple times|multiply[- ]defined/i.test(message)) return "duplicate";
  if (/label .* does not exist|cannot reference|reference .* undefined/i.test(message)) return "reference";
  if (/undefined control sequence|unknown variable|unknown (math )?(symbol|command)/i.test(message)) return "command";
  if (/missing [$}{] inserted|extra [}{]|unclosed delimiter|unexpected closing|runaway argument|file ended while scanning/i.test(message)) return "brackets";
  if (/file not found|file .* not found|no such file|failed to load file/i.test(message)) return "missingFile";
  if (/capacity exceeded|emergency stop/i.test(message)) return "capacity";
  return "other";
}

/** The command that TeX or Typst did not know, from its message, null when the message does not name one. */
export function unknownCommandOf(message: string): string | null {
  const tex = /undefined control sequence[\s\S]*?(\\[A-Za-z@]+)/i.exec(message);
  if (tex) return tex[1] ?? null;
  const typst = /unknown variable:\s*([^\s,]+)/i.exec(message);
  return typst ? (typst[1] ?? null) : null;
}
