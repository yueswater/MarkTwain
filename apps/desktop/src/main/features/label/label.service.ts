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

/** 掃描整個專案的文件，算出可引用的標籤、顯示編號與失效的引用（規格 4.4 節）。 */
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

      // 每份章或附錄文件就是一章；沒有自己標章的，補一個合成的章，編號才會逐章重編
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
      if (!kind || display === undefined || documentId === undefined) continue; // 合成標籤不能被選
      if (pickable.some((p) => p.label === target.label)) continue;
      pickable.push({ label: target.label, kind, display, documentId });
    }

    return {
      // 合成標籤只為了讓編號正確，不對外
      numbers: Object.fromEntries([...result.numbers].filter(([label]) => labelKind(label) !== null)),
      broken: result.broken,
      duplicates: result.duplicates,
      targets: pickable,
    };
  }
}
