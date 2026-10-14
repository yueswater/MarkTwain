import { describe, expect, it } from "@jest/globals";
import fc from "fast-check";
import { parseMarkdown } from "./parse";
import { serializeMarkdown } from "./serialize";

const text = (value: string) => ({ type: "text", text: value });
const p = (...content: unknown[]) => ({ type: "paragraph", content });
const doc = (...content: unknown[]) => ({ type: "doc" as const, content });
const term = (...content: unknown[]) => ({ type: "definitionTerm", content });
const description = (...blocks: unknown[]) => ({ type: "definitionDescription", content: blocks });
const list = (...items: unknown[]) => ({ type: "definitionList", content: items });

describe("定義清單：解析", () => {
  it("詞與說明成對", () => {
    expect(parseMarkdown("PDF\n: 編譯後輸出的文件格式\n\nYAML\n: 設定檔格式").content[0]).toEqual(
      list(
        term(text("PDF")),
        description(p(text("編譯後輸出的文件格式"))),
        term(text("YAML")),
        description(p(text("設定檔格式"))),
      ),
    );
  });

  it("詞可以有行內標記與公式", () => {
    expect(parseMarkdown("$E$\n: 能量").content[0]).toEqual(
      list(term({ type: "inlineMath", attrs: { latex: "E" } }), description(p(text("能量")))),
    );
  });

  it("一個詞可以有多段說明", () => {
    const parsed = parseMarkdown("詞\n: 第一段\n\n  第二段").content[0] as { content: Array<{ content: unknown[] }> };
    expect(parsed.content[1]?.content).toEqual([p(text("第一段")), p(text("第二段"))]);
  });

  it("定義清單前後的段落不受影響", () => {
    const content = parseMarkdown("前\n\n詞\n: 說明\n\n後").content;
    expect(content.map((node) => (node as { type: string }).type)).toEqual(["paragraph", "definitionList", "paragraph"]);
  });
});

describe("定義清單：只認 `:` 當定義記號", () => {
  it("後面的程式碼區塊裡以 ~ 開頭的行，不會被當成定義", () => {
    const content = parseMarkdown("詞\n: 說明\n\n```\n~\n```").content;
    expect(content.map((node) => (node as { type: string }).type)).toEqual(["definitionList", "codeBlock"]);
  });

  it("單獨一行的 ~ 或 ~ 開頭的行不是定義", () => {
    expect((parseMarkdown("詞\n~ 說明").content[0] as { type: string }).type).toBe("paragraph");
  });

  it("一個詞可以有多個定義", () => {
    const parsed = parseMarkdown("詞\n: 甲\n: 乙").content[0] as { content: Array<{ type: string }> };
    expect(parsed.content.map((node) => node.type)).toEqual(["definitionTerm", "definitionDescription", "definitionDescription"]);
  });

  it("三個冒號的圍欄 div 不是定義", () => {
    expect((parseMarkdown("詞\n::: x\n內文\n:::").content[0] as { type: string }).type).not.toBe("definitionList");
  });
});

describe("定義清單：序列化", () => {
  it("規範形式：詞一行、說明以 `: ` 開頭，每組之間空一行", () => {
    expect(
      serializeMarkdown(
        doc(
          list(
            term(text("PDF")),
            description(p(text("文件格式"))),
            term(text("YAML")),
            description(p(text("設定檔格式"))),
          ),
        ),
      ),
    ).toBe("PDF\n: 文件格式\n\nYAML\n: 設定檔格式\n");
  });

  it("多段說明的後續段落縮排兩格", () => {
    expect(
      serializeMarkdown(doc(list(term(text("詞")), description(p(text("一")), p(text("二")))))),
    ).toBe("詞\n: 一\n\n  二\n");
  });

  it("詞的開頭是冒號時要跳脫", () => {
    expect(serializeMarkdown(doc(list(term(text(": x")), description(p(text("y"))))))).toBe("\\: x\n: y\n");
  });
});

describe("往返", () => {
  it.each([
    "PDF\n: 編譯後輸出的文件格式\n\nYAML\n: 設定檔格式\n",
    "詞\n: 一\n\n  二\n",
    "**粗** *斜*\n: 說明 $x$\n",
    "前\n\n詞\n: 說明\n\n後\n",
  ])("規範形式不變：%j", (markdown) => {
    expect(serializeMarkdown(parseMarkdown(markdown))).toBe(markdown);
  });

  it("任何詞與說明的文字都能原樣往返", () => {
    const word = fc
      .string({ unit: fc.constantFrom(..."ab 中文*_[]$#-:.\\|"), minLength: 1, maxLength: 8 })
      .filter((s) => s === s.trim());
    fc.assert(
      fc.property(fc.array(fc.tuple(word, word), { minLength: 1, maxLength: 3 }), (pairs) => {
        const input = doc(list(...pairs.flatMap(([t, d]) => [term(text(t)), description(p(text(d)))])));
        expect(parseMarkdown(serializeMarkdown(input))).toEqual(input);
        return true;
      }),
      { numRuns: 300 },
    );
  });
});
