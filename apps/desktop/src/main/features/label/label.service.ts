import {
  collectTargets,
  labelKind,
  parseMarkdown,
  resolveNumbers,
  type NumberingOptions,
  type Target,
} from "@marktwain/schema";
import { DocumentKind } from "../../../shared/enums/document-kind.enum";
import type { LabelIndex, LabelTarget } from "../../../shared/ipc";
import { DEFAULT_NUMBERING } from "../../config/numbering.config";
import type { DocumentService } from "../document/document.service";

const CHAPTER_LIKE: readonly string[] = [DocumentKind.Chapter, DocumentKind.Appendix];

/** Scans every document of the project and computes referable labels, display numbers and broken references. */
export class LabelService {
  constructor(
    private readonly documents: DocumentService,
    private readonly options: NumberingOptions = DEFAULT_NUMBERING,
  ) {}

  resolve(): LabelIndex {
    const targets: Target[] = [];
    const references: string[] = [];
    const owners = new Map<string, string>();

    for (const summary of this.documents.list()) {
      const { text } = this.documents.get(summary.id);
      const collected = collectTargets(parseMarkdown(text), summary.id);

      // Each chapter or appendix document is one chapter, add a synthetic chapter when it has none so numbering restarts per chapter
      if (CHAPTER_LIKE.includes(summary.kind) && !collected.targets.some((t) => t.kind === "cha")) {
        collected.targets.unshift({ kind: "cha", label: `cha:~${summary.id}`, text: "" });
      }
      for (const target of collected.targets) {
        if (!owners.has(target.label)) owners.set(target.label, summary.id);
      }
      targets.push(...collected.targets);
      references.push(...collected.references);
    }

    const result = resolveNumbers(targets, references, this.options);
    const pickable: LabelTarget[] = [];
    for (const target of targets) {
      const kind = labelKind(target.label);
      const display = result.numbers.get(target.label);
      const documentId = owners.get(target.label);
      if (!kind || display === undefined || documentId === undefined) continue; // Synthetic labels cannot be picked
      if (pickable.some((p) => p.label === target.label)) continue;
      pickable.push({ label: target.label, kind, display, documentId });
    }

    return {
      // Synthetic labels only keep numbers right and are not exposed
      numbers: Object.fromEntries([...result.numbers].filter(([label]) => labelKind(label) !== null)),
      broken: result.broken,
      duplicates: result.duplicates,
      targets: pickable,
      used: [...new Set(references)],
    };
  }
}
