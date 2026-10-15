import { Extension } from "@tiptap/core";
import { Fragment, type Node as PmNode, type Schema } from "@tiptap/pm/model";
import { Plugin, TextSelection } from "@tiptap/pm/state";
import { dropPoint } from "@tiptap/pm/transform";
import { endNodeDrag, nodeDrag } from "../block-drag";

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
 * Takes the drop of a block that a handle dragged and moves it where it landed.
 * A table cell holds only a line of text, so a paragraph, a heading, a list item or a formula becomes the text of the cell where it lands.
 * Anything else goes next to the table, or wherever the editor can put it.
 */
export const BlockDrop = Extension.create({
  name: "blockDrop",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          handleDrop(view, event, slice) {
            const drag = nodeDrag();
            if (!drag || view.dragging?.slice !== drag.slice) return false;
            endNodeDrag();
            event.preventDefault();
            const hit = view.posAtCoords({ left: event.clientX, top: event.clientY });
            // A drop on itself, or off the page, leaves everything as it is
            if (!hit || (hit.pos >= drag.from && hit.pos <= drag.to)) return true;
            const { doc } = view.state;
            const $pos = doc.resolve(hit.pos);
            const inCell = [...Array($pos.depth + 1).keys()].some((depth) => ["tableCell", "tableHeader"].includes($pos.node(depth).type.name));
            const source = slice.content.childCount === 1 ? slice.content.firstChild : null;
            const text = inCell && $pos.parent.type.name === "paragraph" && source ? inlineOf(source, view.state.schema) : null;
            const tr = view.state.tr;
            if (text) {
              tr.delete(drag.from, drag.to);
              tr.insert(tr.mapping.map(hit.pos), text);
            } else {
              const at = dropPoint(doc, hit.pos, slice) ?? hit.pos;
              if (at >= drag.from && at <= drag.to) return true;
              tr.delete(drag.from, drag.to);
              const mapped = tr.mapping.map(at);
              tr.replaceRange(mapped, mapped, slice);
            }
            tr.setSelection(TextSelection.near(tr.doc.resolve(Math.min(tr.mapping.map(hit.pos), tr.doc.content.size)), -1));
            view.dispatch(tr.scrollIntoView());
            view.focus();
            return true;
          },
        },
      }),
    ];
  },
});
