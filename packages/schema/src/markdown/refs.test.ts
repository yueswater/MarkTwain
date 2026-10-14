import { describe, expect, it } from "@jest/globals";
import fc from "fast-check";
import { escapeText } from "./escape";
import { parseMarkdown } from "./parse";
import { serializeMarkdown } from "./serialize";

const text = (value: string) => ({ type: "text", text: value });
const cite = (keys: string[], form = "paren") => ({ type: "citation", attrs: { keys, form } });
const xref = (label: string) => ({ type: "crossRef", attrs: { label } });
const note = (value: string) => ({ type: "footnote", attrs: { text: value } });
const p = (...content: unknown[]) => ({ type: "paragraph", content });
const doc = (...content: unknown[]) => ({ type: "doc" as const, content });
const first = (md: string) => parseMarkdown(md).content[0];

describe("文獻引用：解析", () => {
  it("括號式 [@key]，可以有多個 key", () => {
    expect(first("見[@wang2020]。")).toEqual(p(text("見"), cite(["wang2020"]), text("。")));
    expect(first("[@a; @b]")).toEqual(p(cite(["a", "b"])));
  });

  it("年份 [-@key]", () => {
    expect(first("[-@wang2020]")).toEqual(p(cite(["wang2020"], "year")));
  });

  it("作者 [@key]{.author}", () => {
    expect(first("[@wang2020]{.author} 指出")).toEqual(p(cite(["wang2020"], "author"), text(" 指出")));
  });

  it("敘述式 @key，結尾的標點不算 key", () => {
    expect(first("@wang2020 指出")).toEqual(p(cite(["wang2020"], "prose"), text(" 指出")));
    expect(first("如 @wang2020, 所示")).toEqual(p(text("如 "), cite(["wang2020"], "prose"), text(", 所示")));
    expect(first("@wang2020.")).toEqual(p(cite(["wang2020"], "prose"), text(".")));
  });

  it("key 可以含 : . - 等內部標點", () => {
    expect(first("@wang-2020_a.b")).toEqual(p(cite(["wang-2020_a.b"], "prose")));
  });

  it("大括號寫法 @{key} 可以緊接文字", () => {
    expect(first("@{wang2020}abc")).toEqual(p(cite(["wang2020"], "prose"), text("abc")));
  });

  it("電子郵件與單獨的 @ 不是引用", () => {
    expect(first("寄到 a@b.com")).toEqual(p(text("寄到 a@b.com")));
    expect(first("@ 符號")).toEqual(p(text("@ 符號")));
  });

  it("帶頁碼等不支援的內容時，不是括號式引用；裡面的 @a 仍是敘述式引用", () => {
    expect(first("[@a, p. 3]")).toEqual(p(text("["), cite(["a"], "prose"), text(", p. 3]")));
  });
});

describe("交叉引用：解析", () => {
  it("六種前綴", () => {
    for (const label of ["cha:a", "sec:b", "fig:c", "tbl:d", "eq:e", "lst:f"]) {
      expect(first(`見 @${label}`)).toEqual(p(text("見 "), xref(label)));
    }
  });

  it("結尾的標點不算標籤", () => {
    expect(first("見 @fig:one.")).toEqual(p(text("見 "), xref("fig:one"), text(".")));
    expect(first("見 @fig:one，")).toEqual(p(text("見 "), xref("fig:one"), text("，")));
  });

  it("中括號包起來的單一交叉引用也可以", () => {
    expect(first("[@fig:one]")).toEqual(p(xref("fig:one")));
  });

  it("前綴不是六種之一時是文獻引用", () => {
    expect(first("@figure:one")).toEqual(p(cite(["figure:one"], "prose")));
  });
});

describe("腳註", () => {
  it("定義的文字放回引用節點", () => {
    expect(first("文字[^1]\n\n[^1]: 註解 **內容**")).toEqual(p(text("文字"), note("註解 **內容**")));
  });

  it("定義區塊不會留在文件裡", () => {
    expect(parseMarkdown("文字[^a]\n\n[^a]: 內容").content).toHaveLength(1);
  });

  it("多個腳註各自對應", () => {
    expect(first("甲[^x]乙[^y]\n\n[^x]: 一\n[^y]: 二")).toEqual(
      p(text("甲"), note("一"), text("乙"), note("二")),
    );
  });
});

