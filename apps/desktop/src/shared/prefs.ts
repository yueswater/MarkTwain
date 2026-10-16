import { isHexColor, STATEMENT_KINDS } from "@marktwain/schema";

/** Preferences of the editor, kept per user and not per project. */
export type EditorPrefs = {
  /** Text size in the editor in pixels */
  fontSize: number;
  lineHeight: number;
  /** Width of the text column */
  contentWidth: "narrow" | "normal" | "wide";
  /** What the heading levels 2, 3 and 4 are called in the toolbar and the slash menu, an empty name keeps the default of the language */
  headingNames: string[];
  /** Number the top level blocks in the margin */
  lineNumbers: boolean;
  /** Mark in the editor what was added, changed and taken away since the latest saved version */
  showChanges: boolean;
  spellcheck: boolean;
  fontFamily: "sans" | "serif";
  codeFontSize: number;
  /** Pause after typing before the text is saved */
  autosaveDelayMs: number;
  /** Turn pasted Markdown text into document structure */
  pasteMarkdown: boolean;
  /** Pause after a save before the preview rebuilds */
  previewDelayMs: number;
  /** How definitions, lemmas and theorems look in the editor, the PDF is not affected */
  statementStyle: "callout" | "colored";
  /** Accent color of each kind in the colored style, written as #RRGGBB, a kind that is not here keeps its default */
  statementColors: Record<string, string>;
};

export const DEFAULT_PREFS: EditorPrefs = {
  fontSize: 16,
  lineHeight: 1.75,
  contentWidth: "normal",
  headingNames: ["", "", ""],
  lineNumbers: true,
  showChanges: true,
  spellcheck: false,
  fontFamily: "sans",
  codeFontSize: 14,
  autosaveDelayMs: 800,
  pasteMarkdown: true,
  previewDelayMs: 700,
  statementStyle: "callout",
  statementColors: {},
};

export const PREF_LIMITS = {
  fontSize: [12, 28],
  lineHeight: [1.2, 2.4],
  codeFontSize: [10, 24],
  autosaveDelayMs: [200, 5000],
  previewDelayMs: [200, 5000],
} as const;

const clamp = (value: unknown, [min, max]: readonly [number, number], fallback: number): number => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

/** Turns anything read from disk or from the renderer into valid preferences, bad values fall back to the default. */
export function sanitizePrefs(input: unknown, base: EditorPrefs = DEFAULT_PREFS): EditorPrefs {
  const data = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const pick = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T =>
    allowed.includes(value as T) ? (value as T) : fallback;
  const bool = (value: unknown, fallback: boolean) => (typeof value === "boolean" ? value : fallback);
  // Three short names, anything else is an empty one
  const names = (value: unknown, fallback: string[]): string[] =>
    Array.isArray(value) ? [0, 1, 2].map((i) => (typeof value[i] === "string" ? (value[i] as string).trim().slice(0, 16) : (fallback[i] ?? ""))) : fallback;
  // Only known kinds with a hex color are kept
  const colors = (value: unknown, fallback: Record<string, string>): Record<string, string> => {
    if (!value || typeof value !== "object") return fallback;
    const out: Record<string, string> = {};
    for (const kind of STATEMENT_KINDS) {
      const color = (value as Record<string, unknown>)[kind.id];
      if (typeof color === "string" && isHexColor(color)) out[kind.id] = color.toUpperCase();
    }
    return out;
  };
  return {
    fontSize: Math.round(clamp(data.fontSize ?? base.fontSize, PREF_LIMITS.fontSize, base.fontSize)),
    lineHeight: Math.round(clamp(data.lineHeight ?? base.lineHeight, PREF_LIMITS.lineHeight, base.lineHeight) * 100) / 100,
    contentWidth: pick(data.contentWidth ?? base.contentWidth, ["narrow", "normal", "wide"], base.contentWidth),
    headingNames: names(data.headingNames ?? base.headingNames, base.headingNames),
    lineNumbers: bool(data.lineNumbers ?? base.lineNumbers, base.lineNumbers),
    showChanges: bool(data.showChanges ?? base.showChanges, base.showChanges),
    spellcheck: bool(data.spellcheck ?? base.spellcheck, base.spellcheck),
    fontFamily: pick(data.fontFamily ?? base.fontFamily, ["sans", "serif"], base.fontFamily),
    codeFontSize: Math.round(clamp(data.codeFontSize ?? base.codeFontSize, PREF_LIMITS.codeFontSize, base.codeFontSize)),
    autosaveDelayMs: Math.round(clamp(data.autosaveDelayMs ?? base.autosaveDelayMs, PREF_LIMITS.autosaveDelayMs, base.autosaveDelayMs)),
    pasteMarkdown: bool(data.pasteMarkdown ?? base.pasteMarkdown, base.pasteMarkdown),
    previewDelayMs: Math.round(clamp(data.previewDelayMs ?? base.previewDelayMs, PREF_LIMITS.previewDelayMs, base.previewDelayMs)),
    statementStyle: pick(data.statementStyle ?? base.statementStyle, ["callout", "colored"], base.statementStyle),
    statementColors: colors(data.statementColors ?? base.statementColors, base.statementColors),
  };
}
