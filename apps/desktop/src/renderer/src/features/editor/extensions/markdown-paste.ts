import { Extension } from "@tiptap/core";
import { Fragment, Slice, type Schema } from "@tiptap/pm/model";
import { Plugin } from "@tiptap/pm/state";
import { parseMarkdown } from "@marktwain/schema";

const BLOCK_MARKERS = [
  /^#{1,6}\s+\S/m, // heading
  /^\s*[-*+]\s+\S/m, // bullet list
  /^\s*\d+[.)]\s+\S/m, // numbered list
  /^>\s?\S/m, // quote
  /^(```|~~~)/m, // code fence
  /^\|.+\|\s*$/m, // table row
  /^\$\$\s*$/m, // block formula
  /^\[\^[^\]]+\]:\s/m, // footnote definition
  /^:::/m, // div
  /^!\[[^\]]*\]\([^)]+\)/m, // figure
];

const INLINE_MARKERS = [
  /\*\*[^*\n]+\*\*/, // bold
  /`[^`\n]+`/, // inline code
  /\[\^[^\]\s]+\]/, // footnote reference
  /\[-?@[\w:.-]+/, // citation
  /(?<![\w$])\$[^\s$][^$\n]*[^\s$]\$(?![\w$])/, // inline formula
];

/**
 * Whether pasted plain text is Markdown, true for block markers or clear inline markers.
 * Stay conservative and paste as plain text, so ordinary text such as prices with dollar signs is not misjudged.
 */
export function looksLikeMarkdown(text: string): boolean {
  return BLOCK_MARKERS.some((re) => re.test(text)) || INLINE_MARKERS.some((re) => re.test(text));
}

/** Turns Markdown into a Slice for the editor, a single paragraph opens both ends so the text joins at the cursor. */
export function markdownToSlice(schema: Schema, text: string): Slice {
  const doc = schema.nodeFromJSON(parseMarkdown(text));
  const single = doc.childCount === 1 && doc.firstChild?.type.name === "paragraph";
  return new Slice(Fragment.from(doc.content), single ? 1 : 0, single ? 1 : 0);
}

/**
 * Pasted Markdown text, for example from VS Code, a web page or a chat, is parsed with our dialect into document structure.
 * Content copied from the editor itself, which carries ProseMirror markers, and pastes inside code blocks stay as they are.
 */
export const MarkdownPaste = Extension.create<{ enabled: () => boolean }>({
  name: "markdownPaste",

  addOptions() {
    return { enabled: () => true };
  },

  addProseMirrorPlugins() {
    const { enabled } = this.options;
    return [
      new Plugin({
        props: {
          handlePaste(view, event) {
            if (!enabled()) return false;
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
