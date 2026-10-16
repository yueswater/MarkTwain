import type { BuildDiagnostic } from "../../../../shared/ipc";

export type WarningItem =
  | { kind: "configMissing"; fields: string[] }
  | { kind: "citation"; keys: string[] }
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

  // A feature that LaTeX output only approximates, each is listed once
  for (const d of warnings.filter((w) => w.code === "latex-approximate")) items.push({ kind: "approximate", feature: d.message });

  for (const latex of mathFailures) items.push({ kind: "math", latex });

  const seen = new Set<string>();
  for (const d of warnings) {
    if (d.code === "config-missing" || d.code === "citation-no-bibliography" || d.code === "latex-approximate") continue;
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
