import katex from "katex";

export type MathTarget = {
  kind: "inline" | "block";
  latex: string;
  /** Position when editing an existing formula, null when inserting */
  pos: number | null;
  /** Where the formula is or where it will go, in window coordinates, so the box can sit next to it */
  anchor?: { top: number; bottom: number; left: number; right: number };
};

/** Renders with KaTeX, returns null on a syntax error. */
export function renderLatex(latex: string, displayMode: boolean): string | null {
  try {
    return katex.renderToString(latex, { displayMode, throwOnError: true, output: "htmlAndMathml" });
  } catch {
    return null;
  }
}

/**
 * Where KaTeX stopped on a formula that it cannot read, as the few letters around the place, null when the formula is fine.
 * The message of KaTeX is in English and for a person who knows TeX, the place is what helps.
 */
export function latexErrorNear(latex: string): string | null {
  try {
    katex.renderToString(latex, { displayMode: false, throwOnError: true });
    return null;
  } catch (error) {
    const position = typeof (error as { position?: unknown }).position === "number" ? (error as { position: number }).position : latex.length;
    const start = Math.max(0, position - 8);
    const near = latex.slice(start, Math.min(latex.length, position + 12)).trim();
    return near === "" ? latex.slice(-12) : near;
  }
}

const GAP = 8;
const MARGIN = 8;

/** Where the box goes: under the anchor, above it when there is no room below, and inside the window sideways. */
export function placeBox(
  anchor: NonNullable<MathTarget["anchor"]>,
  size: { width: number; height: number },
  view: { width: number; height: number },
): { top: number; left: number } {
  const below = anchor.bottom + GAP;
  const fitsBelow = below + size.height <= view.height - MARGIN;
  const top = fitsBelow ? below : Math.max(MARGIN, anchor.top - GAP - size.height);
  const left = Math.min(Math.max(anchor.left, MARGIN), Math.max(MARGIN, view.width - size.width - MARGIN));
  return { top, left };
}
