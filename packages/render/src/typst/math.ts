import { tex2typst } from "tex2typst";
import { escapeString } from "./escape";

export type MathResult = { ok: true; typst: string } | { ok: false };

/** LaTeX 公式轉 Typst 數學；轉換失敗時 ok 為 false，由呼叫端退回原始碼顯示。 */
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

/** 公式轉換失敗時顯示的原始碼（等寬字，連同 `$` 一起，讓作者看得出是公式）。 */
export function mathFallback(latex: string, display: boolean): string {
  const wrapped = display ? `$$ ${latex.trim()} $$` : `$${latex.trim()}$`;
  return `#raw("${escapeString(wrapped)}")`;
}
