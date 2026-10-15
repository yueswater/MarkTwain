import type { Editor, JSONContent } from "@tiptap/core";
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

/** Adds a new atom node, or updates an existing one when pos is set. */
export function writeAtom(editor: Editor, name: string, attrs: Record<string, unknown>, pos: number | null): void {
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
  const node = editor.state.doc.nodeAt(pos);
  if (node) editor.chain().focus().deleteRange({ from: pos, to: pos + node.nodeSize }).run();
}

export function writeMath(editor: Editor, target: MathTarget, latex: string): void {
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
  const chain = editor.chain().focus();
  const inside = findTable(editor.state.selection.$from);
  if (inside) {
    const after = inside.pos + inside.node.nodeSize;
    chain.insertContentAt(after, [table as JSONContent, { type: "paragraph" }]).run();
  } else chain.insertContent(table as JSONContent).run();
}

/** Puts the table of a template where the table at pos is, and keeps what the person gave it: label, caption, notes, place and size. */
export function replaceTable(editor: Editor, pos: number, markdown: string): void {
  const old = editor.state.doc.nodeAt(pos);
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
    const table = findTable(editor.state.selection.$from);
    const chain = editor.chain().focus();
    if (table) chain.insertContentAt(table.pos + table.node.nodeSize, { type: "figure", attrs });
    else chain.insertContent({ type: "figure", attrs });
    chain.run();
    return;
  }
  const pos = target.pos;
  const node = editor.state.doc.nodeAt(pos);
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
  const node = editor.state.doc.nodeAt(pos);
  if (node) editor.view.dispatch(editor.state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, src }));
}
