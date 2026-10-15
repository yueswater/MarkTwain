import { STATEMENT_PREFIXES } from "@marktwain/schema";
import type { LabelTarget, UnlabeledRemote } from "../../../../shared/ipc";
import { shortenMath, shortenText } from "@/lib/shorten";
import type { UnlabeledTarget } from "./unlabeled-targets";

/** The kinds the dialog offers on the left, a heading is a chapter or a section. */
export const REF_KINDS = ["heading", "figure", "table", "formula", "code", "statement"] as const;
export type RefKind = (typeof REF_KINDS)[number];

const BY_LABEL_KIND: Record<string, RefKind> = {
  cha: "heading",
  sec: "heading",
  fig: "figure",
  tbl: "table",
  eq: "formula",
  lst: "code",
  ...Object.fromEntries(STATEMENT_PREFIXES.map((prefix) => [prefix, "statement"] as const)),
};

export function refKindOf(labelKind: string): RefKind | null {
  return BY_LABEL_KIND[labelKind] ?? null;
}

/** The kind of a stored label such as fig:one, null when it is not a label. */
export function refKindOfLabel(label: string): RefKind | null {
  return refKindOf(label.slice(0, label.indexOf(":")));
}

export type RefOption = {
  value: string;
  kind: RefKind;
  /** Text shown in the list, long formulas are cut with three dots */
  text: string;
  /** The whole text for a tooltip */
  full: string;
  labeled: boolean;
};

/** Options for the target list, in document order within each kind, with the name of the kind in front. */
export function buildRefOptions(
  labeled: readonly LabelTarget[],
  unlabeled: readonly UnlabeledTarget[],
  kindName: (labelKind: string) => string,
  remote: readonly UnlabeledRemote[] = [],
): RefOption[] {
  const out: RefOption[] = [];
  for (const item of labeled) {
    const kind = refKindOf(item.kind);
    if (!kind) continue;
    const text = `${kindName(item.kind)} ${item.display}`;
    out.push({ value: `l:${item.label}`, kind, text, full: text, labeled: true });
  }
  for (const item of unlabeled) {
    const kind = refKindOf(item.kind);
    if (!kind) continue;
    const body = item.text || "…";
    const short = kind === "formula" ? shortenMath(body) : shortenText(body);
    out.push({
      value: `u:${item.pos}:${item.kind}`,
      kind,
      text: `${kindName(item.kind)} · ${short}`,
      full: `${kindName(item.kind)} · ${body}`,
      labeled: false,
    });
  }
  // The blocks of the other documents that have no label, the document is named so that two of the same text can be told apart
  for (const item of remote) {
    const kind = refKindOf(item.kind);
    if (!kind) continue;
    const body = item.text || "…";
    const short = kind === "formula" ? shortenMath(body) : shortenText(body);
    out.push({
      value: `r:${item.documentId}:${item.block}:${item.kind}`,
      kind,
      text: `${kindName(item.kind)} · ${short} (${item.document.title})`,
      full: `${kindName(item.kind)} · ${body} (${item.document.title})`,
      labeled: false,
    });
  }
  return out;
}

/** Kinds that have at least one target. */
export function kindsWithTargets(options: readonly RefOption[]): Set<RefKind> {
  return new Set(options.map((option) => option.kind));
}

const KIND_KEY = "marktwain.crossref.kind";

export function readLastKind(): RefKind | null {
  try {
    const value = localStorage.getItem(KIND_KEY);
    return (REF_KINDS as readonly string[]).includes(value ?? "") ? (value as RefKind) : null;
  } catch {
    return null;
  }
}

export function rememberKind(kind: RefKind): void {
  try {
    localStorage.setItem(KIND_KEY, kind);
  } catch {
    // The choice is only a convenience
  }
}
