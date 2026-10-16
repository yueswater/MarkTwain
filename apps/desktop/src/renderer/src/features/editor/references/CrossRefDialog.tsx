import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IpcChannel } from "../../../../../shared/enums/ipc-channel.enum";
import type { LabelTarget, UnlabeledRemote } from "../../../../../shared/ipc/index";
import { api } from "../../../shared/api";
import type { DocumentKind } from "../../../../../shared/enums/document-kind.enum";
import { documentTitle } from "../../project/sidebar/document-title";
import { AtomDialogFrame, type Common } from "./AtomDialogFrame";
import type { AtomTarget, CrossRefChoice } from "./atom-target";
import { REF_KINDS, buildRefOptions, kindsWithTargets, readLastKind, refKindOfLabel, rememberKind, type RefKind } from "./crossref-options";
import type { UnlabeledTarget } from "./unlabeled-targets";

export function CrossRefDialog({
  target,
  documentId,
  labeled,
  unlabeled,
  onSubmit,
  ...common
}: Common & {
  target: Extract<AtomTarget, { type: "crossRef" }>;
  /** The document that is open, its own blocks come from the editor */
  documentId: string;
  labeled: LabelTarget[];
  unlabeled: UnlabeledTarget[];
  onSubmit: (choice: CrossRefChoice) => void;
}) {
  const { t } = useTranslation("editor");
  const { t: tp } = useTranslation();
  const editing = target.pos !== null;
  const [value, setValue] = useState(target.label ? `l:${target.label}` : "");

  // The blocks of the other documents that have no label, which the index does not list
  const [remote, setRemote] = useState<UnlabeledRemote[]>([]);
  useEffect(() => {
    let cancelled = false;
    api
      .invoke(IpcChannel.LabelUnlabeled, { exceptDocumentId: documentId })
      .then((list) => !cancelled && setRemote(list))
      .catch(() => undefined); // The list is a help, the labeled targets still work
    return () => {
      cancelled = true;
    };
  }, [documentId]);

  const options = useMemo(
    () => buildRefOptions(labeled, unlabeled, (kind) => t(`crossRef.kind.${kind}`), remote, (document) => documentTitle(tp, { kind: document.kind as DocumentKind, position: document.position, title: document.title })),
    [labeled, unlabeled, remote, t, tp],
  );
  const available = kindsWithTargets(options);
  // The kind comes from the label when editing, otherwise from the last choice if it still has targets
  const [kind, setKind] = useState<RefKind | "">(() => {
    if (target.label) return refKindOfLabel(target.label) ?? "";
    const last = readLastKind();
    return last && available.has(last) ? last : "";
  });
  const shown = options.filter((option) => option.kind === kind);
  // When editing, the target may be gone and missing from the list, keep the old value so the user can see it
  const known = options.some((option) => option.value === value);

  function pickKind(next: string): void {
    setKind(next as RefKind);
    rememberKind(next as RefKind);
    // A target of another kind no longer applies
    if (!options.some((option) => option.value === value && option.kind === next)) setValue("");
  }

  function submit(): void {
    if (value.startsWith("l:")) onSubmit({ kind: "existing", label: value.slice(2) });
    else if (value.startsWith("r:")) {
      const [, id, block, labelKind] = value.split(":");
      onSubmit({ kind: "remote", documentId: id as string, block: Number(block), labelKind: labelKind as UnlabeledTarget["kind"] });
    } else {
      const [, pos, labelKind] = value.split(":");
      onSubmit({ kind: "new", pos: Number(pos), labelKind: labelKind as UnlabeledTarget["kind"] });
    }
  }

  return (
    <AtomDialogFrame
      title={t(editing ? "crossRef.editTitle" : "crossRef.insertTitle")}
      description={options.length === 0 ? undefined : t("crossRef.chooseHint")}
      editing={editing}
      canSubmit={value !== ""}
      onSubmit={submit}
      {...common}
    >
      {options.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("crossRef.none")}</p>
      ) : (
        <div className="grid grid-cols-[9rem_minmax(0,1fr)] gap-3">
          <div className="grid gap-2">
            <Label>{t("crossRef.type")}</Label>
            <Select value={kind} onValueChange={pickKind}>
              <SelectTrigger aria-label={t("crossRef.type")}>
                <SelectValue placeholder={t("crossRef.typePlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {REF_KINDS.map((item) => (
                  <SelectItem key={item} value={item} disabled={!available.has(item)}>
                    {t(`crossRef.types.${item}`)}
                    {available.has(item) ? "" : ` · ${t("crossRef.noneOfKind")}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid min-w-0 gap-2">
            <Label>{t("crossRef.target")}</Label>
            <Select value={value} onValueChange={setValue} disabled={kind === ""}>
              <SelectTrigger aria-label={t("crossRef.target")} className="w-full min-w-0 [&>span]:truncate">
                <SelectValue placeholder={t(kind === "" ? "crossRef.chooseTypeFirst" : "crossRef.placeholder")} />
              </SelectTrigger>
              <SelectContent>
                {!known && value !== "" && (
                  <SelectItem value={value}>
                    {t("crossRef.broken")} {value.slice(2)}
                  </SelectItem>
                )}
                {shown.map((option) => (
                  <SelectItem key={option.value} value={option.value} title={option.full}>
                    {option.text}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </AtomDialogFrame>
  );
}
