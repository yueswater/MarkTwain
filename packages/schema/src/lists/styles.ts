/** How the levels of a list are marked, an ordered list by a numbering style and a bullet list by a symbol. */
export type OrderedStyle = {
  id: string;
  /** The numbering pattern of Typst, the same pattern is what the editor imitates */
  pattern: string;
};

export const ORDERED_STYLES: readonly OrderedStyle[] = [
  { id: "decimal", pattern: "1." },
  { id: "decimal-paren", pattern: "(1)" },
  { id: "decimal-bracket", pattern: "1)" },
  { id: "circled", pattern: "①" },
  { id: "lower-alpha", pattern: "a." },
  { id: "upper-alpha", pattern: "A." },
  { id: "lower-roman", pattern: "i." },
  { id: "upper-roman", pattern: "I." },
  { id: "cjk", pattern: "一、" },
  { id: "cjk-paren", pattern: "(一)" },
];

export type BulletSymbol = { id: string; symbol: string };

export const BULLET_SYMBOLS: readonly BulletSymbol[] = [
  { id: "bullet", symbol: "•" },
  { id: "circle", symbol: "○" },
  { id: "small-square", symbol: "▪" },
  { id: "dash", symbol: "–" },
  { id: "square", symbol: "■" },
  { id: "triangle", symbol: "▸" },
  { id: "diamond", symbol: "◆" },
  { id: "arrow", symbol: "➤" },
];

export type ListLevels = { ordered: string[]; bullet: string[] };

export type ListPreset = { id: string; levels: ListLevels | null };

/** The choices offered first, null is the look of the template with nothing changed. */
export const LIST_PRESETS: readonly ListPreset[] = [
  { id: "default", levels: null },
  { id: "western", levels: { ordered: ["decimal", "lower-alpha", "lower-roman"], bullet: ["bullet", "circle", "dash"] } },
  { id: "chinese", levels: { ordered: ["cjk", "cjk-paren", "decimal", "decimal-paren"], bullet: ["bullet", "circle", "small-square", "dash"] } },
  { id: "levels", levels: { ordered: ["decimal", "decimal-paren", "circled", "lower-alpha", "lower-roman"], bullet: ["bullet", "circle", "small-square", "dash", "square"] } },
];

const ORDERED_IDS = new Set(ORDERED_STYLES.map((style) => style.id));
const BULLET_IDS = new Set(BULLET_SYMBOLS.map((symbol) => symbol.id));

export const isOrderedStyle = (id: unknown): id is string => typeof id === "string" && ORDERED_IDS.has(id);
export const isBulletSymbol = (id: unknown): id is string => typeof id === "string" && BULLET_IDS.has(id);

/** The levels from the settings of a thesis, unknown names are left out and a missing or empty kind keeps the default of the template. */
export function resolveListLevels(section: unknown): { ordered: string[] | null; bullet: string[] | null } {
  const data = (section !== null && typeof section === "object" ? section : {}) as Record<string, unknown>;
  const pick = (value: unknown, known: (id: unknown) => boolean): string[] | null => {
    const found = Array.isArray(value) ? value.filter((id): id is string => known(id)) : [];
    return found.length > 0 ? found : null;
  };
  return { ordered: pick(data.ordered, isOrderedStyle), bullet: pick(data.bullet, isBulletSymbol) };
}

/** The level of a list that is nested depth times, depth 1 is the outermost list, deeper than the levels starts again from the first. */
export function levelAt<T>(levels: readonly T[], depth: number): T | undefined {
  return levels.length === 0 ? undefined : levels[(Math.max(depth, 1) - 1) % levels.length];
}

const CJK_DIGITS = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九"];

/** Chinese numerals as Typst writes them, 十, 十一, 二十, 一百零一. */
function cjkNumber(n: number): string {
  if (n < 10) return CJK_DIGITS[n] as string;
  if (n < 20) return `十${n % 10 === 0 ? "" : CJK_DIGITS[n % 10]}`;
  if (n < 100) return `${CJK_DIGITS[Math.floor(n / 10)]}十${n % 10 === 0 ? "" : CJK_DIGITS[n % 10]}`;
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  const head = `${CJK_DIGITS[hundreds]}百`;
  if (rest === 0) return head;
  if (rest < 10) return `${head}零${CJK_DIGITS[rest]}`;
  return `${head}${rest < 20 ? "一" : ""}${cjkNumber(rest)}`;
}

function circled(n: number): string {
  if (n >= 1 && n <= 20) return String.fromCodePoint(0x2460 + n - 1);
  if (n <= 35) return String.fromCodePoint(0x3251 + n - 21);
  if (n <= 50) return String.fromCodePoint(0x32b1 + n - 36);
  return String(n);
}

function alpha(n: number, upper: boolean): string {
  // Like the columns of a spreadsheet, after z comes aa, ab and so on, as Typst writes them
  let rest = n;
  let out = "";
  while (rest > 0) {
    const digit = (rest - 1) % 26;
    out = String.fromCharCode((upper ? 65 : 97) + digit) + out;
    rest = Math.floor((rest - 1) / 26);
  }
  return out;
}

function roman(n: number, upper: boolean): string {
  const table: [number, string][] = [[1000, "m"], [900, "cm"], [500, "d"], [400, "cd"], [100, "c"], [90, "xc"], [50, "l"], [40, "xl"], [10, "x"], [9, "ix"], [5, "v"], [4, "iv"], [1, "i"]];
  let rest = n;
  let out = "";
  for (const [value, text] of table) {
    while (rest >= value) {
      out += text;
      rest -= value;
    }
  }
  return upper ? out.toUpperCase() : out;
}

/** The marker of the nth item of an ordered list in a style, a number that cannot be written in the style is shown as a plain number. */
export function formatOrdered(style: string, n: number): string {
  if (!Number.isInteger(n) || n < 1) return String(n);
  switch (style) {
    case "decimal-paren":
      return `(${n})`;
    case "decimal-bracket":
      return `${n})`;
    case "circled":
      return circled(n);
    case "lower-alpha":
      return `${alpha(n, false)}.`;
    case "upper-alpha":
      return `${alpha(n, true)}.`;
    case "lower-roman":
      return `${roman(n, false)}.`;
    case "upper-roman":
      return `${roman(n, true)}.`;
    case "cjk":
      return `${cjkNumber(n)}、`;
    case "cjk-paren":
      return `(${cjkNumber(n)})`;
    default:
      return `${n}.`;
  }
}

/** The symbol of a bullet list level. */
export function bulletSymbol(id: string): string {
  return BULLET_SYMBOLS.find((symbol) => symbol.id === id)?.symbol ?? "•";
}
