import { tex2typst } from "tex2typst";
import { escapeString } from "./escape";

export type MathResult = { ok: true; typst: string } | { ok: false };

/** Converts a LaTeX formula to Typst math, ok is false when it fails and the caller falls back to source text. */
export function convertMath(latex: string): MathResult {
  const source = latex.trim();
  if (source === "") return { ok: false };
  try {
    const typst = tex2typst(source).trim();
    return typst === "" ? { ok: false } : { ok: true, typst };
  } catch {
    return { ok: false };
  }
}

/** Source shown when a formula fails to convert, in monospace with the dollar signs so the author sees it is a formula. */
export function mathFallback(latex: string, display: boolean): string {
  const wrapped = display ? `$$ ${latex.trim()} $$` : `$${latex.trim()}$`;
  return `#raw("${escapeString(wrapped)}")`;
}
