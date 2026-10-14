import type { CountedTarget, NumberingOptions, NumberingResult, Target } from "./types";

function isHeading(target: Target): target is Extract<Target, { text: string }> {
  return target.kind === "cha" || target.kind === "sec";
}

/**
 * Computes the display number of every target in document order and finds broken references and duplicate labels.
 * Numbers are only for the editor preview, on export the reference text comes from the template, see section 4.4 of the spec.
 */
export function resolveNumbers(
  targets: Target[],
  references: string[],
  options: NumberingOptions,
): NumberingResult {
  const numbers = new Map<string, string>();
  const defined = new Set<string>();
  const duplicates: string[] = [];

  let chapter = 0;
  const counters: Record<CountedTarget["kind"], number> = { fig: 0, tbl: 0, eq: 0, lst: 0 };

  for (const target of targets) {
    if (defined.has(target.label)) {
      if (!duplicates.includes(target.label)) duplicates.push(target.label);
      continue;
    }
    defined.add(target.label);

    if (isHeading(target)) {
      numbers.set(target.label, target.text);
      if (target.kind === "cha") {
        chapter += 1;
        // Only equations restart in each chapter, figures, tables and listings are numbered through the whole thesis
        if (options.numberPerChapter) counters.eq = 0;
      }
      continue;
    }

    if (target.kind === "eq" && options.equationNumbering === "none") continue;

    counters[target.kind] += 1;
    const n = counters[target.kind];
    numbers.set(target.label, target.kind === "eq" && options.numberPerChapter ? `${chapter}.${n}` : String(n));
  }

  const broken: string[] = [];
  for (const reference of references) {
    if (!defined.has(reference) && !broken.includes(reference)) broken.push(reference);
  }

  return { numbers, broken, duplicates };
}
