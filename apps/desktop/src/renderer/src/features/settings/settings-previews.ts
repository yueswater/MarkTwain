/** Paper sizes in centimetres, width and height. */
export const PAPER_CM: Record<string, readonly [number, number]> = {
  a4: [21, 29.7],
  "us-letter": [21.59, 27.94],
  b5: [17.6, 25],
};

export type Margins = { top: number; bottom: number; left: number; right: number };

export type PageGeometry = {
  widthCm: number;
  heightCm: number;
  /** The text area as a share of the page, in percent */
  text: { left: number; top: number; width: number; height: number };
  /** False when the margins leave no room for text */
  valid: boolean;
};

/** Where the text area lies on the page for a paper size and four margins. The area is kept inside the page. */
export function pageGeometry(paper: string, margins: Margins): PageGeometry {
  const [widthCm, heightCm] = PAPER_CM[paper] ?? PAPER_CM.a4!;
  const textWidth = widthCm - margins.left - margins.right;
  const textHeight = heightCm - margins.top - margins.bottom;
  const valid = textWidth > 1 && textHeight > 1;
  const clamp = (value: number) => Math.min(Math.max(value, 0), 100);
  return {
    widthCm,
    heightCm,
    valid,
    text: {
      left: clamp((margins.left / widthCm) * 100),
      top: clamp((margins.top / heightCm) * 100),
      width: clamp(Math.max(textWidth, 0.1) / widthCm * 100),
      height: clamp(Math.max(textHeight, 0.1) / heightCm * 100),
    },
  };
}

export type PatternNumbers = { C: string; S: string; B: string };

export type PatternResult = { ok: true; text: string } | { ok: false; problem: string };

/** Fills a cross-reference pattern such as 第{C}章第{S}節 with sample numbers, a placeholder that is unknown or not closed is reported. */
export function expandPattern(pattern: string, numbers: PatternNumbers): PatternResult {
  let out = "";
  for (let i = 0; i < pattern.length; i += 1) {
    const ch = pattern[i]!;
    if (ch === "}") return { ok: false, problem: "}" };
    if (ch !== "{") {
      out += ch;
      continue;
    }
    const end = pattern.indexOf("}", i);
    if (end === -1) return { ok: false, problem: pattern.slice(i) };
    const name = pattern.slice(i + 1, end);
    if (name !== "C" && name !== "S" && name !== "B") return { ok: false, problem: `{${name}}` };
    out += numbers[name];
    i = end;
  }
  return { ok: true, text: out };
}

/** Sample numbers for the example sentence, Chinese numerals when the pattern is Chinese. */
export function sampleNumbers(pattern: string): PatternNumbers {
  return /[一-鿿]/.test(pattern) ? { C: "三", S: "二", B: "一" } : { C: "3", S: "2", B: "1" };
}

const SYMBOLS = ["*", "†", "‡", "§"];
const ROMAN = ["i", "ii", "iii", "iv", "v"];

/** How a numbering style writes the first numbers. */
export function numberingSample(style: string, count = 3): string[] {
  return Array.from({ length: count }, (_, index) => {
    const n = index + 1;
    switch (style) {
      case "a":
        return String.fromCharCode(96 + n);
      case "A":
        return String.fromCharCode(64 + n);
      case "i":
        return ROMAN[index] ?? String(n);
      case "I":
        return (ROMAN[index] ?? String(n)).toUpperCase();
      case "*":
        return SYMBOLS[index] ?? String(n);
      default:
        return String(n);
    }
  });
}

/** An example of the numbers a setting gives, as text. Equations show their numbers in brackets. */
export function perChapterExample(kind: "footnote" | "equation", perChapter: boolean, style: string): string {
  const mark = (value: string) => (kind === "equation" ? `(${value})` : value);
  const [a, b] = numberingSample(style, 2) as [string, string];
  if (kind === "equation" && perChapter) return [`(3.${a})`, `(3.${b})`, `(4.${a})`].join("  ");
  if (perChapter) return [mark(a), mark(b), "…", mark(a)].join("  ");
  return [mark(a), mark(b), mark(numberingSample(style, 3)[2]!)].join("  ");
}

export type OutlineLine = { level: 1 | 2 | 3 | 4; shown: boolean };

/** The four sample lines of a table of contents, with the ones inside the chosen depth marked. */
export function outlineLines(depth: number): OutlineLine[] {
  return ([1, 2, 3, 4] as const).map((level) => ({ level, shown: level <= depth }));
}

/** The title as it is printed: a tilde adds space between the characters. */
export function spreadTitle(title: string): string {
  return title.replace(/~/g, " ");
}
