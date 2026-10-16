import { escapeCode } from "./escape";

/** Environments that start the display themselves and cannot sit inside equation. */
const DISPLAY_ENVS = ["align", "alignat", "flalign", "gather", "multline", "eqnarray", "displaymath"];

/** Whether the formula can be set as it is, braces and environments are balanced and no dollar sign ends the math early. */
export function isBalanced(latex: string): boolean {
  const source = latex.replace(/\\[\\{}$%&#_]/g, "");
  if (/\$/.test(source)) return false;
  let depth = 0;
  for (const ch of source) {
    if (ch === "{") depth += 1;
    else if (ch === "}") depth -= 1;
    if (depth < 0) return false;
  }
  if (depth !== 0) return false;
  const stack: string[] = [];
  for (const match of source.matchAll(/\\(begin|end)\{([^}]*)\}/g)) {
    if (match[1] === "begin") stack.push(match[2] ?? "");
    else if (stack.pop() !== match[2]) return false;
  }
  return stack.length === 0;
}

export type DisplayMath = { ok: true; env: "equation" | "display"; body: string } | { ok: false };

/** The formula of a display block, a body with row breaks and no environment of its own is set in aligned. */
export function displayMath(latex: string): DisplayMath {
  const source = latex.trim();
  if (source === "" || !isBalanced(source)) return { ok: false };
  const first = /^\\begin\{([^}]*)\}/.exec(source)?.[1]?.replace(/\*$/, "");
  if (first && DISPLAY_ENVS.includes(first)) return { ok: true, env: "display", body: source };
  if (/\\\\/.test(source) && !first) return { ok: true, env: "equation", body: `\\begin{aligned}\n${source}\n\\end{aligned}` };
  return { ok: true, env: "equation", body: source };
}

/** Source shown when a formula cannot be set, in monospace with the dollar signs so the author sees it is a formula. */
export function mathFallback(latex: string, display: boolean): string {
  const wrapped = display ? `$$ ${latex.trim()} $$` : `$${latex.trim()}$`;
  return `\\mtcode{${escapeCode(wrapped)}}`;
}
