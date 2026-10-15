import { describe, expect, it } from "@jest/globals";
import { getSchema } from "@tiptap/core";
import { parseMarkdown } from "@marktwain/schema";
import { createSchemaExtensions } from "../extensions/schema-extensions";
import { widthsFromTable } from "./table-commands";

const schema = getSchema(createSchemaExtensions());

function tableOf(md: string) {
  const doc = schema.nodeFromJSON(parseMarkdown(md));
  return doc.firstChild!;
}

describe("widthsFromTable", () => {
  it("turns the pixel widths derived from percentages back into the same percentages", () => {
    const table = tableOf("| a | b | c |\n| --- | --- | --- |\n| 1 | 2 | 3 |\n\n: {widths=20%,30%,50%}\n");
    expect(widthsFromTable(table)).toBe("20%,30%,50%");
  });

  it("keeps automatic columns", () => {
    const table = tableOf("| a | b |\n| --- | --- |\n| 1 | 2 |\n\n: {widths=40%,auto}\n");
    expect(widthsFromTable(table)).toBe("40%,auto");
  });

  it("is empty when no column has a width", () => {
    expect(widthsFromTable(tableOf("| a | b |\n| --- | --- |\n| 1 | 2 |\n"))).toBe("");
  });

  it("reads the widths of merged cells from the first cell that spans a column", () => {
    const table = tableOf("| a | b |\n| --- | --- |\n| 1 |  |\n\n: {widths=40%,60% cells=2.1:colspan=2}\n");
    expect(widthsFromTable(table)).toBe("40%,60%");
  });
});
