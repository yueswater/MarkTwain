import { describe, expect, it } from "@jest/globals";
import { parseMarkdown, resolveStatementStyle } from "@marktwain/schema";
import { toIr } from "../ir/to-ir";
import { renderLatexFile, type LatexKind } from "./document";
import { escapeCode, escapeTex, escapeUrl, safeKey, texLength } from "./escape";
import { displayMath, isBalanced } from "./math";
import { renderStatementsLatex } from "./statements";

function render(md: string, kind: LatexKind = "chapter", labels: string[] = [], hasBibliography?: boolean) {
  const failures: string[] = [];
  const unsupported: string[] = [];
  const { document } = toIr(parseMarkdown(md), { documentId: "d", knownLabels: new Set(labels) });
  const file = renderLatexFile(document, {
    kind,
    imagePath: (src) => `figures/${src}`,
    onMathFailure: (latex) => failures.push(latex),
    onUnsupported: (feature) => unsupported.push(feature),
    hasBibliography,
  });
  return { ...file, failures, unsupported };
}

describe("escape", () => {
  it("escapes the characters that LaTeX reads as commands", () => {
    expect(escapeTex("a & b % c $ d # e _ f { g } h ~ i ^ j \\ k")).toBe(
      "a \\& b \\% c \\$ d \\# e \\_ f \\{ g \\} h \\textasciitilde{} i \\^{} j \\textbackslash{} k",
    );
    expect(escapeTex("[a] 後")).toBe("{[}a{]} 後");
  });

  it("writes straight quotes as curly ones", () => {
    expect(escapeTex('他說 "好" 與 \'a\'')).toBe("他說 “好” 與 ‘a’");
  });

  it("keeps hyphens and quotes of code as typed", () => {
    expect(escapeCode("--font-path `x` 'y'")).toBe("{-}{-}font{-}path {`}x{`} {'}y{'}");
  });

  it("encodes an address so it cannot end the argument", () => {
    expect(escapeUrl("https://a.b/c d?x=1&y=100%#top")).toBe("https://a.b/c\\%20d?x=1&y=100\\%\\#top");
    expect(escapeUrl("https://a.b/{x}")).toBe("https://a.b/\\%7Bx\\%7D");
  });

  it("turns a width into a TeX length and drops anything else", () => {
    expect(texLength("60%")).toBe("0.6\\linewidth");
    expect(texLength("5cm")).toBe("5cm");
    expect(texLength("1) , evil")).toBeNull();
    expect(texLength(null)).toBeNull();
    expect(safeKey("a b,c{d}")).toBe("a_b_c_d_");
  });
});

describe("math", () => {
  it("accepts balanced formulas and refuses the others", () => {
    expect(isBalanced("\\frac{a}{b}")).toBe(true);
    expect(isBalanced("\\{ x \\}")).toBe(true);
    expect(isBalanced("\\frac{a")).toBe(false);
    expect(isBalanced("a $ b")).toBe(false);
    expect(isBalanced("\\begin{cases} a \\end{matrix}")).toBe(false);
  });

  it("sets rows in aligned and leaves display environments alone", () => {
    expect(displayMath("a = b \\\\ c = d")).toEqual({ ok: true, env: "equation", body: "\\begin{aligned}\na = b \\\\ c = d\n\\end{aligned}" });
    expect(displayMath("\\begin{align} a &= b \\end{align}")).toMatchObject({ env: "display" });
    expect(displayMath("\\begin{aligned} a \\\\ b \\end{aligned}")).toMatchObject({ env: "equation", body: "\\begin{aligned} a \\\\ b \\end{aligned}" });
    expect(displayMath("\\frac{a")).toEqual({ ok: false });
  });
});

describe("inline", () => {
  it("writes marks, links, code and breaks", () => {
    expect(render("a **b** *c* ~~d~~ [e](https://x.y) `f_g`\n").text).toBe(
      "a \\textbf{b} \\textit{c} \\mtstrike{d} \\href{https://x.y}{e} \\mtcode{f\\_g}\n",
    );
  });

  it("falls back to the source of a formula that cannot be set and reports it", () => {
    expect(render("設 $\\frac{a}{b}$\n").text).toBe("設 $\\frac{a}{b}$\n");
    const bad = render("設 $\\frac{a$\n");
    expect(bad.text).toContain("\\mtcode{");
    expect(bad.failures).toEqual(["\\frac{a"]);
  });

  it("writes footnotes, the four citation forms and cross references", () => {
    expect(render("甲[^1]\n\n[^1]: 註 **粗**\n").text).toBe("甲\\footnote{註 \\textbf{粗}}\n");
    expect(render("[@a; @b] @c [-@d] [@e]{.author}\n").text).toBe("\\citep{a,b} \\citet{c} \\citeyear{d} \\citeauthor{e}\n");
    expect(render("見 @fig:a @tbl:b @lst:c @eq:d @cha:e @sec:f 與 @fig:x\n", "chapter", ["fig:a", "tbl:b", "lst:c", "eq:d", "cha:e", "sec:f"]).text).toBe(
      "見 \\figref{fig:a} \\tblref{tbl:b} \\lstref{lst:c} \\eqref{eq:d} \\ref{cha:e} \\ref{sec:f} 與 fig:x\n",
    );
  });

  it("writes a citation as plain text when the project has no bibliography", () => {
    expect(render("[@a; @b]\n", "chapter", [], false).text).toBe("{[}a; b{]}\n");
  });
});

