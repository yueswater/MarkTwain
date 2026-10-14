import type { MarkdownItInstance } from "../markdown-it";

type CoreState = InstanceType<MarkdownItInstance["core"]["State"]>;
type Token = CoreState["tokens"][number];

/**
 * markdown-it-footnote 把定義放在文件結尾的獨立區塊，與引用分開。
 * 我們的模型把腳註內容放在引用節點上，所以在它之後把定義的原文塞回引用，
 * 並移除定義區塊。
 */
function resolveFootnotes(state: CoreState): void {
  const notes = new Map<number, string>();
  const kept: Token[] = [];

  let inBlock = false;
  let currentId: number | null = null;
  let parts: string[] = [];

  for (const token of state.tokens) {
    if (token.type === "footnote_block_open") {
      inBlock = true;
    } else if (token.type === "footnote_block_close") {
      inBlock = false;
    } else if (inBlock) {
      if (token.type === "footnote_open") {
        currentId = Number(token.meta?.id);
        parts = [];
      } else if (token.type === "footnote_close") {
        if (currentId !== null) notes.set(currentId, parts.join(" "));
        currentId = null;
      } else if (token.type === "inline") {
        parts.push(token.content);
      }
    } else {
      kept.push(token);
    }
  }
  state.tokens = kept;

  for (const token of kept) {
    if (token.type !== "inline" || !token.children) continue;
    for (const child of token.children) {
      if (child.type === "footnote_ref") {
        child.meta = { ...child.meta, text: notes.get(Number(child.meta?.id)) ?? "" };
      }
    }
  }
}

export function footnoteResolvePlugin(md: MarkdownItInstance): void {
  md.core.ruler.after("footnote_tail", "footnote_resolve", resolveFootnotes);
}
