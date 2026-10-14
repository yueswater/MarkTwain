import { describe, expect, it } from "@jest/globals";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { MarkName, NodeName } from "../model/names";
import { parseMarkdown } from "./parse";
import { serializeMarkdown } from "./serialize";

// fixtures/dialect-sample.md covers every syntax of the dialect, the editor parity test and the export tests use it too.
const sample = readFileSync(join(__dirname, "../../fixtures/dialect-sample.md"), "utf8");

type Json = { type: string; content?: Json[]; marks?: Array<{ type: string }> };

function collect(node: Json, nodes: Set<string>, marks: Set<string>): void {
  nodes.add(node.type);
  for (const mark of node.marks ?? []) marks.add(mark.type);
  for (const child of node.content ?? []) collect(child, nodes, marks);
}

describe("範例文件 dialect-sample.md", () => {
  it("已經是規範形式：解析再序列化得到原文", () => {
    expect(serializeMarkdown(parseMarkdown(sample))).toBe(sample);
  });

  it("涵蓋 schema 裡的每一種節點與標記（新增節點時請一併更新範例）", () => {
    const nodes = new Set<string>();
    const marks = new Set<string>();
    collect(parseMarkdown(sample) as Json, nodes, marks);
    expect([...Object.values(NodeName)].filter((name) => !nodes.has(name))).toEqual([]);
    expect([...Object.values(MarkName)].filter((name) => !marks.has(name))).toEqual([]);
  });
});
