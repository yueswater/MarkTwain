import { Grid } from "../grid";
import { int, numbered, type Shape } from "./types";

/** A confusion matrix, the actual classes down the side and the predicted ones across the top under a heading that spans them. */
export const confusion: Shape = ({ params, labels }) => {
  const classes = int(params.classes, 2);
  const grid = new Grid(classes + 1);
  grid.set(1, 1, { text: labels.actualPredicted ?? "", rowspan: 2 });
  grid.set(1, 2, { text: labels.predicted ?? "", colspan: classes });
  for (let column = 1; column <= classes; column += 1) grid.set(2, column + 1, numbered(labels.class ?? "", column));
  for (let row = 1; row <= classes; row += 1) {
    grid.set(row + 2, 1, numbered(labels.class ?? "", row));
    for (let column = 1; column <= classes; column += 1) grid.set(row + 2, column + 1, "0");
  }
  return grid.toMarkdown({ caption: labels.caption ?? "", style: "grid" });
};
