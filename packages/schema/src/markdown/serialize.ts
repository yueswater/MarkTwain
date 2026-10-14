import { Node } from "prosemirror-model";
import { MarkdownSerializer, type MarkdownSerializerState } from "prosemirror-markdown";
import { formatAttributes } from "./attributes";
import { escapeText } from "./escape";
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
  const flat = latex.replace(/\s*\n\s*/g, " ").trim();
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

    [NodeName.HardBreak](state, node, parent, index) {
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
      state.text(escapeText(node.text ?? "", { startOfLine, inHeading }), false);
    },
  },
  {
    [MarkName.Italic]: { open: "*", close: "*", mixable: true, expelEnclosingWhitespace: true },
    [MarkName.Bold]: { open: "**", close: "**", mixable: true, expelEnclosingWhitespace: true },
    [MarkName.Strike]: { open: "~~", close: "~~", mixable: true, expelEnclosingWhitespace: true },
    [MarkName.Link]: {
      open: "[",
      close(_state, mark) {
        const href = String(mark.attrs.href).replace(/[()"]/g, "\\$&");
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
  const text = serializer.serialize(Node.fromJSON(schema, doc));
  return text === "" ? "" : `${text}\n`;
}
