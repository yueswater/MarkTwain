import { Grid } from "../grid";
import { int, numbered, type Shape } from "./types";

/**
 * A payoff matrix of two players as a game theory text draws it: the names of the players and of the strategies stand outside,
 * and only the cells of the payoffs are in a box with a line between every two of them. The corner cell and the name of the column player span,
 * and so does the name of the row player.
 */
export const payoff: Shape = ({ params, labels }) => {
  const rows = int(params.rows, 2);
  const columns = int(params.columns, 2);
  const grid = new Grid(columns + 2);
  grid.set(1, 1, { text: "", colspan: 2, rowspan: 2 });
  grid.set(1, 3, { text: labels.columnPlayer ?? "", colspan: columns });
  for (let column = 1; column <= columns; column += 1) grid.set(2, column + 2, numbered(labels.column ?? "", column));
  for (let row = 1; row <= rows; row += 1) {
    if (row === 1) grid.set(3, 1, { text: labels.rowPlayer ?? "", rowspan: rows });
    grid.set(row + 2, 2, numbered(labels.row ?? "", row));
    for (let column = 1; column <= columns; column += 1) grid.set(row + 2, column + 2, labels.payoff ?? "");
  }
  // Start from no lines at all, then box the payoffs, which are rows 3 on and columns 3 on and count from 0 here
  const total = rows + 2;
  const wide = columns + 2;
  const none = [...Array.from({ length: total + 1 }, (_, i) => `h${i}.*=none`), ...Array.from({ length: wide + 1 }, (_, i) => `v${i}.*=none`)];
  const box = [
    ...Array.from({ length: rows + 1 }, (_, i) => `h${i + 2}.2-${columns + 1}=0.5`),
    ...Array.from({ length: columns + 1 }, (_, i) => `v${i + 2}.2-${rows + 1}=0.5`),
  ];
  const share = Math.floor(68 / columns);
  return grid.toMarkdown({
    caption: labels.caption ?? "",
    style: "grid",
    widths: ["16%", "16%", ...Array.from({ length: columns }, () => `${share}%`)],
    borders: [...none, ...box].join(";"),
  });
};
