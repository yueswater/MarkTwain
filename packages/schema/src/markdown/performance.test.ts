import { describe, expect, it } from "@jest/globals";
import { parseMarkdown } from "./parse";
import { serializeMarkdown } from "./serialize";

/** A long chapter of about 700 paragraphs with formulas, footnotes, citations and tables, about 120 thousand characters. */
function longChapter(paragraphs: number): string {
  const parts: string[] = ["# 第一章 {#cha:long}\n"];
  for (let i = 1; i <= paragraphs; i++) {
    parts.push(
      `這是第 ${i} 段，包含**粗體**、*斜體*、行內公式 $x_${i}^2 + y$ 與腳註[^n${i}]，並引用文獻 [@wang2020; @lee2019]，詳見 @fig:f${i % 20}。` +
        "中文內容需要足夠的長度來模擬真實的論文段落，讓解析與序列化的成本接近實際使用的情況。",
    );
    parts.push(`[^n${i}]: 第 ${i} 個腳註的內容，含 $a+b$。`);
    if (i % 15 === 0) parts.push(`![圖 ${i}](images/${i}.png){#fig:f${i % 20}}`);
    if (i % 40 === 0) parts.push("| 甲 | 乙 |\n|:--|--:|\n| 1 | 2 |\n\n: 表格標題\n");
    if (i % 50 === 0) parts.push("$$\n\\sum_{k=1}^{n} k\n$$ {#eq:e" + i + "}");
  }
  return parts.join("\n\n") + "\n";
}

describe("效能預算", () => {
  const text = longChapter(700);

  it("長章節（約 12 萬字元）解析加序列化在 3 秒內完成，且內容不變", () => {
    expect(text.length).toBeGreaterThan(80_000);
    const start = performance.now();
    const doc = parseMarkdown(text);
    const out = serializeMarkdown(doc);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(3000);
    expect(parseMarkdown(out)).toEqual(doc);
  });
});
