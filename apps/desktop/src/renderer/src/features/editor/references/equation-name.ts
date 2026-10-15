export type NameProblem = "chars" | "taken";

const NAME = /^[A-Za-z0-9]+$/;

/** The label that a name gives to a formula. */
export function labelOfName(name: string): string {
  return `eq:${name}`;
}

/** The name inside a stored label such as eq:payoff1, empty for no label. */
export function nameOfLabel(label: string | null | undefined): string {
  return label && label.startsWith("eq:") ? label.slice(3) : "";
}

/**
 * Checks a name typed for a formula. A name keeps to letters and digits, and cannot be one that
 * another target already has. An existing name with other characters stays valid until it is changed.
 */
export function checkName(name: string, taken: ReadonlySet<string>, current: string | null): NameProblem | null {
  const label = labelOfName(name);
  if (current !== null && label === current) return null;
  if (!NAME.test(name)) return "chars";
  if (taken.has(label)) return "taken";
  return null;
}

/** True when a label is referred to by a document of the project or by a reference in the open document. */
export function isLabelUsed(label: string, used: readonly string[], inDocument: readonly string[]): boolean {
  return used.includes(label) || inDocument.includes(label);
}
