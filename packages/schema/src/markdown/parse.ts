import { MarkdownParser } from "prosemirror-markdown";
import type { Token } from "markdown-it";
import { MarkName, NodeName } from "../model/names";
import { schema } from "../model/schema";
import { createMarkdownIt } from "./markdown-it";

/** 圖的標題在 `![…]` 裡跳脫了中括號，還原回來。 */
function unescapeBrackets(text: string): string {
  return text.replace(/\\([[\]])/g, "$1").trim();
}

function infoLanguage(token: Token): string | null {
  return token.info.trim().split(/\s+/)[0] || null;
}

// prosemirror-markdown 的型別依賴 @types/markdown-it 14，而 markdown-it 15 自帶另一份
// 結構相同的型別宣告；兩者在執行時是同一個東西，所以只在這裡轉型一次。
type Tokenizer = ConstructorParameters<typeof MarkdownParser>[1];

const markdownParser = new MarkdownParser(schema, createMarkdownIt() as unknown as Tokenizer, {
  paragraph: { block: NodeName.Paragraph },
  heading: {
    block: NodeName.Heading,
    getAttrs: (token) => ({ level: Number(token.tag.slice(1)), label: token.attrGet("id") }),
  },
  blockquote: { block: NodeName.Blockquote },
  bullet_list: { block: NodeName.BulletList },
  ordered_list: {
    block: NodeName.OrderedList,
    getAttrs: (token) => ({ start: Number(token.attrGet("start") ?? 1) }),
  },
  list_item: { block: NodeName.ListItem },
  fence: {
    block: NodeName.CodeBlock,
    noCloseToken: true,
    getAttrs: (token) => ({
      language: infoLanguage(token),
      label: token.attrGet("id"),
      caption: token.attrGet("caption"),
    }),
  },
  code_block: { block: NodeName.CodeBlock, noCloseToken: true },
  hr: { node: NodeName.HorizontalRule },
  hardbreak: { node: NodeName.HardBreak },
  em: { mark: MarkName.Italic },
  strong: { mark: MarkName.Bold },
  s: { mark: MarkName.Strike },
  link: {
    mark: MarkName.Link,
    getAttrs: (token) => ({ href: token.attrGet("href"), title: token.attrGet("title") || null }),
  },
  code_inline: { mark: MarkName.Code, noCloseToken: true },
  math_inline: { node: NodeName.InlineMath, getAttrs: (token) => ({ latex: token.content }) },
  figure: {
    node: NodeName.Figure,
    getAttrs: (token) => ({
      src: String(token.meta?.src ?? ""),
      caption: unescapeBrackets(token.content),
      label: token.meta?.id ?? null,
      width: token.meta?.width ?? null,
    }),
  },
  figure_group: {
    block: NodeName.FigureGroup,
    getAttrs: (token) => ({
      label: token.meta?.id ?? null,
      caption: String(token.meta?.caption ?? ""),
      layout: token.meta?.layout ?? "row",
      columns: token.meta?.columns ?? null,
    }),
  },
  div: {
    block: NodeName.Div,
    getAttrs: (token) => ({
      id: token.meta?.id ?? null,
      classes: token.meta?.classes ?? [],
      props: token.meta?.props ?? {},
    }),
  },
  footnote_ref: {
    node: NodeName.Footnote,
    getAttrs: (token) => ({ text: String(token.meta?.text ?? "") }),
  },
  citation: {
    node: NodeName.Citation,
    getAttrs: (token) => ({ keys: token.meta?.keys ?? [], form: token.meta?.form ?? "paren" }),
  },
  cross_ref: { node: NodeName.CrossRef, getAttrs: (token) => ({ label: token.content }) },
  math_block: {
    node: NodeName.BlockMath,
    getAttrs: (token) => ({ latex: token.content, label: token.attrGet("id") }),
  },
});

export type DocJson = { type: "doc"; content: unknown[] };

/** 把方言的 Markdown 解析成 ProseMirror／TipTap 的 JSON。純函式，不需要 DOM。 */
export function parseMarkdown(text: string): DocJson {
  const json = markdownParser.parse(text.replace(/\r\n?/g, "\n")).toJSON() as Partial<DocJson>;
  // 空文件沒有任何區塊；編輯器的文件至少要有一個段落
  return { type: "doc", content: json.content ?? [{ type: NodeName.Paragraph }] };
}
