import type { Inline } from "../ir/types";
import { escapeMarkup, escapeString, ZWSP } from "./escape";
import { convertMath, mathFallback } from "./math";

export type InlineContext = {
  /** 公式轉換失敗時呼叫，讓建置回報 */
  onMathFailure: (latex: string) => void;
  /** False when the project has no bibliography file; citations then render as plain text. */
  hasBibliography?: boolean;
  /** Called with the keys of a citation that fell back to plain text. */
  onCitationFallback?: (keys: string[]) => void;
};

type Piece = { text: string; call: boolean };

const CITE_FUNCTION = { paren: "cp", prose: "c", author: "ca", year: "cy" } as const;

function wrap(marks: string[], text: string): string {
  return marks.reduce((inner, mark) => `#${mark}[${inner}]`, text);
}

function renderOne(node: Inline, ctx: InlineContext): Piece {
  switch (node.type) {
    case "text": {
      const marks = [
        ...(node.marks.includes("bold") ? ["strong"] : []),
        ...(node.marks.includes("italic") ? ["emph"] : []),
        ...(node.marks.includes("strike") ? ["strike"] : []),
      ];
      let text = escapeMarkup(node.text);
      if (node.link) {
        text = `#link("${escapeString(node.link)}")[${text}]`;
        return { text: wrap(marks, text), call: true };
      }
      return marks.length > 0 ? { text: wrap(marks, text), call: true } : { text, call: false };
    }
    case "code":
      return { text: `#raw("${escapeString(node.text)}")`, call: true };
    case "math": {
      const result = convertMath(node.latex);
      if (result.ok) return { text: `$${result.typst}$`, call: false };
      ctx.onMathFailure(node.latex);
      return { text: mathFallback(node.latex, false), call: true };
    }
    case "break":
      return { text: " \\\n", call: false };
    case "footnote":
      return { text: `#footnote[${renderInline(node.content, ctx)}]`, call: true };
    case "citation": {
      if (ctx.hasBibliography === false) {
        ctx.onCitationFallback?.(node.keys);
        return { text: escapeMarkup(`[${node.keys.join("; ")}]`), call: false };
      }
      const fn = CITE_FUNCTION[node.form];
      return { text: node.keys.map((key) => `#${fn}("${escapeString(key)}")`).join(""), call: true };
    }
    case "ref":
      return { text: `#ref(<${node.label}>)`, call: true };
  }
}

/** 行內節點轉 Typst 標記文字。 */
export function renderInline(nodes: Inline[], ctx: InlineContext): string {
  const pieces = nodes.map((node) => renderOne(node, ctx));
  let out = "";
  for (const [index, piece] of pieces.entries()) {
    const next = pieces[index + 1];
    out += piece.text;
    // `#strong[...]` 後面直接接 `(` 會被當成參數列
    if (piece.call && next && next.text.startsWith("(")) out += ZWSP;
  }
  return out;
}
