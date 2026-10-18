import { nodeAtSafe } from "../blocks/node-at";
import type { Editor, JSONContent } from "@tiptap/core";
import { NodeSelection } from "@tiptap/pm/state";
import { findTable } from "@tiptap/pm/tables";
import { parseMarkdown, type Placement } from "@marktwain/schema";
import type { MathTarget } from "../math/MathDialog";

/** Where the cursor is, in window coordinates, for a box that opens at it. */
export function anchorAtCursor(editor: Editor | null): MathTarget["anchor"] {
  if (!editor || editor.isDestroyed) return undefined;
  const coords = editor.view.coordsAtPos(editor.state.selection.from);
  return { top: coords.top, bottom: coords.bottom, left: coords.left, right: coords.right };
}

/** Where an existing formula is drawn. */
export function anchorOfNode(editor: Editor | null, pos: number): MathTarget["anchor"] {
  if (!editor || editor.isDestroyed) return undefined;
  const dom = editor.view.nodeDOM(pos);
  if (!(dom instanceof HTMLElement)) return undefined;
  const box = dom.getBoundingClientRect();
  return { top: box.top, bottom: box.bottom, left: box.left, right: box.right };
}

/**
 * A formula or a figure that was just made is selected as a whole, and an insertion on top of a selection takes its place.
 * The caret goes to the paragraph after the block, one is made when there is none, so what is inserted next lands after it.
 */
export function stepOutOfNode(editor: Editor): void {
  const { selection, doc } = editor.state;
  if (!(selection instanceof NodeSelection) || selection.node.isInline) return;
  const after = selection.to;
  const next = doc.resolve(after).nodeAfter;
  const chain = editor.chain();
  if (!next || !next.isTextblock) chain.insertContentAt(after, { type: "paragraph" });
  chain.setTextSelection(after + 1).run();
}

/** Adds a new atom node, or updates an existing one when pos is set. */
export function writeAtom(editor: Editor, name: string, attrs: Record<string, unknown>, pos: number | null): void {
  if (pos === null) stepOutOfNode(editor);
  const chain = editor.chain().focus();
  if (pos === null) chain.insertContent({ type: name, attrs }).run();
  else {
    chain
      .command(({ tr }) => {
        tr.setNodeMarkup(pos, undefined, attrs);
        return true;
      })
      .run();
  }
}

/** Takes the node at pos away. */
export function removeNode(editor: Editor, pos: number | null): void {
  if (pos === null) return;
  const node = nodeAtSafe(editor.state.doc, pos);
  if (node) editor.chain().focus().deleteRange({ from: pos, to: pos + node.nodeSize }).run();
}

export function writeMath(editor: Editor, target: MathTarget, latex: string): void {
  if (target.pos === null) stepOutOfNode(editor);
  const chain = editor.chain().focus();
  if (target.pos === null) {
    (target.kind === "inline" ? chain.insertInlineMath({ latex }) : chain.insertBlockMath({ latex })).run();
  } else {
    (target.kind === "inline" ? chain.updateInlineMath({ latex, pos: target.pos }) : chain.updateBlockMath({ latex, pos: target.pos })).run();
  }
}

export function removeMath(editor: Editor, target: MathTarget): void {
  if (target.pos === null) return;
  const chain = editor.chain().focus();
  (target.kind === "inline" ? chain.deleteInlineMath({ pos: target.pos }) : chain.deleteBlockMath({ pos: target.pos })).run();
}

/** A table of the given size after the cursor, a table cannot hold another table, so a new one goes after the current one. */
export function insertGridTable(editor: Editor, size: { rows: number; columns: number; caption: string }): void {
  stepOutOfNode(editor);
  const chain = editor.chain().focus();
  const table = findTable(editor.state.selection.$from);
  if (table) {
    const after = table.pos + table.node.nodeSize;
    chain.insertContentAt(after, { type: "paragraph" }).setTextSelection(after + 1);
  }
  chain.insertTable({ rows: size.rows, cols: size.columns, withHeaderRow: true }).run();
  if (size.caption) editor.chain().updateAttributes("table", { caption: size.caption }).run();
}

/** The table of a template is a normal table, written as Markdown by the template and read here. */
export function insertTemplateTable(editor: Editor, markdown: string): void {
  const table = parseMarkdown(markdown).content?.[0];
  if (!table) return;
  stepOutOfNode(editor);
  const chain = editor.chain().focus();
  const inside = findTable(editor.state.selection.$from);
  if (inside) {
    const after = inside.pos + inside.node.nodeSize;
    chain.insertContentAt(after, [table as JSONContent, { type: "paragraph" }]).run();
  } else chain.insertContent(table as JSONContent).run();
}

/** Puts the table of a template where the table at pos is, and keeps what the person gave it: label, caption, notes, place and size. */
export function replaceTable(editor: Editor, pos: number, markdown: string): void {
  const old = nodeAtSafe(editor.state.doc, pos);
  const made = parseMarkdown(markdown).content?.[0] as JSONContent | undefined;
  if (!old || old.type.name !== "table" || !made) return;
  const keep = (name: string, fallback: unknown) => (old.attrs[name] ? old.attrs[name] : fallback);
  const attrs = {
    ...(made.attrs ?? {}),
    label: old.attrs.label ?? null,
    caption: keep("caption", made.attrs?.caption ?? ""),
    notes: keep("notes", made.attrs?.notes ?? ""),
    placement: old.attrs.placement ?? null,
    width: old.attrs.width ?? null,
    size: old.attrs.size ?? null,
  };
  editor
    .chain()
    .focus()
    .command(({ tr, state }) => {
      tr.replaceWith(pos, pos + old.nodeSize, state.schema.nodeFromJSON({ ...made, attrs }));
      return true;
    })
    .run();
}

/** Adds a figure, or changes the one at pos. A figure cannot live inside a table cell, so a new one goes after the table. */
export function writeFigure(editor: Editor, target: { pos: number | null; src: string }, values: { caption: string; width: string | null; placement: Placement | null }): void {
  const attrs = { src: target.src, ...values };
  if (target.pos === null) {
    stepOutOfNode(editor);
    const table = findTable(editor.state.selection.$from);
    const chain = editor.chain().focus();
    if (table) chain.insertContentAt(table.pos + table.node.nodeSize, { type: "figure", attrs });
    else chain.insertContent({ type: "figure", attrs });
    chain.run();
    return;
  }
  const pos = target.pos;
  const node = nodeAtSafe(editor.state.doc, pos);
  if (!node) return;
  editor
    .chain()
    .focus()
    .command(({ tr }) => {
      tr.setNodeMarkup(pos, undefined, { ...node.attrs, ...values });
      return true;
    })
    .run();
}

/** Puts a new stored image in place of the one of the figure at pos. */
export function setFigureSource(editor: Editor, pos: number, src: string): void {
  const node = nodeAtSafe(editor.state.doc, pos);
  if (node) editor.view.dispatch(editor.state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, src }));
}

/** Writes a link over the range, the text of the link is the text that was given and the caret ends up after it, out of the link. */
export function writeLink(editor: Editor, range: { from: number; to: number }, text: string, href: string): void {
  editor
    .chain()
    .focus()
    .insertContentAt(range, { type: "text", text, marks: [{ type: "link", attrs: { href } }] })
    .run();
}

/** Takes the link away from the range and leaves its text. */
export function removeLink(editor: Editor, range: { from: number; to: number }): void {
  editor.chain().focus().setTextSelection(range).unsetLink().setTextSelection(range.to).run();
}
