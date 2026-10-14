import { describe, expect, it } from "@jest/globals";
import { getSchema } from "@tiptap/core";
import { parseMarkdown } from "@marktwain/schema";
import { createSchemaExtensions } from "./extensions/schema-extensions";
import { existingLabels, findUnlabeledTargets, newLabel } from "./unlabeled-targets";

const schema = getSchema(createSchemaExtensions());
const doc = (md: string) => schema.nodeFromJSON(parseMarkdown(md));

describe("findUnlabeledTargets", () => {
  it("找出沒有標籤的標題、圖、公式，已有標籤的不列", () => {
    const md = ["# 緒論", "", "## 動機 {#sec:why}", "", "![圖說](a.png)", "", "$$", "x^2", "$$", ""].join("\n");
    const found = findUnlabeledTargets(doc(md));
    expect(found.map((t) => [t.kind, t.text])).toEqual([
      ["cha", "緒論"],
      ["fig", "圖說"],
      ["eq", "x^2"],
    ]);
  });
});

describe("newLabel", () => {
  it("避開文件內與其他文件已有的標籤", () => {
    const d = doc("# A {#cha:aaaa}\n");
    expect(existingLabels(d, ["fig:b"])).toEqual(new Set(["cha:aaaa", "fig:b"]));
    expect(newLabel("fig", d, [])).toMatch(/^fig:[0-9a-f]{4}$/);
  });
});
