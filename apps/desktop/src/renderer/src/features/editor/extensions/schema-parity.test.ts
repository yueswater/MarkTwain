import { describe, expect, it } from "@jest/globals";
import { getSchema } from "@tiptap/core";
import { parseMarkdown, schema as marktwainSchema, serializeMarkdown } from "@marktwain/schema";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { createSchemaExtensions } from "./schema-extensions";

// The schema of the editor in TipTap must match @marktwain/schema.
// On save the JSON of the editor goes to serializeMarkdown, and on load the JSON from parseMarkdown goes to the editor.
const tiptapSchema = getSchema(createSchemaExtensions());

const schemaDir = dirname(createRequire(__filename).resolve("@marktwain/schema/package.json"));
const sample = readFileSync(join(schemaDir, "fixtures", "dialect-sample.md"), "utf8");

describe("編輯器 schema 與 @marktwain/schema 對等", () => {
  it("編輯器可以產生的節點與標記，都是 @marktwain/schema 認得的", () => {
    const unknownNodes = Object.keys(tiptapSchema.nodes).filter((name) => !(name in marktwainSchema.nodes));
    const unknownMarks = Object.keys(tiptapSchema.marks).filter((name) => !(name in marktwainSchema.marks));
    expect(unknownNodes).toEqual([]);
    expect(unknownMarks).toEqual([]);
  });

  it("@marktwain/schema 的每個節點與標記，編輯器都有", () => {
    const missingNodes = Object.keys(marktwainSchema.nodes).filter((name) => !(name in tiptapSchema.nodes));
    const missingMarks = Object.keys(marktwainSchema.marks).filter((name) => !(name in tiptapSchema.marks));
    expect(missingNodes).toEqual([]);
    expect(missingMarks).toEqual([]);
  });

  it("範例文件的 JSON 載入編輯器後，每個屬性都原樣保留", () => {
    const json = parseMarkdown(sample);
    const node = tiptapSchema.nodeFromJSON(json);
    node.check();
    expect(node.toJSON()).toMatchObject(json);
  });

  it("編輯器的輸出序列化後，回到範例文件的原文", () => {
    const node = tiptapSchema.nodeFromJSON(parseMarkdown(sample));
    expect(serializeMarkdown(node.toJSON())).toBe(sample);
  });

  it("每個節點的屬性預設值，編輯器與 @marktwain/schema 一致", () => {
    for (const [name, type] of Object.entries(marktwainSchema.nodes)) {
      const ours = type.spec.attrs ?? {};
      const theirs = tiptapSchema.nodes[name]?.spec.attrs ?? {};
      for (const [attr, spec] of Object.entries(ours)) {
        expect({ node: name, attr, hasAttr: attr in theirs }).toEqual({ node: name, attr, hasAttr: true });
        expect({ node: name, attr, default: (theirs as Record<string, { default?: unknown }>)[attr]?.default }).toEqual({
          node: name,
          attr,
          default: (spec as { default?: unknown }).default,
        });
      }
    }
  });
});
