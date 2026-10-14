import { Extension } from "@tiptap/core";
import { Fragment, Slice, type Schema } from "@tiptap/pm/model";
import { Plugin } from "@tiptap/pm/state";
import { parseMarkdown } from "@marktwain/schema";

const BLOCK_MARKERS = [
  /^#{1,6}\s+\S/m, // 標題
  /^\s*[-*+]\s+\S/m, // 項目清單
  /^\s*\d+[.)]\s+\S/m, // 編號清單
  /^>\s?\S/m, // 引言
  /^(```|~~~)/m, // 程式碼圍欄
  /^\|.+\|\s*$/m, // 表格列
  /^\$\$\s*$/m, // 獨立公式
  /^\[\^[^\]]+\]:\s/m, // 腳註定義
  /^:::/m, // div
  /^!\[[^\]]*\]\([^)]+\)/m, // 圖
];

const INLINE_MARKERS = [
  /\*\*[^*\n]+\*\*/, // 粗體
  /`[^`\n]+`/, // 行內程式碼
  /\[\^[^\]\s]+\]/, // 腳註參照
  /\[-?@[\w:.-]+/, // 文獻引用
  /(?<![\w$])\$[^\s$][^$\n]*[^\s$]\$(?![\w$])/, // 行內公式
];

/**
 * 貼上的純文字是不是 Markdown：有區塊標記，或有明確的行內標記才算。
 * 寧可保守（當成純文字貼上），避免把「價格 $5 與 $6」之類的普通文字誤判。
 */
export function looksLikeMarkdown(text: string): boolean {
  return BLOCK_MARKERS.some((re) => re.test(text)) || INLINE_MARKERS.some((re) => re.test(text));
}

/** 把 Markdown 轉成可以貼進編輯器的 Slice；只有一個段落時開放兩端，讓文字接在游標處。 */
export function markdownToSlice(schema: Schema, text: string): Slice {
  const doc = schema.nodeFromJSON(parseMarkdown(text));
  const single = doc.childCount === 1 && doc.firstChild?.type.name === "paragraph";
  return new Slice(Fragment.from(doc.content), single ? 1 : 0, single ? 1 : 0);
}

/**
 * 貼上 Markdown 文字（例如從 VS Code、網頁或 ChatGPT 複製）時，依我們的方言解析成文件結構。
 * 從編輯器自己複製出來的內容（帶 ProseMirror 的標記）與程式碼區塊裡的貼上維持原樣。
 */
export const MarkdownPaste = Extension.create({
  name: "markdownPaste",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          handlePaste(view, event) {
            const data = event.clipboardData;
            const text = data?.getData("text/plain") ?? "";
            if (!text || !looksLikeMarkdown(text)) return false;
            if (data?.getData("text/html").includes("data-pm-slice")) return false;
            if (view.state.selection.$from.parent.type.spec.code) return false;

            view.dispatch(
              view.state.tr.replaceSelection(markdownToSlice(view.state.schema, text)).scrollIntoView(),
            );
            event.preventDefault();
            return true;
          },
        },
      }),
    ];
  },
});
