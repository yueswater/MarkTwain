import { describe, expect, it } from "@jest/globals";
import { getSchema } from "@tiptap/core";
import { Node } from "@tiptap/pm/model";
import { createSchemaExtensions } from "../extensions/schema-extensions";
import { findStatementHeads } from "./statement-heads";

const schema = getSchema(createSchemaExtensions());
const div = (classes: string[], props: Record<string, string> = {}) => ({
  type: "div",
  attrs: { id: null, classes, props },
  content: [{ type: "paragraph", content: [{ type: "text", text: "x" }] }],
});
const doc = (...blocks: object[]) => Node.fromJSON(schema, { type: "doc", content: blocks });
const name = (kind: { id: string }) => kind.id;

describe("findStatementHeads", () => {
  it("numbers each kind on its own and carries on from the documents before", () => {
    const heads = findStatementHeads(doc(div(["lemma"]), div(["definition"], { title: "範數" }), div(["lemma"]), div(["proof"])), { lemma: 0, lem: 2, def: 4 }, name);
    expect(heads.map((h) => h.text)).toEqual(["lemma 3", "definition 5（範數）", "lemma 4", "proof"]);
  });

  it("ignores divs that are not statements", () => {
    expect(findStatementHeads(doc(div(["abstract-zh"])), {}, name)).toEqual([]);
  });

  it("counts blocks that sit inside other blocks", () => {
    const outer = { ...div(["theorem"]), content: [div(["remark"])] };
    expect(findStatementHeads(doc(outer), {}, name).map((h) => h.text)).toEqual(["theorem 1", "remark 1"]);
  });
});
