import { GENERATED_ID_LENGTH, LABEL_PATTERN, type LabelKind } from "./constants";

export function isValidLabel(label: string): boolean {
  return LABEL_PATTERN.test(label);
}

/** Prefix of the label, null when it is not a valid label. */
export function labelKind(label: string): LabelKind | null {
  return isValidLabel(label) ? (label.slice(0, label.indexOf(":")) as LabelKind) : null;
}

/** Labels that appear more than once, each listed once in order of the first repeat. */
export function findDuplicateLabels(labels: string[]): string[] {
  const seen = new Set<string>();
  const duplicates: string[] = [];
  for (const label of labels) {
    if (seen.has(label) && !duplicates.includes(label)) duplicates.push(label);
    seen.add(label);
  }
  return duplicates;
}

/** Creates a short label that does not collide with existing ones, for example fig:a3f9. */
export function createLabel(
  kind: LabelKind,
  existing: ReadonlySet<string>,
  random: () => number = Math.random,
): string {
  const space = 16 ** GENERATED_ID_LENGTH;
  for (let attempt = 0; attempt <= space; attempt += 1) {
    const id = Math.floor(random() * space)
      .toString(16)
      .padStart(GENERATED_ID_LENGTH, "0");
    const label = `${kind}:${id}`;
    if (!existing.has(label)) return label;
  }
  throw new Error(`no free ${kind} label left`);
}