describe("blocks", () => {
  it("writes headings with labels, one command for each level", () => {
    expect(render("# 一 {#cha:a}\n\n## 二\n\n### 三\n\n#### 四\n").text).toBe(
      "\\chapter{一}\\label{cha:a}\n\n\\section{二}\n\n\\subsection{三}\n\n\\subsubsection{四}\n",
    );
  });

  it("writes lists with their start number", () => {
    expect(render("- a\n  - b\n- c\n\n3. x\n4. y\n").text).toBe(
      "\\begin{itemize}\n\\item a\n\\begin{itemize}\n\\item b\n\\end{itemize}\n\\item c\n\\end{itemize}\n\n\\begin{enumerate}[start=3]\n\\item x\n\\item y\n\\end{enumerate}\n",
    );
  });

  it("writes figures through the commands of the template", () => {
    expect(render("![圖](a.png){#fig:one width=60%}\n").text).toContain("\\fig[width=0.6\\linewidth]{figures/a.png}{圖}{fig:one}");
    expect(render("![](a.png)\n").text).toBe("\\begin{center}\n\\includegraphics[width=0.8\\linewidth]{figures/a.png}\n\\end{center}\n");
    const row = render("::: {#fig:row .figrow}\n![甲](a.png)\n\n![乙](b.png)\n\n總標題\n:::\n").text;
    expect(row).toContain("\\begin{figrow}{總標題}{fig:row}");
    expect(row).toContain("\\subfig{figures/a.png}{甲}");
    const grid = render("::: {#fig:g .figgrid columns=2}\n![甲](a.png)\n\n![乙](b.png)\n\n總標題\n:::\n").text;
    expect(grid).toContain("\\begin{figgrid}[columns=2]{總標題}{fig:g}");
  });

  it("writes a plain table with tlt and a table with merged cells with tbl", () => {
    const plain = render("| 甲 | 乙 |\n|:--|--:|\n| 1 | 2 |\n\n: 範例 {#tbl:t notes=\"來源\"}\n").text;
    expect(plain).toContain("\\begin{tlt}[notes={來源}]{範例}{tbl:t}{");
    expect(plain).toContain("甲 & 乙 \\\\\n\\midrule\n1 & 2 \\\\");
    expect(plain).toContain("\\end{tlt}");
    expect(plain).not.toContain("tabularx");
  });

  it("writes code with a language that listings knows, and plain text for the others", () => {
    expect(render('```python {#lst:x caption="範例"}\nprint(1)\n```\n').text).toBe(
      "\\begin{lstlisting}[language=Python,caption={範例},label=lst:x]\nprint(1)\n\\end{lstlisting}\n",
    );
    expect(render("```brainfuck\n+\n```\n").text).toContain("language=plain");
    expect(render("```\n\\end{lstlisting}\n```\n").text).toContain("\\begin{codeblock}");
  });

  it("numbers a formula that has a label and leaves the others", () => {
    expect(render("$$\nx\n$$ {#eq:e}\n").text).toBe("\\begin{equation}\n\\label{eq:e}\nx\n\\end{equation}\n");
    expect(render("$$\nx\n$$\n").text).toBe("\\begin{equation*}\nx\n\\end{equation*}\n");
  });

  it("writes a definition list and a block of a mathematical thesis", () => {
    expect(render("詞\n: 說明\n").text).toBe("\\begin{description}\n\\item[{詞}] 說明\n\\end{description}\n");
    const block = render('::: {.theorem #thm:a title="主要"}\n內容\n:::\n').text;
    expect(block).toBe("\\begin{mtstatement}{theorem}{主要}{thm:a}\n內容\n\\end{mtstatement}\n");
    expect(render("見 @thm:a\n", "chapter", ["thm:a"]).text).toBe("見 \\mtstatementref{theorem}{thm:a}\n");
  });
});

describe("documents", () => {
  it("wraps the front matter in the environments of the template", () => {
    expect(render("感謝\n", "acknowledgement").text).toBe("\\begin{acknowledgement}\n感謝\n\\end{acknowledgement}\n");
    expect(render("PDF\n: 格式\n", "denotation").text).toContain("\\begin{denotation}\n\\begin{description}");
    const abstract = render("::: {.abstract-zh}\n中文\n:::\n\n::: {.abstract-en}\nEnglish\n:::\n", "abstract").text;
    expect(abstract).toBe("\\begin{abstractzh}\n中文\n\\end{abstractzh}\n\n\\begin{abstracten}\nEnglish\n\\end{abstracten}\n");
    expect(render("只有中文\n", "abstract").text).toBe("\\begin{abstractzh}\n只有中文\n\\end{abstractzh}\n");
  });

  it("records where each block starts", () => {
    expect(render("# 一\n\n文字\n\n## 二\n").blockLines).toEqual([1, 3, 5]);
    expect(render("感謝\n\n再謝\n", "acknowledgement").blockLines).toEqual([2, 4]);
  });
});

describe("statements file", () => {
  it("names every kind, counts the numbered ones and sets the markers of lists", () => {
    const text = renderStatementsLatex(resolveStatementStyle({ name: { theorem: "定理一" } }, "zh"), { ordered: ["cjk", "decimal-paren"], bullet: ["diamond"] });
    expect(text).toContain("\\newcounter{mt@theorem}");
    expect(text).not.toContain("\\newcounter{mt@proof}");
    expect(text).toContain("\\csname mt@name@theorem\\endcsname{定理一}");
    expect(text).toContain("\\setlist[enumerate,1]{label=\\chinese{enumi}、}");
    expect(text).toContain("\\setlist[enumerate,2]{label=(\\arabic{enumii})}");
    expect(text).toContain("\\setlist[enumerate,3]{label=\\chinese{enumiii}、}");
    expect(text).toContain("\\setlist[itemize,1]{label=◆}");
  });

  it("leaves the lists of the template alone when no markers are chosen", () => {
    expect(renderStatementsLatex(resolveStatementStyle({}, "zh"))).not.toContain("\\setlist");
  });
});
