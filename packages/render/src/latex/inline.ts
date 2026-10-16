import { STATEMENT_PREFIXES, statementKindOfPrefix } from "@marktwain/schema";
import type { Inline } from "../ir/types";
import { escapeCode, escapeTex, escapeUrl, safeKey } from "./escape";
import { isBalanced, mathFallback } from "./math";

export type InlineContext = {
  /** Called when a formula cannot be set, so the build can report it */
  onMathFailure: (latex: string) => void;
  /** False when the project has no bibliography file, citations then render as plain text */
  hasBibliography?: boolean;
  /** Called with the keys of a citation that fell back to plain text */
  onCitationFallback?: (keys: string[]) => void;
  /** The keys that the bibliography has, null when they are not known. A citation of another key stays plain text. */
  knownCitationKeys?: ReadonlySet<string> | null;
  /** Called with the keys that are not in the bibliography */
  onUnknownCitation?: (keys: string[]) => void;
};

const CITE_COMMAND = { paren: "citep", prose: "citet", author: "citeauthor", year: "citeyear" } as const;

/** The command of the template that writes a reference, by the kind of its target. */
const REF_COMMAND: Record<string, string> = { fig: "figref", tbl: "tblref", lst: "lstref", eq: "eqref" };

function renderOne(node: Inline, ctx: InlineContext): string {
  switch (node.type) {
    case "text": {
      let text = escapeTex(node.text);
      if (node.marks.includes("bold")) text = `\\textbf{${text}}`;
      if (node.marks.includes("italic")) text = `\\textit{${text}}`;
      if (node.marks.includes("strike")) text = `\\mtstrike{${text}}`;
      return node.link ? `\\href{${escapeUrl(node.link)}}{${text}}` : text;
    }
    case "code":
      return `\\mtcode{${escapeCode(node.text)}}`;
    case "math": {
      const latex = node.latex.trim();
      if (latex !== "" && isBalanced(latex)) return `$${latex}$`;
      ctx.onMathFailure(node.latex);
      return mathFallback(node.latex, false);
    }
    case "break":
      return "\\newline{}";
    case "footnote":
      return `\\footnote{${renderInline(node.content, ctx)}}`;
    case "citation": {
      if (ctx.hasBibliography === false) {
        ctx.onCitationFallback?.(node.keys);
        return escapeTex(`[${node.keys.join("; ")}]`);
      }
      const known = ctx.knownCitationKeys;
      const unknown = known ? node.keys.filter((key) => !known.has(key)) : [];
      if (unknown.length > 0) ctx.onUnknownCitation?.(unknown);
      const present = node.keys.filter((key) => !unknown.includes(key));
      const plain = unknown.length > 0 ? escapeTex(unknown.map((key) => `[${key}]`).join("")) : "";
      return `${present.length > 0 ? `\\${CITE_COMMAND[node.form]}{${present.map(safeKey).join(",")}}` : ""}${plain}`;
    }
    case "ref": {
      // A block of a mathematical thesis writes its own name and number
      if (STATEMENT_PREFIXES.includes(node.kind)) {
        const kind = statementKindOfPrefix(node.kind);
        return `\\mtstatementref{${kind?.id ?? node.kind}}{${node.label}}`;
      }
      return `\\${REF_COMMAND[node.kind] ?? "ref"}{${node.label}}`;
    }
  }
}

/** Turns inline nodes into LaTeX text. */
export function renderInline(nodes: Inline[], ctx: InlineContext): string {
  return nodes.map((node) => renderOne(node, ctx)).join("");
}
