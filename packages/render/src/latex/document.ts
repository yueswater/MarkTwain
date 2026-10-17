import type { Block, IrDocument } from "../ir/types";
import { renderBlock, renderBlocks, type BlockContext } from "./blocks";

export type LatexKind = "abstract" | "abstractEn" | "acknowledgement" | "denotation" | "chapter" | "appendix";

export type LatexFile = {
  /** File content */
  text: string;
  /** Start line of each top level block in the output, counted from 1 and indexed like IrDocument.blocks. Null when a block produced no output. */
  blockLines: (number | null)[];
};

export type LatexOptions = BlockContext & { kind: LatexKind };

function abstractEnvironment(classes: string[]): "abstractzh" | "abstracten" | null {
  if (classes.includes("abstract-zh")) return "abstractzh";
  if (classes.includes("abstract-en")) return "abstracten";
  return null;
}

/** Turns one document into a LaTeX content file, see the file mapping and template vocabulary in section 5 of the spec. */
export function renderLatexFile(doc: IrDocument, options: LatexOptions): LatexFile {
  const lines: string[] = [];
  const blockLines: (number | null)[] = [];
  const push = (...next: string[]) => lines.push(...next);

  const emit = (block: Block): void => {
    const body = renderBlock(block, options);
    if (body.length === 0) {
      blockLines.push(null);
      return;
    }
    blockLines.push(lines.length + 1);
    push(...body, "");
  };

  // The template has an environment for each of these, it writes the title of the section and what follows the text
  const wrapper = options.kind === "acknowledgement" ? "acknowledgement" : options.kind === "denotation" ? "denotation" : null;

  if (options.kind === "abstractEn") {
    // The whole document is the English abstract
    const inner = renderBlocks(doc.blocks, options);
    const first = lines.length + 2;
    push("\\begin{abstracten}", ...inner, "\\end{abstracten}", "");
    doc.blocks.forEach((_, i) => blockLines.push(i === 0 ? first : null));
  } else if (options.kind === "abstract") {
    // Divs .abstract-zh and .abstract-en each become one abstract, without divs the whole document is the Chinese abstract
    const hasDivs = doc.blocks.some((b) => b.type === "div" && abstractEnvironment(b.classes));
    if (hasDivs) {
      for (const block of doc.blocks) {
        const env = block.type === "div" ? abstractEnvironment(block.classes) : null;
        if (block.type === "div" && env) {
          const inner = renderBlocks(block.children, options);
          blockLines.push(lines.length + 2);
          push(`\\begin{${env}}`, ...inner, `\\end{${env}}`, "");
        } else emit(block);
      }
    } else {
      const inner = renderBlocks(doc.blocks, options);
      const first = lines.length + 2;
      push("\\begin{abstractzh}", ...inner, "\\end{abstractzh}", "");
      doc.blocks.forEach((_, i) => blockLines.push(i === 0 ? first : null));
    }
  } else {
    if (wrapper) push(`\\begin{${wrapper}}`);
    doc.blocks.forEach((block) => emit(block));
    if (wrapper) {
      if (lines.at(-1) === "") lines.pop();
      push(`\\end{${wrapper}}`, "");
    }
  }

  return { text: lines.join("\n").replace(/\n+$/, "") + "\n", blockLines };
}
