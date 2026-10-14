import { describe, expect, it } from "@jest/globals";
import { parseMarkdown } from "./parse";
import { serializeMarkdown } from "./serialize";

type Inline = { type: string; text?: string; marks?: { type: string }[] };

function inlines(md: string): Inline[] {
  const doc = parseMarkdown(md) as unknown as { content: { content: Inline[] }[] };
  return doc.content[0]?.content ?? [];
}

describe("中文標點緊貼強調符號（#71）", () => {
  it.each([
    ["說**「重點」**", "「重點」", "bold"],
    ["他說*「好」*，然後", "「好」", "italic"],
    ["**（注意）**這是", "（注意）", "bold"],
    ["看~~「舊」~~新", "「舊」", "strike"],
    ["前文**，重點。**後文", "，重點。", "bold"],
  ])("%s 解析成帶標記的文字", (md, text, mark) => {
    const marked = inlines(md).find((node) => node.marks?.some((m) => m.type === mark));
    expect(marked?.text).toBe(text);
  });

  it("序列化再解析，標記不會消失", () => {
    for (const md of ["說**「重點」**", "他說*「好」*，然後", "看~~「舊」~~新"]) {
      const once = parseMarkdown(md);
      expect(parseMarkdown(serializeMarkdown(once))).toEqual(once);
    }
  });

  it("英文與一般用法不受影響", () => {
    expect(inlines("a **b** c").map((n) => n.text)).toEqual(["a ", "b", " c"]);
    expect(inlines("2 * 3 * 4").map((n) => n.text)).toEqual(["2 * 3 * 4"]);
  });
});
