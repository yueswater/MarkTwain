import type { Marker, TemplateEntry } from "./types";

export function isUpToDate(marker: unknown, entry: TemplateEntry): boolean {
  if (typeof marker !== "object" || marker === null) return false;
  const m = marker as Partial<Marker>;
  return m.tag === entry.tag && m.commit === entry.commit;
}

/** `gh repo clone` 的參數；`--` 之後的會原樣交給 git clone。 */
export function buildCloneArgs(entry: TemplateEntry, dir: string): string[] {
  return ["repo", "clone", entry.repo, dir, "--", "--depth", "1", "--branch", entry.tag];
}
