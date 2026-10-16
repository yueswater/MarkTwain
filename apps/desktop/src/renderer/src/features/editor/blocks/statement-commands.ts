import type { Editor } from "@tiptap/core";
import { Fragment } from "@tiptap/pm/model";

/** Wraps the selected blocks in a block of a mathematical thesis, an empty paragraph becomes an empty block. */
export function insertStatement(editor: Editor, kind: string): void {
  editor.chain().focus().wrapIn("div", { id: null, classes: [kind], props: {} }).run();
}

/** Wraps the selected blocks in a block that is printed on a page turned sideways, for wide tables. */
export function insertLandscape(editor: Editor): void {
  editor.chain().focus().wrapIn("div", { id: null, classes: ["landscape"], props: {} }).run();
}

/** Changes the kind and the title of the block at pos, its label and other attributes stay. */
export function updateStatement(editor: Editor, pos: number, change: { kind: string; title: string }): void {
  const node = editor.state.doc.nodeAt(pos);
  if (!node || node.type.name !== "div") return;
  const { title: _old, ...props } = (node.attrs.props ?? {}) as Record<string, string>;
  void _old;
  editor
    .chain()
    .command(({ tr }) => {
      tr.setNodeMarkup(pos, undefined, {
        ...node.attrs,
        classes: [change.kind],
        props: change.title === "" ? props : { ...props, title: change.title },
      });
      return true;
    })
    .run();
}

/** Takes the frame of the block away and keeps what is inside. */
export function unwrapStatement(editor: Editor, pos: number): void {
  const node = editor.state.doc.nodeAt(pos);
  if (!node || node.type.name !== "div") return;
  editor
    .chain()
    .focus()
    .command(({ tr }) => {
      tr.replaceWith(pos, pos + node.nodeSize, Fragment.from(node.content));
      return true;
    })
    .run();
}

/** Wraps the selected blocks in one part of the abstract, the Chinese or the English one. */
export function insertAbstract(editor: Editor, kind: "abstract-zh" | "abstract-en"): void {
  editor.chain().focus().wrapIn("div", { id: null, classes: [kind], props: {} }).run();
}
