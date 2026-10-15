import { Extension } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { dKey, hKey, vKey, type Edge } from "@marktwain/schema";
import { edgesOf } from "../table-border-commands";

const PX_PER_PT = 4 / 3;

/** One side of a cell as CSS. */
export function sideCss(side: "top" | "right" | "bottom" | "left", edge: Edge): string {
  if (!edge) return `border-${side}: none;`;
  // A line thinner than a pixel is still drawn, the screen decides how thin it can be
  const width = Math.max(0.5, Math.round(edge.width * PX_PER_PT * 10) / 10);
  return `border-${side}: ${width}px ${edge.style} ${edge.color ?? "var(--foreground)"};`;
}

/** A diagonal drawn as a gradient with a thin stripe in the middle. */
function diagonalCss(down: Edge, up: Edge): string {
  const stripe = (edge: NonNullable<Edge>, direction: string) => {
    const half = Math.max(0.5, edge.width * PX_PER_PT) / 2;
    const color = edge.color ?? "var(--foreground)";
    return `linear-gradient(${direction}, transparent calc(50% - ${half}px), ${color} calc(50% - ${half}px), ${color} calc(50% + ${half}px), transparent calc(50% + ${half}px))`;
  };
  const layers = [down ? stripe(down, "to top right") : null, up ? stripe(up, "to bottom right") : null].filter(Boolean);
  return layers.length > 0 ? `background-image: ${layers.join(", ")};` : "";
}

/**
 * Draws the lines of every table, the same lines as in the PDF, on the cells themselves: the preset, three-line or grid, and the
 * borders of the table on top. The document is not changed.
 */
export const TableBorders = Extension.create({
  name: "tableBorders",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          decorations(state) {
            const decorations: Decoration[] = [];
            state.doc.descendants((node, pos) => {
              if (node.type.name !== "table") return true;
              const { grid, edges, map } = edgesOf(node);
              const start = pos + 1;
              const seen = new Set<number>();
              for (let row = 0; row < grid.rows; row += 1) {
                for (let column = 0; column < grid.cols; column += 1) {
                  const cellPos = map.map[row * grid.cols + column];
                  if (cellPos === undefined || seen.has(cellPos)) continue;
                  seen.add(cellPos);
                  const rect = map.findCell(cellPos);
                  const cell = node.nodeAt(cellPos);
                  if (!cell) continue;
                  const css =
                    sideCss("top", edges.get(hKey(rect.top, rect.left)) ?? null) +
                    sideCss("bottom", edges.get(hKey(rect.bottom, rect.left)) ?? null) +
                    sideCss("left", edges.get(vKey(rect.left, rect.top)) ?? null) +
                    sideCss("right", edges.get(vKey(rect.right, rect.top)) ?? null) +
                    diagonalCss(edges.get(dKey("dd", rect.top, rect.left)) ?? null, edges.get(dKey("du", rect.top, rect.left)) ?? null);
                  decorations.push(Decoration.node(start + cellPos, start + cellPos + cell.nodeSize, { style: css, "data-custom-borders": "" }));
                }
              }
              return false;
            });
            return DecorationSet.create(state.doc, decorations);
          },
        },
      }),
    ];
  },
});
