import { Node } from "prosemirror-model";
import { MarkdownSerializer, type MarkdownSerializerState } from "prosemirror-markdown";
import { formatAttributes } from "./attributes";
import { escapeLineStart, escapeText } from "./escape";
import { MarkName, NodeName } from "../model/names";
import { schema } from "../model/schema";
import type { DocJson } from "./parse";

/** 圍欄要比內容裡最長的反引號序列再長一個。 */
function fenceFor(content: string): string {
  const runs = content.match(/`{3,}/g);
  if (!runs) return "```";
  return `${"`".repeat(Math.max(...runs.map((run) => run.length)))}\``;
}

function backticksFor(node: Node, side: -1 | 1): string {
  let longest = 0;
  if (node.isText) {
    for (const match of (node.text ?? "").matchAll(/`+/g)) longest = Math.max(longest, match[0].length);
  }
  const ticks = "`".repeat(longest);
  if (longest > 0 && side > 0) return ` \`${ticks}`;
  if (longest > 0 && side < 0) return `\`${ticks} `;
  return "`";
}

/**
 * 清單是否可以用緊湊格式（項目之間不空行）：每個項目只有一個段落，
 * 後面最多接巢狀清單。有多段的項目必須用鬆散格式，否則重新解析時
 * 第二段會被併進第一段。
 */
function isTight(list: Node): boolean {
  let tight = true;
  list.forEach((item) => {
    item.forEach((child, _offset, index) => {
      if (index > 0 && child.type.name !== NodeName.BulletList && child.type.name !== NodeName.OrderedList) {
        tight = false;
      }
    });
  });
  return tight;
}

/** 行內公式的內容：修剪、換行變空白、把沒跳脫的 `$` 跳脫（否則會提前結束公式）。 */
function inlineLatex(latex: string): string {
  let flat = latex.replace(/\s*\n\s*/g, " ").trim();
  // 儲存格裡的 `|` 會被當成欄位分隔；改寫成等價的 \vert{}
  if (inTableCell) flat = flat.replace(/\|/g, "\\vert{}");
  let out = "";
  for (let i = 0; i < flat.length; i += 1) {
    const ch = flat.charAt(i);
    if (ch === "\\") {
      out += ch + flat.charAt(i + 1);
      i += 1;
    } else {
      out += ch === "$" ? "\\$" : ch;
    }
  }
  return out;
}

const SIMPLE_KEY = /^[A-Za-z0-9_](?:[A-Za-z0-9_]|[:.\-/+](?=[A-Za-z0-9_]))*$/;

/** 正在輸出表格儲存格：`|` 要跳脫、硬換行改成空白、公式裡的 `|` 改寫。 */
let inTableCell = false;

/** 腳註在這次序列化中的內容，依出現順序；序列化是同步的，所以模組層級的暫存是安全的。 */
let footnotes: string[] = [];

function keyToken(key: string, forceBraces: boolean): string {
  return forceBraces || !SIMPLE_KEY.test(key) ? `@{${key}}` : `@${key}`;
}

/** 前一個與後一個兄弟節點的文字邊界，用來決定敘述式引用要不要加大括號。 */
function neighbors(parent: Node, index: number): { previousWord: boolean; nextConflicts: boolean } {
  const previous = index > 0 ? parent.child(index - 1) : null;
  const next = index + 1 < parent.childCount ? parent.child(index + 1) : null;
  const previousWord = Boolean(previous?.isText && /\w$/.test(previous.text ?? ""));
  const nextConflicts = Boolean(next?.isText && /^[\w.:\-/+]/.test(next.text ?? ""));
  return { previousWord, nextConflicts };
}

/** 圖片的目的地：含空白或括號時用 `<…>`。 */
function destination(src: string): string {
  return /[\s()<>]/.test(src) ? `<${src}>` : src;
}

/** 圖的標題：單行、修剪、跳脫中括號（`![…]` 裡的括號要成對）。 */
function figureCaption(caption: string): string {
  return caption.replace(/\s*\n\s*/g, " ").trim().replace(/([[\]])/g, "\\$1");
}

/** 讓目前的區塊在下一次寫入前只換一行（而不是空一行）；prosemirror-markdown 的型別沒有公開它。 */
function endLine(state: MarkdownSerializerState): void {
  (state as unknown as { flushClose(size: number): void }).flushClose(1);
}

type CellText = { text: string; align: string | null };

/** 把一個儲存格的段落輸出成單行文字；借用 state 的輸出緩衝，結束後還原。 */
function renderCell(state: MarkdownSerializerState, paragraph: Node | null): string {
  if (!paragraph) return "";
  const internal = state as unknown as { out: string; delim: string; closed: unknown; atBlockStart: boolean };
  const saved = { out: internal.out, delim: internal.delim, closed: internal.closed, atBlockStart: internal.atBlockStart };
  internal.out = "";
  internal.delim = "";
  internal.closed = null;
  inTableCell = true;
  try {
    state.renderInline(paragraph, true);
    return internal.out.replace(/\s*\n\s*/g, " ").trim();
  } finally {
    inTableCell = false;
    Object.assign(internal, saved);
  }
}

function alignMarker(align: string | null): string {
  if (align === "left") return ":---";
  if (align === "center") return ":---:";
  if (align === "right") return "---:";
  return "---";
}

const serializer = new MarkdownSerializer(
  {
    [NodeName.Paragraph](state, node) {
      state.renderInline(node);
      state.closeBlock(node);
    },

    [NodeName.Heading](state, node) {
      state.write(`${state.repeat("#", node.attrs.level as number)} `);
      state.renderInline(node, false);
      const label = node.attrs.label as string | null;
      if (label) state.write(` ${formatAttributes({ id: label, classes: [], props: {} })}`);
      state.closeBlock(node);
    },

    [NodeName.Blockquote](state, node) {
      state.wrapBlock("> ", null, node, () => state.renderContent(node));
    },

    [NodeName.BulletList](state, node) {
      state.options.tightLists = isTight(node);
      state.renderList(node, "  ", () => "- ");
    },

    [NodeName.OrderedList](state, node) {
      const start = (node.attrs.start as number | null) ?? 1;
      const width = String(start + node.childCount - 1).length;
      const indent = state.repeat(" ", width + 2);
      state.options.tightLists = isTight(node);
      state.renderList(node, indent, (i) => {
        const number = String(start + i);
        return `${state.repeat(" ", width - number.length)}${number}. `;
      });
    },

    [NodeName.ListItem](state, node) {
      state.renderContent(node);
    },

    [NodeName.CodeBlock](state, node) {
      const fence = fenceFor(node.textContent);
      const language = node.attrs.language as string | null;
      const label = node.attrs.label as string | null;
      const caption = node.attrs.caption as string | null;
      const attributes = formatAttributes({
        id: label,
        classes: [],
        props: caption ? { caption } : {},
      });
      const info = [language, attributes].filter(Boolean).join(" ");
      state.write(`${fence}${info}\n`);
      state.text(node.textContent, false);
      state.write("\n");
      state.write(fence);
      state.closeBlock(node);
    },

    [NodeName.HorizontalRule](state, node) {
      state.write("---");
      state.closeBlock(node);
    },

    [NodeName.InlineMath](state, node) {
      state.write(`$${inlineLatex(String(node.attrs.latex))}$`);
    },

    [NodeName.BlockMath](state, node) {
      const label = node.attrs.label as string | null;
      state.write("$$\n");
      state.text(String(node.attrs.latex).trim(), false);
      state.write("\n$$");
      if (label) state.write(` ${formatAttributes({ id: label, classes: [], props: {} })}`);
      state.closeBlock(node);
    },

    [NodeName.Table](state, node) {
      const rows: CellText[][] = [];
      node.forEach((tableRow) => {
        const cells: CellText[] = [];
        tableRow.forEach((cell) => {
          cells.push({ text: renderCell(state, cell.firstChild), align: (cell.attrs.align as string | null) ?? null });
        });
        rows.push(cells);
      });

      const width = Math.max(1, ...rows.map((cells) => cells.length));
      const pad = (cells: CellText[]): CellText[] => [
        ...cells,
        ...Array.from({ length: width - cells.length }, () => ({ text: "", align: null })),
      ];
      const line = (cells: CellText[]) => `| ${pad(cells).map((c) => c.text).join(" | ")} |`;

      const header = pad(rows[0] ?? []);
      const lines = [
        line(header),
        `| ${header.map((cell) => alignMarker(cell.align)).join(" | ")} |`,
        ...rows.slice(1).map(line),
      ];
      state.text(lines.join("\n"), false);
      state.closeBlock(node);

      const caption = String(node.attrs.caption).replace(/\s*\n\s*/g, " ").trim();
      const notes = String(node.attrs.notes).replace(/\s*\n\s*/g, " ").trim();
      const label = node.attrs.label as string | null;
      const attributes = formatAttributes({ id: label, classes: [], props: notes ? { notes } : {} });
      if (caption || attributes) {
        state.write(`: ${[caption, attributes].filter(Boolean).join(" ")}`);
        state.closeBlock(node);
      }
    },

    [NodeName.Figure](state, node) {
      const label = node.attrs.label as string | null;
      const width = node.attrs.width as string | null;
      const attributes = formatAttributes({ id: label, classes: [], props: width ? { width } : {} });
      state.write(
        `![${figureCaption(String(node.attrs.caption))}](${destination(String(node.attrs.src))})${attributes}`,
      );
      state.closeBlock(node);
    },

    [NodeName.FigureGroup](state, node) {
      const grid = node.attrs.layout === "grid";
      const columns = node.attrs.columns as string | null;
      const attributes = formatAttributes({
        id: node.attrs.label as string | null,
        classes: [grid ? "figgrid" : "figrow"],
        props: columns ? { columns } : {},
      });
      state.write(`::: ${attributes}\n`);
      state.renderContent(node);
      const caption = String(node.attrs.caption).replace(/\s*\n\s*/g, " ").trim();
      if (caption) {
        state.write(escapeLineStart(caption));
        state.closeBlock(node);
      }
      endLine(state);
      state.write(":::");
      state.closeBlock(node);
    },

    [NodeName.Div](state, node) {
      const attributes = formatAttributes({
        id: node.attrs.id as string | null,
        classes: node.attrs.classes as string[],
        props: node.attrs.props as Record<string, string>,
      });
      state.write(attributes ? `::: ${attributes}\n` : "::: div\n");
      state.renderContent(node);
      endLine(state);
      state.write(":::");
      state.closeBlock(node);
    },

    [NodeName.Footnote](state, node) {
      const text = String(node.attrs.text).replace(/\s*\n\s*/g, " ").trim();
      if (text === "") return;
      footnotes.push(text);
      state.write(`[^${footnotes.length}]`);
    },

    [NodeName.Citation](state, node, parent, index) {
      const keys = node.attrs.keys as string[];
      const form = node.attrs.form as string;
      if (keys.length === 0) return;

      if (form === "prose" && keys.length === 1) {
        const { previousWord, nextConflicts } = neighbors(parent, index);
        state.write(keyToken(keys[0] ?? "", previousWord || nextConflicts));
      } else if (form === "year") {
        state.write(`[${keys.map((key) => `-${keyToken(key, false)}`).join("; ")}]`);
      } else if (form === "author" && keys.length === 1) {
        state.write(`[${keyToken(keys[0] ?? "", false)}]{.author}`);
      } else {
        state.write(`[${keys.map((key) => keyToken(key, false)).join("; ")}]`);
      }
    },

    [NodeName.CrossRef](state, node, parent, index) {
      const label = String(node.attrs.label);
      const { previousWord, nextConflicts } = neighbors(parent, index);
      state.write(keyToken(label, previousWord || nextConflicts));
    },

    [NodeName.HardBreak](state, node, parent, index) {
      if (inTableCell) {
        state.write(" ");
        return;
      }
      // 段落結尾的換行沒有意義，不輸出
      for (let i = index + 1; i < parent.childCount; i += 1) {
        if (parent.child(i).type !== node.type) {
          state.write("\\\n");
          return;
        }
      }
    },

    [NodeName.Text](state: MarkdownSerializerState, node, parent) {
      // 這兩個成員在執行時存在，但 prosemirror-markdown 的型別宣告把它們標為內部
      const internal = state as unknown as { atBlockStart: boolean; atBlank(): boolean };
      const startOfLine = internal.atBlockStart || internal.atBlank();
      const inHeading = parent.type.name === NodeName.Heading;
      state.text(escapeText(node.text ?? "", { startOfLine, inHeading, inTableCell }), false);
    },
  },
  {
    [MarkName.Italic]: { open: "*", close: "*", mixable: true, expelEnclosingWhitespace: true },
    [MarkName.Bold]: { open: "**", close: "**", mixable: true, expelEnclosingWhitespace: true },
    [MarkName.Strike]: { open: "~~", close: "~~", mixable: true, expelEnclosingWhitespace: true },
    [MarkName.Link]: {
      open: "[",
      close(_state, mark) {
        const raw = String(mark.attrs.href);
        const href = /\s/.test(raw) ? `<${raw}>` : raw.replace(/[()"]/g, "\\$&");
        const title = mark.attrs.title
          ? ` "${String(mark.attrs.title).replace(/"/g, '\\"')}"`
          : "";
        return `](${href}${title})`;
      },
      mixable: true,
    },
    [MarkName.Code]: {
      open: (_state, _mark, parent, index) => backticksFor(parent.child(index), -1),
      close: (_state, _mark, parent, index) => backticksFor(parent.child(index - 1), 1),
      escape: false,
    },
  },
);

/** 把 ProseMirror／TipTap 的 JSON 序列化成規範形式的 Markdown。文件結尾有一個換行。 */
export function serializeMarkdown(doc: DocJson): string {
  footnotes = [];
  const body = serializer.serialize(Node.fromJSON(schema, doc));
  const definitions = footnotes.map((text, i) => `[^${i + 1}]: ${text}`);
  footnotes = [];
  if (body === "" && definitions.length === 0) return "";
  return `${[body, ...(definitions.length > 0 ? [definitions.join("\n")] : [])].join("\n\n")}\n`;
}
