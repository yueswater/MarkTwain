import { describe, expect, it } from "@jest/globals";
import {
  formatCells,
  formatHeights,
  formatWidths,
  normalizeWidths,
  parseCells,
  parseHeights,
  parseWidths,
} from "./table-extras";

describe("table extras", () => {
  it("round trips cells, sorted by row then column", () => {
    const map = parseCells("3.2:rowspan=2,align=center;2.1:colspan=3,valign=top");
    expect(formatCells(map)).toBe("2.1:colspan=3,valign=top;3.2:rowspan=2,align=center");
  });

  it("drops invalid cell entries and spans below two", () => {
    const map = parseCells("x:colspan=2;2.1:colspan=1;2.2:colspan=a,align=middle;3.1:align=right");
    expect([...map.keys()]).toEqual(["3.1"]);
    expect(map.get("3.1")).toEqual({ align: "right" });
  });

  it("parses and formats heights, dropping bad lengths", () => {
    expect(parseHeights("4:2em,2:30pt,3:evil").size).toBe(2);
    expect(formatHeights(parseHeights("4:2em,2:30pt"))).toBe("2:30pt,4:2em");
  });

  it("widths keep auto columns and drop to empty when everything is auto", () => {
    expect(parseWidths("20%, auto,30%")).toEqual(["20%", null, "30%"]);
    expect(formatWidths(["20%", null, "30%"])).toBe("20%,auto,30%");
    expect(formatWidths([null, null])).toBe("");
    expect(normalizeWidths("20%,oops,30%")).toBe("20%,auto,30%");
    expect(normalizeWidths("")).toBe("");
  });
});
