/** Preferences of the editor, kept per user and not per project. */
export type EditorPrefs = {
  /** Text size in the editor in pixels */
  fontSize: number;
  lineHeight: number;
  /** Width of the text column */
  contentWidth: "narrow" | "normal" | "wide";
  /** Number the top level blocks in the margin */
  lineNumbers: boolean;
  spellcheck: boolean;
  fontFamily: "sans" | "serif";
  codeFontSize: number;
  /** Pause after typing before the text is saved */
  autosaveDelayMs: number;
  /** Turn pasted Markdown text into document structure */
  pasteMarkdown: boolean;
  /** Resolution of the preview pages */
  previewPpi: number;
  /** Pause after a save before the preview rebuilds */
  previewDelayMs: number;
};

export const DEFAULT_PREFS: EditorPrefs = {
  fontSize: 16,
  lineHeight: 1.75,
  contentWidth: "normal",
  lineNumbers: true,
  spellcheck: false,
  fontFamily: "sans",
  codeFontSize: 14,
  autosaveDelayMs: 800,
  pasteMarkdown: true,
  previewPpi: 110,
  previewDelayMs: 700,
};

export const PREF_LIMITS = {
  fontSize: [12, 28],
  lineHeight: [1.2, 2.4],
  codeFontSize: [10, 24],
  autosaveDelayMs: [200, 5000],
  previewPpi: [60, 220],
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
  return {
    fontSize: Math.round(clamp(data.fontSize ?? base.fontSize, PREF_LIMITS.fontSize, base.fontSize)),
    lineHeight: Math.round(clamp(data.lineHeight ?? base.lineHeight, PREF_LIMITS.lineHeight, base.lineHeight) * 100) / 100,
    contentWidth: pick(data.contentWidth ?? base.contentWidth, ["narrow", "normal", "wide"], base.contentWidth),
    lineNumbers: bool(data.lineNumbers ?? base.lineNumbers, base.lineNumbers),
    spellcheck: bool(data.spellcheck ?? base.spellcheck, base.spellcheck),
    fontFamily: pick(data.fontFamily ?? base.fontFamily, ["sans", "serif"], base.fontFamily),
    codeFontSize: Math.round(clamp(data.codeFontSize ?? base.codeFontSize, PREF_LIMITS.codeFontSize, base.codeFontSize)),
    autosaveDelayMs: Math.round(clamp(data.autosaveDelayMs ?? base.autosaveDelayMs, PREF_LIMITS.autosaveDelayMs, base.autosaveDelayMs)),
    pasteMarkdown: bool(data.pasteMarkdown ?? base.pasteMarkdown, base.pasteMarkdown),
    previewPpi: Math.round(clamp(data.previewPpi ?? base.previewPpi, PREF_LIMITS.previewPpi, base.previewPpi)),
    previewDelayMs: Math.round(clamp(data.previewDelayMs ?? base.previewDelayMs, PREF_LIMITS.previewDelayMs, base.previewDelayMs)),
  };
}
