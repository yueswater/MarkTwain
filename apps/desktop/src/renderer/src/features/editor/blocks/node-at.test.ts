import { describe, expect, it } from "@jest/globals";
import { getSchema } from "@tiptap/core";
import { createSchemaExtensions } from "../extensions/schema-extensions";
import { parseMarkdown } from "@marktwain/schema";
import { Node as PmNode } from "@tiptap/pm/model";
import { nodeAtSafe } from "./node-at";

const schema = getSchema(createSchemaExtensions());
const doc = PmNode.fromJSON(schema, parseMarkdown("# 標題\n\n內文\n"));

describe("nodeAtSafe", () => {
  it("finds the node at a position of the document", () => {
    expect(nodeAtSafe(doc, 0)?.type.name).toBe("heading");
  });

  it("gives null and does not throw for a position beyond the end, or one that is not a position", () => {
    expect(() => doc.nodeAt(doc.content.size + 30)).toThrow();
    expect(nodeAtSafe(doc, doc.content.size + 30)).toBeNull();
    expect(nodeAtSafe(doc, -1)).toBeNull();
    expect(nodeAtSafe(doc, Number.NaN)).toBeNull();
  });
});
