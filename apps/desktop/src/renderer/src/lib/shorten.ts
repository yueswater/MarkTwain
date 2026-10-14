const ELLIPSIS = "...";

/** Commands that need an argument after them, so a cut right behind one would leave it dangling. */
const NEEDS_ARGUMENT = new Set([
  "frac", "dfrac", "tfrac", "sqrt", "text", "mathrm", "mathbb", "mathbf", "mathcal", "operatorname",
  "overline", "underline", "hat", "widehat", "tilde", "widetilde", "bar", "vec", "left", "right", "begin", "end",
]);

function balanced(text: string): boolean {
  let depth = 0;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === "\\") {
      i += 1;
      continue;
    }
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth < 0) return false;
    }
  }
  return depth === 0;
}

/** True when the text can end here without breaking a command or leaving a group or an operator open. */
function endsCleanly(whole: string, cut: number): boolean {
  const head = whole.slice(0, cut);
  if (head.trimEnd() === "" || !balanced(head)) return false;
  if (/(^|[^\\])\\$/.test(head)) return false;
  const command = /\\([A-Za-z]+)$/.exec(head);
  if (command) {
    // The cut is inside the name when a letter follows, and an unfinished command when it takes an argument
    if (/[A-Za-z]/.test(whole[cut] ?? "")) return false;
    if (NEEDS_ARGUMENT.has(command[1]!)) return false;
  }
  return !/[_^]\s*$/.test(head);
}

/**
 * Cuts the source of a formula to about max characters and ends it with three dots.
 * The cut never falls inside a command or a group, so no half command such as \text{IU is shown.
 */
export function shortenMath(latex: string, max = 36): string {
  const whole = latex.replace(/\s+/g, " ").trim();
  if (whole.length <= max) return whole;
  for (let cut = max; cut > 0; cut -= 1) {
    if (endsCleanly(whole, cut)) return whole.slice(0, cut).trimEnd() + ELLIPSIS;
  }
  return whole.slice(0, max).trimEnd() + ELLIPSIS;
}

/** Cuts plain text to max characters, counting a character outside the basic plane as one. */
export function shortenText(text: string, max = 36): string {
  const whole = text.replace(/\s+/g, " ").trim();
  const chars = Array.from(whole);
  if (chars.length <= max) return whole;
  return chars.slice(0, max).join("").trimEnd() + ELLIPSIS;
}
