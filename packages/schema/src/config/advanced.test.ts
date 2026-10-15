import { describe, expect, it } from "@jest/globals";
import { ADVANCED_FIELDS, advancedField, getPath, isValidAdvanced, mergeConfigs, readAdvanced, writeAdvanced } from "./advanced";

const TEXT = [
  "# kept comment",
  "title: 題目",
  "layout:",
  "  font-size: 14",
  "  margin:",
  "    top: 2.5",
  "page-number:",
  '  format: "第 {page} 頁"',
  "",
].join("\n");

describe("readAdvanced", () => {
  it("reads only the overrides that are set, with the right shape", () => {
    expect(readAdvanced(TEXT)).toEqual({ "layout.font-size": 14, "layout.margin.top": 2.5, "page-number.format": "第 {page} 頁" });
  });

  it("ignores values that do not fit the field", () => {
    expect(readAdvanced("layout:\n  font-size: huge\n  justify: maybe\n  heading:\n    size: [1, 2]\n")).toEqual({});
  });
});

describe("writeAdvanced", () => {
  it("sets and removes overrides and keeps the rest, including comments", () => {
    const out = writeAdvanced(TEXT, { "layout.font-size": 12, "layout.justify": false, "page-number.format": undefined });
    expect(out).toContain("# kept comment");
    expect(out).toContain("title: 題目");
    expect(readAdvanced(out)).toEqual({ "layout.font-size": 12, "layout.margin.top": 2.5, "layout.justify": false });
    expect(out).not.toContain("page-number");
  });

  it("creates deep sections and writes arrays", () => {
    const out = writeAdvanced("", { "layout.heading.size": [20, 18, 16, 14], "layout.caption-position.table": "top", "layout.font-latin": ["Tinos"] });
    expect(readAdvanced(out)).toEqual({ "layout.heading.size": [20, 18, 16, 14], "layout.caption-position.table": "top", "layout.font-latin": ["Tinos"] });
  });

  it("drops sections that become empty and refuses invalid values", () => {
    const out = writeAdvanced("layout:\n  margin:\n    top: 3\n", { "layout.margin.top": undefined, "layout.font-size": 500, "layout.paper": "tabloid" });
    expect(out.trim()).toBe("{}");
  });
});

describe("validation", () => {
  it("checks ranges, options and tuples", () => {
    const size = advancedField("layout.font-size")!;
    expect(isValidAdvanced(size, 12)).toBe(true);
    expect(isValidAdvanced(size, 3)).toBe(false);
    expect(isValidAdvanced(advancedField("layout.paper")!, "a4")).toBe(true);
    expect(isValidAdvanced(advancedField("layout.heading.align")!, ["left", "left", "left", "x"])).toBe(false);
    expect(isValidAdvanced(advancedField("layout.font-cjk")!, [])).toBe(false);
  });

  it("every field has a unique path and a selectable field has options", () => {
    expect(new Set(ADVANCED_FIELDS.map((f) => f.path)).size).toBe(ADVANCED_FIELDS.length);
    for (const field of ADVANCED_FIELDS) {
      if (field.kind === "select" || field.kind === "select4") expect(field.options?.length).toBeGreaterThan(0);
    }
  });
});

describe("mergeConfigs and getPath", () => {
  it("merges tables by key and lets later layers win", () => {
    const merged = mergeConfigs({ layout: { "font-size": 12, margin: { top: 3, left: 3 } } } as never, { layout: { margin: { top: 2 } } }, null);
    expect(getPath(merged, "layout.margin.top")).toBe(2);
    expect(getPath(merged, "layout.margin.left")).toBe(3);
    expect(getPath(merged, "layout.font-size")).toBe(12);
    expect(getPath(merged, "layout.nothing.here")).toBeUndefined();
  });
});

describe("inheritedValues", () => {
  it("takes the template defaults and lets the school preset override them", async () => {
    const { inheritedValues } = await import("./advanced");
    const defaults = "layout:\n  font-size: 12\n  font-latin: [A, B]\n  margin:\n    top: 3\n    left: 3\ncross-ref:\n  chapter: 第{C}章\n";
    const school = "layout:\n  margin:\n    top: 2\n";
    const values = inheritedValues(defaults, school);
    expect(values["layout.font-size"]).toBe(12);
    expect(values["layout.margin.top"]).toBe(2);
    expect(values["layout.margin.left"]).toBe(3);
    expect(values["layout.font-latin"]).toEqual(["A", "B"]);
    expect(values["cross-ref.chapter"]).toBe("第{C}章");
  });

  it("reads the real template defaults when they are fetched", async () => {
    const { existsSync, readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const { inheritedValues } = await import("./advanced");
    const file = resolve(__dirname, "../../../../resources/templates/typ/schools/default.yml");
    if (!existsSync(file)) return;
    const values = inheritedValues(readFileSync(file, "utf8"), null);
    expect(values["layout.font-size"]).toBe(12);
    expect(values["layout.heading.size"]).toEqual([18, 16, 14, 12]);
    expect(values["page-number.position"]).toBe("bottom");
    // Every advanced field has a default in the template, a typo in a path would show up here
    // The names of the blocks follow the language of the thesis, and the markers of lists have none, the template keeps its own unless the author chooses
    const missing = ADVANCED_FIELDS.filter((f) => !(f.path in values) && !f.path.startsWith("statements.name.") && !f.path.startsWith("lists.")).map((f) => f.path);
    // The watermark image has no default, the template leaves it empty and a school fills it in
    expect(missing).toEqual(["layout.par-spacing", "layout.first-line-indent", "watermark.image"]);
  });
});
