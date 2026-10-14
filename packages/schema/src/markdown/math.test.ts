import { describe, expect, it } from "@jest/globals";
import fc from "fast-check";
import { parseMarkdown } from "./parse";
import { serializeMarkdown } from "./serialize";

const text = (value: string) => ({ type: "text", text: value });
const inline = (latex: string) => ({ type: "inlineMath", attrs: { latex } });
const block = (latex: string, label: string | null = null) => ({
  type: "blockMath",
  attrs: { latex, label },
});
const doc = (...content: unknown[]) => ({ type: "doc" as const, content });
const p = (...content: unknown[]) => ({ type: "paragraph", content });

describe("行內公式", () => {
  it("解析 $…$，內容原樣保存", () => {
    expect(parseMarkdown("能量 $E=mc^2$ 守恆").content[0]).toEqual(
      p(text("能量 "), inline("E=mc^2"), text(" 守恆")),
    );
  });

  it("保留 LaTeX 的反斜線、底線與大括號，不當作 Markdown", () => {
    expect(parseMarkdown("$\\frac{a_1}{b_2} * c$").content[0]).toEqual(
      p(inline("\\frac{a_1}{b_2} * c")),
    );
  });

  it("開頭的 $ 後面是空白、或結尾的 $ 前面是空白時，不是公式", () => {
    expect(parseMarkdown("$ x$ 與 $x $").content[0]).toEqual(p(text("$ x$ 與 $x $")));
  });

  it("兩個價格不會被當成公式", () => {
    expect(parseMarkdown("要價 $5 和 $6").content[0]).toEqual(p(text("要價 $5 和 $6")));
  });

  it("沒有結尾的 $ 是一般文字", () => {
    expect(parseMarkdown("只有 $x 一個").content[0]).toEqual(p(text("只有 $x 一個")));
  });

  it("跳脫的 \\$ 是文字；公式裡的 \\$ 保留", () => {
    expect(parseMarkdown("\\$x\\$").content[0]).toEqual(p(text("$x$")));
    expect(parseMarkdown("$a\\$b$").content[0]).toEqual(p(inline("a\\$b")));
  });

  it("行內程式碼裡的 $…$ 不是公式", () => {
    const first = (parseMarkdown("`$x$`").content[0] as { content: Array<{ marks?: unknown }> }).content[0];
    expect(first?.marks).toEqual([{ type: "code" }]);
  });

  it("公式可以放在標記裡面", () => {
    expect(parseMarkdown("**$x$**").content[0]).toEqual(
      p({ type: "inlineMath", attrs: { latex: "x" }, marks: [{ type: "bold" }] }),
    );
  });
});

describe("區塊公式", () => {
  it("多行：$$ 獨立成行，結尾的 $$ 可以接 {#標籤}", () => {
    expect(parseMarkdown("$$\nE = mc^2\n$$ {#eq:one}").content[0]).toEqual(block("E = mc^2", "eq:one"));
  });

  it("多行但沒有標籤", () => {
    expect(parseMarkdown("$$\na\n\nb\n$$").content).toEqual([block("a\n\nb")]);
  });

  it("單行：$$ … $$", () => {
    expect(parseMarkdown("$$ x^2 $$ {#eq:sq}").content[0]).toEqual(block("x^2", "eq:sq"));
    expect(parseMarkdown("$$ x^2 $$").content[0]).toEqual(block("x^2"));
  });

  it("前後的段落不受影響", () => {
    const content = parseMarkdown("前\n\n$$\nx\n$$\n\n後").content;
    expect(content).toEqual([p(text("前")), block("x"), p(text("後"))]);
  });
});

describe("序列化", () => {
  it("行內公式", () => {
    expect(serializeMarkdown(doc(p(text("能量 "), inline("E=mc^2"), text(" 守恆"))))).toBe("能量 $E=mc^2$ 守恆\n");
  });

  it("區塊公式一律輸出多行，有標籤時接在結尾的 $$ 後面", () => {
    expect(serializeMarkdown(doc(block("E = mc^2", "eq:one")))).toBe("$$\nE = mc^2\n$$ {#eq:one}\n");
    expect(serializeMarkdown(doc(block("x")))).toBe("$$\nx\n$$\n");
  });

  it("行內公式前後的空白被修剪，換行變成空白", () => {
    expect(serializeMarkdown(doc(p(inline("  a\nb  "))))).toBe("$a b$\n");
  });

  it("公式內未跳脫的 $ 會被跳脫", () => {
    expect(serializeMarkdown(doc(p(inline("a$b"))))).toBe("$a\\$b$\n");
  });
});

describe("往返", () => {
  it.each([
    "能量 $E=mc^2$ 守恆\n",
    "$$\n\\int_0^1 x\\,dx\n$$ {#eq:integral}\n",
    "$$\na\n\nb\n$$\n",
    "文字 \\$5 與 $x_1$\n",
  ])("規範形式不變：%j", (markdown) => {
    expect(serializeMarkdown(parseMarkdown(markdown))).toBe(markdown);
  });

  it("任何行內公式內容都能原樣往返", () => {
    const latex = fc
      .string({ unit: fc.constantFrom(..."abcxyz\\{}^_=+-*/()[]12 .,'<>&|!"), minLength: 1, maxLength: 20 })
      .filter((s) => s === s.trim() && !/\\+$/.test(s));
    fc.assert(
      fc.property(latex, (value) => {
        const input = doc(p(text("前 "), inline(value), text(" 後")));
        expect(parseMarkdown(serializeMarkdown(input))).toEqual(input);
        return true;
      }),
      { numRuns: 500 },
    );
  });

  it("任何區塊公式內容都能原樣往返", () => {
    const latex = fc
      .string({ unit: fc.constantFrom(..."abc\\{}^_=+ \n.,"), minLength: 1, maxLength: 30 })
      .filter((s) => s.trim() !== "" && s === s.trim() && !/\n[ \t]*\n[ \t]*\$\$/.test(s));
    fc.assert(
      fc.property(latex, fc.constantFrom(null, "eq:a"), (value, label) => {
        const input = doc(block(value, label));
        expect(parseMarkdown(serializeMarkdown(input))).toEqual(input);
        return true;
      }),
      { numRuns: 500 },
    );
  });
});
