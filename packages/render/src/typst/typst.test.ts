import { describe, expect, it } from "@jest/globals";
import { parseMarkdown } from "@marktwain/schema";
import { toIr } from "../ir/to-ir";
import { renderTypstFile, type TypstKind } from "./document";
import { escapeMarkup, fenceFor, safeLength } from "./escape";

function render(md: string, kind: TypstKind = "chapter", labels: string[] = []) {
  const failures: string[] = [];
  const { document } = toIr(parseMarkdown(md), { documentId: "d", knownLabels: new Set(labels) });
  const file = renderTypstFile(document, {
    kind,
    imagePath: (src) => `/figures/${src}`,
    onMathFailure: (latex) => failures.push(latex),
  });
  return { ...file, failures, body: file.text.replace(/^#import.*\n\n/, "") };
}

describe("跳脫", () => {
  it("標記模式的特殊字元與行首記號", () => {
    expect(escapeMarkup("a#b $c* _d_ `e` <f> @g [h] ~ / \\")).toBe(
      "a\\#b \\$c\\* \\_d\\_ \\`e\\` \\<f> \\@g \\[h\\] \\~ \\/ \\\\",
    );
    expect(escapeMarkup("= 不是標題\n- 不是清單\n+ x\n1. y")).toBe("\\= 不是標題\n\\- 不是清單\n\\+ x\n1\\. y");
  });

  it("圍欄比內容裡最長的反引號多一個；寬度只接受數字加單位", () => {
    expect(fenceFor("a")).toBe("```");
    expect(fenceFor("x ```` y")).toBe("`````");
    expect(safeLength("60%")).toBe("60%");
    expect(safeLength("10cm")).toBe("10cm");
    expect(safeLength('1) , evil: (')).toBeNull();
  });
});

describe("行內", () => {
  it("粗體斜體刪除線用函式形式，連結與行內程式碼", () => {
    expect(render("a **b** *c* ~~d~~ [e](https://x.y) `f\"g`\n").body).toBe(
      'a #strong[b] #emph[c] #strike[d] #link("https://x.y")[e] #raw("f\\"g")\n',
    );
  });

  it("函式呼叫後面接 ( 時插入零寬空格", () => {
    expect(render("**粗**（括號）和 **bold**(paren)\n").body).toContain("#strong[bold]​(paren)");
  });

  it("公式轉成 Typst，失敗時退回原始碼並回報", () => {
    const ok = render("設 $\\frac{a}{b}$\n");
    expect(ok.body).toBe("設 $a/b$\n");
    const bad = render("設 $\\frac{a$\n");
    expect(bad.body).toContain('#raw("$\\\\frac{a$")');
    expect(bad.failures).toEqual(["\\frac{a"]);
  });

  it("腳註、引用四種形式、交叉引用", () => {
    expect(render("甲[^1]\n\n[^1]: 註 **粗**\n").body).toBe("甲#footnote[註 #strong[粗]]\n");
    expect(render("[@a; @b] @c [-@d] [@e]{.author}\n").body).toContain('#cp("a")#cp("b") #c("c") #cy("d") #ca("e")');
    expect(render("見 @fig:a 與 @fig:x\n", "chapter", ["fig:a"]).body).toBe("見 #ref(<fig:a>) 與 fig:x\n");
  });
});

describe("citations without a bibliography", () => {
  it("render as plain text and report the keys", () => {
    const reported: string[][] = [];
    const { document } = toIr(parseMarkdown("見 [@a; @b]\n"), { documentId: "d", knownLabels: new Set() });
    const file = renderTypstFile(document, {
      kind: "chapter",
      imagePath: (s) => s,
      onMathFailure: () => undefined,
      hasBibliography: false,
      onCitationFallback: (keys) => reported.push(keys),
    });
    expect(file.text).toContain("見 \\[a; b\\]");
    expect(reported).toEqual([["a", "b"]]);
  });
});

describe("區塊", () => {
  it("標題帶標籤，最多四層", () => {
    expect(render("# 緒論 {#cha:intro}\n\n## 動機\n").body).toBe("= 緒論 <cha:intro>\n\n== 動機\n");
  });

  it("清單：巢狀、編號起始值、項目內第二段不縮排首行", () => {
    const out = render("- 一\n  - 巢\n- 二\n\n  第二段\n\n3. 三\n").body;
    expect(out).toContain("- 一\n  - 巢\n- 二\n\n  #par(first-line-indent: 0em)[");
    expect(out).toContain("#par(first-line-indent: 0em)[");
    expect(out).toContain("3. 三");
  });

  it("引言與程式碼（含標題與標籤）", () => {
    expect(render("> 引言\n").body).toBe("#quote(block: true)[\n  引言\n]\n");
    const code = render('```python {#lst:x caption="範例"}\nprint("```")\n```\n').body;
    expect(code).toBe('#code(caption: [範例])[\n````python\nprint("```")\n````\n] <lst:x>\n');
    expect(render("```js\nx\n```\n").body).toBe("```js\nx\n```\n");
  });

  it("獨立公式帶標籤", () => {
    expect(render("$$\nx^2\n$$ {#eq:e}\n").body).toBe("$ x^2 $ <eq:e>\n");
  });

  it("圖：路徑、標題、寬度、標籤", () => {
    expect(render("![說明](images/a.png){#fig:a width=60%}\n").body).toBe(
      '#fig("/figures/images/a.png", caption: [說明], width: 60%) <fig:a>\n',
    );
  });

  it("表格轉成 tlt：欄對齊、表頭、標題、附註", () => {
    const out = render("| 甲 | 乙 |\n|:--|--:|\n| 1 | 2 |\n\n: 標題 {#tbl:t notes=\"來源\"}\n").body;
    expect(out).toBe(
      [
        "#tlt(",
        "  caption: [標題],",
        "  columns: (1fr, 1fr,),",
        "  align: (left + horizon, right + horizon,),",
        "  header: ([甲], [乙],),",
        "  rows: (",
        "    ([1], [2],),",
        "  ),",
        "  notes: [來源],",
        ") <tbl:t>",
        "",
      ].join("\n"),
    );
  });

  it("figures, groups and tables without a caption are bare, so they get no number", () => {
    expect(render("![](images/a.png)\n").body).toBe('#align(center, image("/figures/images/a.png"))\n');
    expect(render("![](images/a.png){width=50%}\n").body).toBe('#align(center, image("/figures/images/a.png", width: 50%))\n');
    const table = render("| a |\n| --- |\n| 1 |\n").body;
    expect(table.startsWith("#{\n    table(")).toBe(true);
    expect(table).not.toContain("#figure(");
    expect(table).not.toContain("tlt");
  });

  it("a code block without a caption is a plain block", () => {
    expect(render("```js {#lst:x}\nx\n```\n").body).toBe("```js\nx\n```\n");
  });

  it("complex tables are drawn as a figure with table cells, rows and column widths", () => {
    const md = [
      "| a | b | c |",
      "| :--- | :---: | ---: |",
      "| 1 |  |  |",
      "| 2 | 3 | 4 |",
      "| 5 | 6 | 7 |",
      "",
      ': Cap {#tbl:x widths="20%,auto,30%" heights="2:24pt" cells="2.1:colspan=3;3.2:rowspan=2,valign=top"}',
    ].join("\n");
    const out = render(md).body;
    expect(out).toContain("#figure(");
    expect(out).toContain("columns: (20%, auto, 30%,),");
    expect(out).toContain("rows: (auto, 24pt, auto, auto,),");
    expect(out).toContain("table.cell(colspan: 3)[1],");
    expect(out).toContain("table.cell(rowspan: 2, align: center + top)[3],");
    expect(out).toContain("      [2],");
    expect(out).not.toContain("table.cell(align: left + horizon)");
    expect(out).toContain("table.header(repeat: true, toprule,");
    expect(out).toContain("      midrule),");
    expect(out).toContain("      bottomrule,");
    expect(out).toContain("kind: table,");
    expect(out).toContain(") <tbl:x>");
  });

  it("the grid style has rules everywhere and no three line rules", () => {
    const out = render("| a | b |\n| --- | --- |\n| 1 | 2 |\n\n: {style=grid}\n").body;
    expect(out).toContain("stroke: 0.5pt,");
    expect(out).not.toContain("toprule");
    expect(out).not.toContain("bottomrule");
  });

  it("plain captioned tables still use tlt, full width", () => {
    const out = render("| a |\n| --- |\n| 1 |\n\n: Cap\n").body;
    expect(out).toContain("#tlt(");
    expect(out).toContain("columns: (1fr,),");
  });

  it("定義清單", () => {
    expect(render("PDF\n: 文件格式\n\n$E$\n: 能量\n", "denotation").body).toContain("/ PDF: 文件格式\n/ $E$: 能量");
  });
});

describe("文件種類", () => {
  it("摘要：div 各自成為中文與英文摘要，關鍵字來自設定", () => {
    const out = render("::: {.abstract-zh}\n中文摘要\n:::\n\n::: {.abstract-en}\nEnglish\n:::\n", "abstract").body;
    expect(out).toBe(
      "#abstract-zh(keywords: cfg.keywords)[\n中文摘要\n]\n\n#abstract-en(keywords: cfg.keywords-en)[\nEnglish\n]\n",
    );
  });

  it("摘要沒有 div 時整份當中文摘要；誌謝與符號說明套用模板的 show 規則", () => {
    expect(render("只有中文\n", "abstract").body).toBe("#abstract-zh(keywords: cfg.keywords)[\n只有中文\n]\n");
    expect(render("謝謝\n", "acknowledgement").body).toBe("#show: acknowledgement\n\n謝謝\n");
    expect(render("PDF\n: x\n", "denotation").body).toMatch(/^#show: denotation\n\n/);
  });

  it("附錄：設定編號樣式，第一份把計數歸零", () => {
    const { document } = toIr(parseMarkdown("# 附錄一\n"), { documentId: "d", knownLabels: new Set() });
    const file = renderTypstFile(document, {
      kind: "appendix",
      firstAppendix: true,
      imagePath: (s) => s,
      onMathFailure: () => undefined,
    });
    expect(file.text).toContain('#set heading(numbering: "A.1")\n#counter(heading).update(0)');
  });

  it("每個頂層區塊記錄輸出的起始行，供錯誤對回來源", () => {
    const { blockLines, text } = render("# 標題\n\n段落一\n\n段落二\n");
    const lines = text.split("\n");
    expect(blockLines.map((n) => lines[(n ?? 1) - 1])).toEqual(["= 標題", "段落一", "段落二"]);
  });
});

describe("code languages", () => {
  it("writes the language that Typst knows, and plain text without one", () => {
    expect(render("```shell\nls\n```\n").body).toBe("```bash\nls\n```\n");
    expect(render("```python\nx = 1\n```\n").body).toBe("```python\nx = 1\n```\n");
    expect(render("```\nplain\n```\n").body).toBe("```\nplain\n```\n");
  });
});
