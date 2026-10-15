import { Grid } from "../grid";
import { int, numbered, type Shape } from "./types";

/** Methods in rows and measures in columns, the last row is the method of the thesis and holds the best results in bold. */
export const comparison: Shape = ({ params, labels }) => {
  const methods = int(params.methods, 4);
  const metrics = int(params.metrics, 3);
  const grid = new Grid(metrics + 1);
  grid.set(1, 1, labels.method ?? "");
  for (let column = 1; column <= metrics; column += 1) grid.set(1, column + 1, numbered(labels.metric ?? "", column));
  for (let row = 1; row <= methods; row += 1) {
    const ours = row === methods;
    grid.set(row + 1, 1, ours ? (labels.ours ?? "") : numbered(labels.baseline ?? "", row));
    for (let column = 1; column <= metrics; column += 1) grid.set(row + 1, column + 1, ours ? "**0.00**" : "0.00");
  }
  const lastLine = methods; // The line above the last row
  return grid.toMarkdown({ caption: labels.caption ?? "", style: "three-line", columnAlign: ["left"], notes: labels.note, borders: methods > 1 ? `h${lastLine}.*=0.5` : "" });
};