describe("序列化", () => {
  it("各種引用形式", () => {
    expect(serializeMarkdown(doc(p(cite(["a", "b"]))))).toBe("[@a; @b]\n");
    expect(serializeMarkdown(doc(p(cite(["a"], "year"))))).toBe("[-@a]\n");
    expect(serializeMarkdown(doc(p(cite(["a", "b"], "year"))))).toBe("[-@a; -@b]\n");
    expect(serializeMarkdown(doc(p(cite(["a"], "author"))))).toBe("[@a]{.author}\n");
    expect(serializeMarkdown(doc(p(cite(["a"], "prose"), text(" 指出"))))).toBe("@a 指出\n");
  });

  it("敘述式有多個 key 時退成括號式", () => {
    expect(serializeMarkdown(doc(p(cite(["a", "b"], "prose"))))).toBe("[@a; @b]\n");
  });

  it("後面緊接文字或 key 結尾是標點時，敘述式改用大括號", () => {
    expect(serializeMarkdown(doc(p(cite(["a"], "prose"), text("bc"))))).toBe("@{a}bc\n");
    expect(serializeMarkdown(doc(p(cite(["a."], "prose"))))).toBe("@{a.}\n");
  });

  it("交叉引用", () => {
    expect(serializeMarkdown(doc(p(text("見 "), xref("fig:one"), text(" 與 "), xref("tbl:t"))))).toBe(
      "見 @fig:one 與 @tbl:t\n",
    );
    expect(serializeMarkdown(doc(p(xref("fig:one"), text("x"))))).toBe("@{fig:one}x\n");
  });

  it("腳註依出現順序編號，定義放在文件最後", () => {
    const input = doc(p(text("甲"), note("一")), p(text("乙"), note("二")));
    expect(serializeMarkdown(input)).toBe("甲[^1]\n\n乙[^2]\n\n[^1]: 一\n[^2]: 二\n");
  });

  it("沒有腳註時不輸出定義", () => {
    expect(serializeMarkdown(doc(p(text("x"))))).toBe("x\n");
  });

  it("腳註內容裡的換行變成空白", () => {
    expect(serializeMarkdown(doc(p(note("a\nb"))))).toBe("[^1]\n\n[^1]: a b\n");
  });
});

describe("文字中的 @", () => {
  const mid = { startOfLine: false, inHeading: false };

  it("可能被當成引用的 @ 要跳脫", () => {
    expect(escapeText("@wang", mid)).toBe("\\@wang");
    expect(escapeText("見 @wang 與 @{k}", mid)).toBe("見 \\@wang 與 \\@{k}".replace("{k}", "\\{k\\}"));
  });

  it("字中間的 @（電子郵件）不用跳脫，單獨的 @ 也不用", () => {
    expect(escapeText("a@b.com", mid)).toBe("a@b.com");
    expect(escapeText("@ 符號", mid)).toBe("@ 符號");
  });
});

describe("往返", () => {
  it.each([
    "見[@wang2020]與[@a; @b]，[-@c]，[@d]{.author}。\n",
    "@wang2020 指出，見 @fig:one 與 @eq:a。\n",
    "文字[^1]與更多[^2]\n\n[^1]: 一 **粗**\n[^2]: 二\n",
    "寄到 a@b.com 或 \\@wang\n",
  ])("規範形式不變：%j", (markdown) => {
    expect(serializeMarkdown(parseMarkdown(markdown))).toBe(markdown);
  });

  it("任何 key 與形式的引用都能原樣往返", () => {
    const key = fc
      .string({ unit: fc.constantFrom(..."abcxyz019_-.:"), minLength: 1, maxLength: 10 })
      .filter((s) => /^[A-Za-z0-9_]/.test(s) && !/^(cha|sec|fig|tbl|eq|lst):/.test(s));
    fc.assert(
      fc.property(
        fc.array(key, { minLength: 1, maxLength: 3 }),
        fc.constantFrom("paren", "prose", "year", "author"),
        fc.constantFrom("", "x", " ", "，", "."),
        (keys, form, after) => {
          const only = form === "prose" || form === "author" ? keys.slice(0, 1) : keys;
          const input = doc(p(text("前 "), cite(only, form), text(`${after}後`)));
          const output = parseMarkdown(serializeMarkdown(input));
          expect(output).toEqual(input);
          return true;
        },
      ),
      { numRuns: 400 },
    );
  });

  it("任何標籤的交叉引用都能原樣往返", () => {
    const name = fc.string({ unit: fc.constantFrom(..."abcxyz019_-.:"), minLength: 1, maxLength: 10 });
    fc.assert(
      fc.property(
        fc.constantFrom("cha", "sec", "fig", "tbl", "eq", "lst"),
        name,
        fc.constantFrom("", "x", "，", "."),
        (kind, rest, after) => {
          const input = doc(p(text("見 "), xref(`${kind}:${rest}`), text(`${after}後`)));
          expect(parseMarkdown(serializeMarkdown(input))).toEqual(input);
          return true;
        },
      ),
      { numRuns: 400 },
    );
  });
});
