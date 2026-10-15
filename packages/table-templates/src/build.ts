import { resolveParams, type Language, type ParamValue, type Template } from "./schema";
import { SHAPES } from "./shapes";

/** The table of a template as Markdown, for the language that is asked for and the parameters given, the missing ones take their defaults. */
export function buildTable(template: Template, language: Language, given: Record<string, ParamValue | undefined> = {}): string {
  const shape = SHAPES[template.shape];
  if (!shape) throw new Error(`unknown shape ${template.shape}`);
  return shape({ params: resolveParams(template, given), labels: template.labels[language] });
}
