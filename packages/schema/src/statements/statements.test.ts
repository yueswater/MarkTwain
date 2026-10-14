import { describe, expect, it } from "@jest/globals";
import { isValidLabel } from "../labels/labels";
import { parseMarkdown } from "../markdown/parse";
import { collectTargets } from "../numbering/collect";
import { resolveNumbers } from "../numbering/numbering";
import { resolveStatementStyle, statementOfClasses, tintOf } from "./kinds";

const options = { equationNumbering: "all", numberPerChapter: false } as const;

describe("statement labels", () => {
  it("每個種類的前綴都是合法標籤", () => {
    for (const label of ["def:a", "lem:ss", "alm:x", "thm:main", "prp:p", "cor:c", "cas:one", "exa:e", "rem:r"]) {
      expect(isValidLabel(label)).toBe(true);
    }
    expect(isValidLabel("prf:a")).toBe(false);
  });
});

describe("statement numbering", () => {
  const md = [
    "::: {.definition #def:a title=\"範數\"}",
    "內容",
    ":::",
    "",
    "::: {.lemma #lem:ss}",
    "引理",
    ":::",
    "",
    "::: {.proof}",
    "證明",
    ":::",
    "",
    "::: {.definition}",
    "沒標籤",
    ":::",
    "",
    "::: {.definition #def:b}",
    "第三個",
    ":::",
  ].join("\n");

  it("每種類獨立計數，沒有標籤的也佔一個編號，證明不編號", () => {
    const { targets } = collectTargets(parseMarkdown(md), "d1");
    expect(targets.map((t) => t.kind)).toEqual(["def", "lem", "def", "def"]);
    const { numbers } = resolveNumbers(targets, [], options);
    expect(numbers.get("def:a")).toBe("1");
    expect(numbers.get("lem:ss")).toBe("1");
    expect(numbers.get("def:b")).toBe("3");
  });

  it("定理區塊裡的公式照常編號", () => {
    const { targets } = collectTargets(parseMarkdown("::: {.theorem #thm:t}\n\n$$\nx\n$$ {#eq:x}\n\n:::\n"), "d1");
    expect(targets.map((t) => t.label)).toEqual(["thm:t", "eq:x"]);
  });
});

describe("statement style", () => {
  it("class 對到種類", () => {
    expect(statementOfClasses(["x", "lemma"])?.prefix).toBe("lem");
    expect(statementOfClasses(["abstract-zh"])).toBeNull();
  });

  it("淡底從 accent 推導", () => {
    expect(tintOf("#000000", 0.1)).toBe("#E6E6E6");
    expect(tintOf("#FFFFFF")).toBe("#FFFFFF");
  });

  it("自訂名稱去掉空白，空白名稱改用語言預設", () => {
    const style = resolveStatementStyle({ name: { lemma: " 引理 ", remark: " " } }, "zh");
    expect(style.names.lemma).toBe("引理");
    expect(style.names.remark).toBe("註記");
    expect(resolveStatementStyle(undefined, "en").names.theorem).toBe("Theorem");
  });
});
