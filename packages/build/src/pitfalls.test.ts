import { describe, expect, it } from "@jest/globals";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { buildTypst } from "./build-typst";
import { PNG, SAMPLE_CONFIG } from "./fixtures";

const templateDir = resolve(__dirname, "../../../resources/templates/typ");

function typstPath(): string | null {
  const configured = process.env.MARKTWAIN_TYPST ?? "typst";
  try {
    execFileSync(configured, ["--version"], { stdio: "ignore" });
    return configured;
  } catch {
    return null;
  }
}

const typst = typstPath();
const maybe = typst && existsSync(templateDir) ? describe : describe.skip;

async function compile(text: string) {
  const work = mkdtempSync(join(tmpdir(), "marktwain 陷阱 "));
  try {
    return await buildTypst({
      templateDir,
      workDir: work,
      typst: typst as string,
      config: SAMPLE_CONFIG,
      documents: [{ id: "c1", kind: "chapter", text }],
      files: [{ path: "images/a.png", data: PNG }],
      bibliography: [],
    });
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

// Each case is text that breaks a naive Markdown to Typst conversion.
const CASES: Record<string, string> = {
  "markup characters in plain text": "價格 #1 $5 與 50% * 2 _x_ `y` <z> @w [a] ~b \\c // d /* e */",
  "line start markers that are not structure": "# 標題\n\n\\= 不是標題\n\n\\- 不是清單\n\n\\+ 不是清單\n\n1\\. 不是編號",
  "text that looks like list markers once escaped": "文字 = 等號 - 減號 + 加號 / 斜線",
  "bold followed by parentheses": "**粗體**（括號）與 **bold**(paren) 與 *italic*[bracket]",
  "adjacent emphasis in CJK": "這是**重點**內文，也有*斜體*與~~刪除線~~緊貼文字",
  "inline code with quotes and backslashes": '設定 `a = "b\\n"` 與 `` ` `` 反引號',
  "code block containing fences": "````text\n```\ninner\n```\n````",
  "code block with a caption and a label": '```python {#lst:p caption="含 **粗體** 的標題"}\nprint("hi")\n```',
  "math with braces, fractions and text": "行內 $\\alpha + \\beta_{i}^{2}$ 與 $\\text{速度} = \\frac{d}{t}$\n\n$$\n\\int_0^1 x^2 \\, dx = \\frac{1}{3}\n$$",
  "a formula that cannot convert still builds": "壞公式 $\\frac{a$ 與 $$ \\notamacro{x} $$",
  "footnotes with formatting": "文字[^a]\n\n[^a]: 註含 **粗體**、`code` 與 $x^2$。",
  "nested lists with second paragraphs": "- 一\n\n  第二段\n\n  - 巢\n\n    巢的第二段\n- 二\n\n3. 三\n4. 四",
  "a table with empty cells and alignment": "| a | b | c |\n|:--|:-:|--:|\n| 1 |   | 3 |\n|   | 2 |   |\n\n: 空格 {#tbl:e}",
  "a figure without caption and with a missing label reference": "![](images/a.png)\n\n見 @fig:nonexistent。",
  "a grid table with merged cells, widths, heights and vertical alignment":
    '| a | b | c |\n|:--|:-:|--:|\n| 1 |   |   |\n| 2 | 3 | 4 |\n| 5 | 6 | 7 |\n\n: Merged {#tbl:m style=grid widths="20%,auto,30%" heights="2:24pt" cells="2.1:colspan=3;3.2:rowspan=2,valign=top" notes="source"}',
  "a three line table with merged cells and notes":
    '| a | b |\n| --- | --- |\n| 1 |   |\n| 2 | 3 |\n\n: Three line {#tbl:n cells="2.1:colspan=2" notes="note"}',
  "code blocks in several languages":
    ["python", "r", "shell", "cpp", "csharp", "sql", "latex", "javascript", "typescript", "matlab", "xml", "markdown"].map((l) => "```" + l + "\nx\n```").join("\n\n"),
  "headings up to four levels": "# 一\n\n## 二\n\n### 三\n\n#### 四\n\n正文。",
  "quotes and rules": "> 引言\n> 第二行\n\n---\n\n後文。",
  "links with special characters": "[連結](https://example.com/a?b=1&c=2#d)",
  "hard breaks": "第一行  \n第二行\\\n第三行",
};

maybe("conversion pitfalls build with the real template", () => {
  for (const [name, text] of Object.entries(CASES)) {
    it(name, async () => {
      const result = await compile(`# 標題\n\n${text}\n`);
      expect(result.diagnostics.filter((d) => d.severity === "error")).toEqual([]);
      expect(result.ok).toBe(true);
    }, 120_000);
  }
});
