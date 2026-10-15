import { Extension } from "@tiptap/core";
import { Fragment, type Node as PmNode, type Schema } from "@tiptap/pm/model";
import { Plugin } from "@tiptap/pm/state";

/** The text of a block that can be written into a table cell, which holds a single line of text and no blocks. Null when the block has no such form. */
export function inlineOf(node: PmNode, schema: Schema): Fragment | null {
  switch (node.type.name) {
    case "paragraph":
    case "heading":
      return node.content;
    case "blockMath": {
      const inline = schema.nodes.inlineMath;
      return inline ? Fragment.from(inline.create({ latex: node.attrs.latex })) : null;
    }
    // A list item with one paragraph is that paragraph
    case "listItem":
      return node.childCount === 1 && node.firstChild?.type.name === "paragraph" ? node.firstChild.content : null;
    default:
      return null;
  }
}

/**
 * Lets a block be dropped into a table cell. A cell holds only a line of text, so a paragraph, a heading, a list item or a formula
 * becomes the text of the cell where it lands. Anything else falls through to the editor, which puts it next to the table.
 */
export const BlockDrop = Extension.create({
  name: "blockDrop",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          handleDrop(view, event, slice, moved) {
            const hit = view.posAtCoords({ left: event.clientX, top: event.clientY });
            if (!hit || slice.content.childCount !== 1) return false;
            const $pos = view.state.doc.resolve(hit.pos);
            const inCell = [...Array($pos.depth + 1).keys()].some((depth) => ["tableCell", "tableHeader"].includes($pos.node(depth).type.name));
            if (!inCell || $pos.parent.type.name !== "paragraph") return false;
            const source = slice.content.firstChild;
            const text = source ? inlineOf(source, view.state.schema) : null;
            if (!text) return false;
            const { tr } = view.state;
            const target = hit.pos;
            if (moved) tr.deleteSelection();
            tr.insert(tr.mapping.map(target), text);
            view.dispatch(tr.scrollIntoView());
            event.preventDefault();
            return true;
          },
        },
      }),
    ];
  },
});
