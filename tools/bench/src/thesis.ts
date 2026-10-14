import type { BuildDocument } from "@marktwain/build";

export type ThesisShape = {
  chapters: number;
  paragraphsPerChapter: number;
  /** One figure for every this many paragraphs, 0 for none */
  figureEvery: number;
  /** One table for every this many paragraphs, 0 for none */
  tableEvery: number;
};

export const SHAPES = {
  small: { chapters: 2, paragraphsPerChapter: 10, figureEvery: 5, tableEvery: 0 },
  medium: { chapters: 4, paragraphsPerChapter: 40, figureEvery: 10, tableEvery: 20 },
  /** A long thesis of about 185 pages with the template front matter */
  long: { chapters: 6, paragraphsPerChapter: 90, figureEvery: 12, tableEvery: 15 },
} as const satisfies Record<string, ThesisShape>;

export type ShapeName = keyof typeof SHAPES;

function chapter(index: number, shape: ThesisShape): string {
  const out = [`# 第 ${index} 章 {#cha:c${index}}`, ""];
  for (let p = 1; p <= shape.paragraphsPerChapter; p++) {
    out.push(
      `這是第 ${index} 章第 ${p} 段，包含**粗體**、*斜體*、行內公式 $x_${p}^2 + \\frac{a}{b}$ 與腳註[^c${index}p${p}]。` +
        "為了讓排版有足夠的內容，這裡重複一段中文敘述，說明研究背景、方法與結果，並依序引用前面的圖與表。",
      "",
      `[^c${index}p${p}]: 第 ${index} 章第 ${p} 段的腳註內容。`,
      "",
    );
    if (shape.figureEvery > 0 && p % shape.figureEvery === 0) {
      out.push(`![圖 ${index}.${p}](images/a.png){#fig:f${index}x${p} width=50%}`, "");
    }
    if (shape.tableEvery > 0 && p % shape.tableEvery === 0) {
      out.push("| 項目 | 數值 |", "|:--|--:|", "| 甲 | 1 |", "| 乙 | 2 |", "", `: 第 ${index} 章的表 ${p} {#tbl:t${index}x${p}}`, "");
    }
    if (p % 30 === 0) out.push("$$", "\\sum_{i=1}^{n} i^2", `$$ {#eq:e${index}x${p}}`, "");
  }
  return out.join("\n");
}

/** Builds the documents of a synthetic thesis with the given shape. */
export function makeThesis(shape: ThesisShape): BuildDocument[] {
  const docs: BuildDocument[] = [
    { id: "ack", kind: "acknowledgement", text: "感謝所有協助這份研究的人。\n" },
    { id: "abs", kind: "abstract", text: "::: {.abstract-zh}\n中文摘要。\n:::\n\n::: {.abstract-en}\nEnglish abstract.\n:::\n" },
  ];
  for (let i = 1; i <= shape.chapters; i++) docs.push({ id: `c${i}`, kind: "chapter", text: chapter(i, shape) });
  return docs;
}
