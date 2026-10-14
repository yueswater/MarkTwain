import type { Block, IrDocument } from "../ir/types";
import { renderBlock, renderBlocks, type BlockContext } from "./blocks";

export type TypstKind = "abstract" | "acknowledgement" | "denotation" | "chapter" | "appendix";

export type TypstFile = {
  /** 檔案內容 */
  text: string;
  /** 每個頂層區塊在輸出裡的起始行（從 1 算起），與 IrDocument.blocks 同索引；沒有輸出的區塊為 null */
  blockLines: (number | null)[];
};

export type TypstOptions = BlockContext & {
  kind: TypstKind;
  /** 附錄：第一份要把標題計數歸零 */
  firstAppendix?: boolean;
};

const IMPORT = '#import "/helper/mod.typ": *';

function abstractFunction(classes: string[]): "abstract-zh" | "abstract-en" | null {
  if (classes.includes("abstract-zh")) return "abstract-zh";
  if (classes.includes("abstract-en")) return "abstract-en";
  return null;
}

/** 一份文件轉成一個 Typst 內容檔（規格第 5 節的檔案對應與模板語彙）。 */
export function renderTypstFile(doc: IrDocument, options: TypstOptions): TypstFile {
  const lines: string[] = [];
  const push = (...next: string[]) => lines.push(...next);

  push(IMPORT, "");
  if (options.kind === "acknowledgement") push("#show: acknowledgement", "");
  if (options.kind === "denotation") push("#show: denotation", "");
  if (options.kind === "appendix") {
    push('#set heading(numbering: "A.1")');
    if (options.firstAppendix) push("#counter(heading).update(0)");
    push("");
  }

  const blockLines: (number | null)[] = [];
  const emit = (block: Block, wrapIn?: string): void => {
    const body = renderBlock(block, options);
    if (body.length === 0) {
      blockLines.push(null);
      return;
    }
    blockLines.push(lines.length + 1 + (wrapIn ? 1 : 0));
    if (wrapIn) push(`#${wrapIn}(keywords: ${wrapIn === "abstract-zh" ? "cfg.keywords" : "cfg.keywords-en"})[`);
    push(...body);
    if (wrapIn) push("]");
    push("");
  };

  if (options.kind === "abstract") {
    // 摘要：`.abstract-zh` / `.abstract-en` 的 div 各自成為一個摘要；沒有 div 時整份當中文摘要
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
      const first = lines.length + 2; // `#abstract-zh(...)[` 的下一行
      push("#abstract-zh(keywords: cfg.keywords)[", ...inner, "]", "");
      doc.blocks.forEach((_, i) => blockLines.push(i === 0 ? first : null));
    }
  } else {
    doc.blocks.forEach((block) => emit(block));
  }

  return { text: lines.join("\n").replace(/\n+$/, "") + "\n", blockLines };
}
