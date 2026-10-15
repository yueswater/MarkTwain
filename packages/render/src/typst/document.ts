import type { Block, IrDocument } from "../ir/types";
import { renderBlock, renderBlocks, type BlockContext } from "./blocks";

export type TypstKind = "abstract" | "acknowledgement" | "denotation" | "chapter" | "appendix";

export type TypstFile = {
  /** File content */
  text: string;
  /** Start line of each top level block in the output, counted from 1 and indexed like IrDocument.blocks. Null when a block produced no output. */
  blockLines: (number | null)[];
};

export type TypstOptions = BlockContext & {
  kind: TypstKind;
  /** Appendix, the first one resets the heading counter */
  firstAppendix?: boolean;
  /** Puts a marker before every top level block that tells where it landed on the page, so the preview can follow the editor */
  anchors?: boolean;
};

const IMPORTS = ['#import "/helper/mod.typ": *', '#import "/marktwain.typ": statement, statement-ref, mtpos'];

function abstractFunction(classes: string[]): "abstract-zh" | "abstract-en" | null {
  if (classes.includes("abstract-zh")) return "abstract-zh";
  if (classes.includes("abstract-en")) return "abstract-en";
  return null;
}

/** Turns one document into a Typst content file, see the file mapping and template vocabulary in section 5 of the spec. */
export function renderTypstFile(doc: IrDocument, options: TypstOptions): TypstFile {
  const lines: string[] = [];
  const push = (...next: string[]) => lines.push(...next);

  push(...IMPORTS, "");
  if (options.kind === "acknowledgement") push("#show: acknowledgement", "");
  if (options.kind === "denotation") push("#show: denotation", "");
  if (options.kind === "appendix") {
    push('#set heading(numbering: "A.1")');
    if (options.firstAppendix) push("#counter(heading).update(0)");
    push("");
  }

  const blockLines: (number | null)[] = [];
  /** The marker of the next block, a line of its own before it */
  const anchor = () => (options.anchors ? [`#mtpos("${doc.documentId.replace(/[^\w-]/g, "_")}:${blockLines.length}")`] : []);
  const emit = (block: Block, wrapIn?: string): void => {
    const body = renderBlock(block, options);
    if (body.length === 0) {
      blockLines.push(null);
      return;
    }
    push(...anchor());
    blockLines.push(lines.length + 1 + (wrapIn ? 1 : 0));
    if (wrapIn) push(`#${wrapIn}(keywords: ${wrapIn === "abstract-zh" ? "cfg.keywords" : "cfg.keywords-en"})[`);
    push(...body);
    if (wrapIn) push("]");
    push("");
  };

  if (options.kind === "abstract") {
    // Abstract, divs .abstract-zh and .abstract-en each become one abstract, without divs the whole document is the Chinese abstract
    const hasDivs = doc.blocks.some((b) => b.type === "div" && abstractFunction(b.classes));
    if (hasDivs) {
      for (const block of doc.blocks) {
        const fn = block.type === "div" ? abstractFunction(block.classes) : null;
        if (block.type === "div" && fn) {
          const inner = renderBlocks(block.children, options);
          blockLines.push(lines.length + 2);
          push(`#${fn}(keywords: ${fn === "abstract-zh" ? "cfg.keywords" : "cfg.keywords-en"})[`, ...inner, "]", "");
        } else emit(block);
      }
    } else {
      const inner = renderBlocks(doc.blocks, options);
      const first = lines.length + 2; // The line after the abstract call
      push("#abstract-zh(keywords: cfg.keywords)[", ...inner, "]", "");
      doc.blocks.forEach((_, i) => blockLines.push(i === 0 ? first : null));
    }
  } else {
    doc.blocks.forEach((block) => emit(block));
  }

  return { text: lines.join("\n").replace(/\n+$/, "") + "\n", blockLines };
}
