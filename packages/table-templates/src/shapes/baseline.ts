import { Grid } from "../grid";
import { int, numbered, type Shape } from "./types";

/** The characteristics of two groups in sections, each section has a heading row that spans the table. */
export const baseline: Shape = ({ params, labels }) => {
  const sections = int(params.sections, 2);
  const items = int(params.items, 3);
  const grid = new Grid(4);
  grid.set(1, 1, labels.characteristic ?? "");
  grid.set(1, 2, labels.groupA ?? "");
  grid.set(1, 3, labels.groupB ?? "");
  grid.set(1, 4, labels.pValue ?? "");
  let row = 2;
  for (let section = 1; section <= sections; section += 1) {
    grid.set(row, 1, { text: `**${numbered(labels.section ?? "", section)}**`, colspan: 4, align: "left" });
    row += 1;
    for (let item = 1; item <= items; item += 1) {
      grid.set(row, 1, { text: numbered(labels.item ?? "", item), align: "left" });
      grid.set(row, 2, labels.count ?? "");
      grid.set(row, 3, labels.count ?? "");
      grid.set(row, 4, "0.000");
      row += 1;
    }
  }
  return grid.toMarkdown({ caption: labels.caption ?? "", style: "three-line", columnAlign: ["left"], notes: labels.note });
};
