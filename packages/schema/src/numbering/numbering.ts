import type { CountedTarget, NumberingOptions, NumberingResult, Target } from "./types";

function isHeading(target: Target): target is Extract<Target, { text: string }> {
  return target.kind === "cha" || target.kind === "sec";
}

/**
 * 依文件順序算出每個目標的顯示編號，並找出失效的引用與重複的標籤。
 * 編號只用於編輯器預覽；匯出時引用文字由模板產生（規格 4.4 節）。
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
        if (options.numberPerChapter) {
          for (const kind of Object.keys(counters) as CountedTarget["kind"][]) counters[kind] = 0;
        }
      }
      continue;
    }

    if (target.kind === "eq" && options.equationNumbering === "none") continue;

    counters[target.kind] += 1;
    const n = counters[target.kind];
    numbers.set(target.label, options.numberPerChapter ? `${chapter}.${n}` : String(n));
  }

  const broken: string[] = [];
  for (const reference of references) {
    if (!defined.has(reference) && !broken.includes(reference)) broken.push(reference);
  }

  return { numbers, broken, duplicates };
}
