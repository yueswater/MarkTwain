import { MarkdownParser } from "prosemirror-markdown";
import type { Token } from "markdown-it";
import { MarkName, NodeName } from "../model/names";
import { schema } from "../model/schema";
import { createMarkdownIt } from "./markdown-it";

/** Column alignment, markdown-it turns :---: into a style attribute on the cell. */
function cellAttrs(token: Token): { align: string | null } {
  const match = /text-align:\s*(left|center|right)/.exec(String(token.attrGet("style") ?? ""));
  return { align: match?.[1] ?? null };
}

/** The caption of a figure has its brackets escaped inside ![…], restore them. */
function unescapeBrackets(text: string): string {
  return text.replace(/\\([[\]])/g, "$1").trim();
}

function infoLanguage(token: Token): string | null {
  return token.info.trim().split(/\s+/)[0] || null;
}

// The types of prosemirror-markdown depend on @types/markdown-it 14 while markdown-it 15 ships another
// declaration of the same shape. They are the same thing at run time, so cast once here.
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
  table: {
    block: NodeName.Table,
    getAttrs: (token) => ({
      label: token.meta?.label ?? null,
      caption: String(token.meta?.caption ?? ""),
      notes: String(token.meta?.notes ?? ""),
    }),
  },
  thead: { ignore: true },
  tbody: { ignore: true },
  tr: { block: NodeName.TableRow },
  th: { block: NodeName.TableHeader, getAttrs: cellAttrs },
  td: { block: NodeName.TableCell, getAttrs: cellAttrs },
  dl: { block: NodeName.DefinitionList },
  dt: { block: NodeName.DefinitionTerm },
  dd: { block: NodeName.DefinitionDescription },
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

/** Parses the Markdown of the dialect into ProseMirror or TipTap JSON. A pure function that needs no DOM. */
export function parseMarkdown(text: string): DocJson {
  const json = markdownParser.parse(text.replace(/\r\n?/g, "\n")).toJSON() as Partial<DocJson>;
  // An empty document has no blocks, but a document of the editor needs at least one paragraph
  return { type: "doc", content: json.content ?? [{ type: NodeName.Paragraph }] };
}

/** Parses inline Markdown such as captions, footnotes and table notes into inline nodes, the content is a single paragraph. */
export function parseInlineMarkdown(text: string): unknown[] {
  const first = parseMarkdown(text).content[0] as { type?: string; content?: unknown[] } | undefined;
  return first?.type === "paragraph" ? (first.content ?? []) : [];
}
