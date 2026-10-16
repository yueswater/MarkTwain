import type { ChoiceInput, ConflictView } from "../../../../shared/ipc";

/** What a person can choose for a conflict, by its kind. */
export function choicesFor(conflict: ConflictView): ChoiceInput[] {
  if (conflict.type === "blocks") return ["ours", "theirs", "both", { text: "" }];
  if (conflict.type === "document") return ["keep", "delete"];
  return ["ours", "theirs"];
}

/** Whether a choice settles the conflict. A text of one's own that is empty does not, since an empty text would silently drop both sides. */
export function isResolved(conflict: ConflictView, choice: ChoiceInput | undefined): boolean {
  if (choice === undefined) return false;
  if (typeof choice === "object") return conflict.type === "blocks" && choice.text.trim() !== "";
  return (choicesFor(conflict) as ChoiceInput[]).includes(choice);
}

/** How many conflicts have a choice that settles them. */
export function countResolved(conflicts: readonly ConflictView[], choices: Record<string, ChoiceInput>): number {
  return conflicts.filter((conflict) => isResolved(conflict, choices[conflict.id])).length;
}

/** The text that a person starts from when they write their own: the two sides one after the other. */
export function startingText(conflict: Extract<ConflictView, { type: "blocks" }>): string {
  return [...conflict.ours, ...conflict.theirs].join("\n\n");
}
