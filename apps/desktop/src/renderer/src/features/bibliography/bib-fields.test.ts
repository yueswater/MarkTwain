import { describe, expect, it } from "@jest/globals";
import { fieldsFor, requiredNames } from "./bib-fields";

describe("fieldsFor", () => {
  it("lists the fields of a type and keeps unusual ones the entry has", () => {
    expect(fieldsFor("article", {})).toContain("journal");
    expect(fieldsFor("article", {})).not.toContain("school");
    const fields = fieldsFor("book", { isbn: "1", title: "T" });
    expect(fields.filter((name) => name === "title")).toHaveLength(1);
    expect(fields.at(-1)).toBe("isbn");
  });

  it("falls back to the layout of misc for an unknown type", () => {
    expect(fieldsFor("software", {})).toEqual(fieldsFor("misc", {}));
  });
});

describe("requiredNames", () => {
  it("marks the first name of each group", () => {
    expect([...requiredNames("book")].sort()).toEqual(["author", "publisher", "title", "year"]);
    expect([...requiredNames("software")]).toEqual([]);
  });
});
