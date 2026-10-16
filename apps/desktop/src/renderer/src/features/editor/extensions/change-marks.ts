import { Extension } from "@tiptap/core";
import type { Node as PmNode } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { charDiff } from "@/lib/char-diff";
import { computeChanges, editorBlocks, revertChange, savedPlainText, type ChangeMark } from "../changes/change-marks";

/** Sent with a transaction when the saved version or the setting changed, so that the marks are worked out again. */
export const CHANGES_CHANGED = "marktwainChangesChanged";

export type ChangeMarksOptions = {
  /** The blocks of the latest saved version of the document as Markdown, null while they are not known */
  getBase: () => string[] | null;
  enabled: () => boolean;
  /** The words of the button that puts a change back */
  revertLabel: () => string;
};

const key = new PluginKey<DecorationSet>("changeMarks");

/** The words of a block that is a line of text, with where each stretch of them is in the document. */
function wordsOf(node: PmNode, start: number): { text: string; from: number }[] {
  const parts: { text: string; from: number }[] = [];
  node.descendants((child, offset) => {
    if (child.isText) parts.push({ text: child.text ?? "", from: start + 1 + offset });
  });
  return parts;
}

/** The button that puts one change back as it is in the saved version. */
function revertButton(label: string, run: () => void): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "change-revert";
  button.textContent = label;
  button.contentEditable = "false";
  button.setAttribute("aria-label", label);
  // The editor keeps its selection, and the change is put back on the press
  button.addEventListener("mousedown", (event) => {
    event.preventDefault();
    run();
  });
  return button;
}

/** The old text above a block that was changed or taken away, with the words that went in red. */
function ghost(kind: "removed" | "modified", before: string, runs: ReturnType<typeof charDiff> | null, revert: HTMLButtonElement): HTMLElement {
  const element = document.createElement("div");
  element.className = "change-ghost";
  element.dataset.change = kind;
  element.contentEditable = "false";
  const text = document.createElement("div");
  text.className = "change-ghost-text";
  if (runs) {
    for (const run of runs) {
      if (run.type === "added") continue;
      const part = document.createElement(run.type === "removed" ? "del" : "span");
      part.textContent = run.text;
      text.append(part);
    }
  } else text.textContent = before;
  element.append(text, revert);
  return element;
}

function build(doc: PmNode, base: string[], label: string, revert: (mark: ChangeMark) => void): DecorationSet {
  const blocks = editorBlocks(doc);
  const marks = computeChanges(base, blocks);
  if (marks.length === 0) return DecorationSet.empty;
  const starts: number[] = [];
  doc.forEach((_node, offset) => starts.push(offset));
  const decorations: Decoration[] = [];
  marks.forEach((mark, order) => {
    if (mark.type === "removed") {
      const pos = starts[mark.at] ?? doc.content.size;
      decorations.push(Decoration.widget(pos, () => ghost("removed", savedPlainText(mark.before) ?? mark.before, null, revertButton(label, () => revert(mark))), { side: -1, key: `removed:${order}:${mark.before}` }));
      return;
    }
    const node = doc.child(mark.index);
    const pos = starts[mark.index] as number;
    decorations.push(Decoration.node(pos, pos + node.nodeSize, { class: "change-added", "data-change": mark.type }));
    if (mark.type === "added") {
      // Shown when the pointer is over the block, a block that is new has no old text to put above it
      decorations.push(Decoration.widget(pos + 1, () => revertButton(label, () => revert(mark)), { side: -1, key: `revert:${order}` }));
      return;
    }
    // A block that was changed shows the old text above it, and when it is a line of text the words that differ are marked in both
    const before = savedPlainText(mark.before);
    const parts = node.isTextblock ? wordsOf(node, pos) : [];
    const after = parts.map((part) => part.text).join("");
    const runs = before !== null && node.isTextblock ? charDiff(before, after) : null;
    decorations.push(Decoration.widget(pos, () => ghost("modified", before ?? mark.before, runs, revertButton(label, () => revert(mark))), { side: -1, key: `modified:${order}:${mark.before}` }));
    if (runs) {
      // Where each stretch of text starts in the words of the block, to cut a run that crosses from one stretch into the next
      const offsets = parts.map((_part, i) => parts.slice(0, i).reduce((sum, p) => sum + p.text.length, 0));
      let at = 0;
      for (const run of runs) {
        if (run.type === "removed") continue;
        const to = at + run.text.length;
        if (run.type === "added") {
          parts.forEach((part, i) => {
            const start = Math.max(at, offsets[i] as number);
            const end = Math.min(to, (offsets[i] as number) + part.text.length);
            if (start < end) decorations.push(Decoration.inline(part.from + (start - (offsets[i] as number)), part.from + (end - (offsets[i] as number)), { class: "change-text" }));
          });
        }
        at = to;
      }
    }
  });
  return DecorationSet.create(doc, decorations);
}

/**
 * Marks what differs from the latest saved version, in the way of a change history: a block that was added is green, a block that was taken away
 * is shown in red where it was, and a block that was changed has its old text in red above it and the words that went in green.
 * A document with nothing in the saved version is not marked. The ghosts are not part of the document, they cannot be selected or typed in, and they are not saved.
 */
export const ChangeMarks = Extension.create<ChangeMarksOptions>({
  name: "changeMarks",

  addOptions() {
    return { getBase: () => null, enabled: () => false, revertLabel: () => "" };
  },

  addProseMirrorPlugins() {
    const options = this.options;
    const editor = this.editor;
    // Puts the change back and leaves the cursor where it was
    const revert = (mark: ChangeMark) => {
      const tr = editor.state.tr;
      if (revertChange(tr, mark)) editor.view.dispatch(tr);
    };
    const compute = (doc: PmNode): DecorationSet => {
      const base = options.getBase();
      // A version with nothing in this document is nothing to compare with: a new thesis would be green from the first word to the last
      return options.enabled() && base !== null && base.length > 0 ? build(doc, base, options.revertLabel(), revert) : DecorationSet.empty;
    };
    return [
      new Plugin<DecorationSet>({
        key,
        state: {
          init: (_config, state) => compute(state.doc),
          apply: (tr, value, _old, state) => (tr.docChanged || tr.getMeta(CHANGES_CHANGED) ? compute(state.doc) : value),
        },
        props: { decorations: (state) => key.getState(state) },
      }),
    ];
  },
});
