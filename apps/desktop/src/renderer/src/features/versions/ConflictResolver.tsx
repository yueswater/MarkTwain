import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ChoiceInput, ConflictView } from "../../../../shared/ipc";
import type { DocumentKind } from "../../../../shared/enums/document-kind.enum";
import { documentTitle } from "../project/sidebar/document-title";
import { isResolved, startingText } from "./merge-choices";

type Props = {
  conflicts: ConflictView[];
  choices: Record<string, ChoiceInput>;
  onChoose: (id: string, choice: ChoiceInput) => void;
};

function Side({ label, blocks, tone }: { label: string; blocks: string[]; tone?: "ours" | "theirs" }) {
  const { t } = useTranslation("versions");
  return (
    <div className="min-w-0 rounded-md border p-2" data-side={tone ?? "base"}>
      <p className="mb-1 text-xs font-medium text-muted-foreground">{label}</p>
      {blocks.length === 0 ? <p className="text-sm text-muted-foreground">{t("conflict.empty")}</p> : blocks.map((block, index) => <p key={index} className="whitespace-pre-wrap break-words text-sm [&:not(:first-child)]:mt-2">{block}</p>)}
    </div>
  );
}

/** One radio button of a conflict. */
function Option({ id, name, value, checked, label, onSelect }: { id: string; name: string; value: string; checked: boolean; label: string; onSelect: () => void }) {
  return (
    <label className="flex items-center gap-2 text-sm" htmlFor={id}>
      <input id={id} type="radio" name={name} value={value} checked={checked} onChange={onSelect} />
      {label}
    </label>
  );
}

/** The conflicts of a merge, each with what both sides have and the ways to settle it. */
export function ConflictResolver({ conflicts, choices, onChoose }: Props) {
  const { t } = useTranslation("versions");
  const { t: tp } = useTranslation();
  const titleOf = (conflict: { kind: string; title: string }) => documentTitle(tp, { kind: conflict.kind as DocumentKind, title: conflict.title, position: 1 });

  return (
    <ol className="grid gap-4" aria-label={t("merge.title", { name: "" })}>
      {conflicts.map((conflict) => {
        const choice = choices[conflict.id];
        const name = `conflict-${conflict.id}`;
        const radio = (value: string, label: string, selected: boolean, pick: ChoiceInput) => <Option key={value} id={`${name}-${value}`} name={name} value={value} checked={selected} label={label} onSelect={() => onChoose(conflict.id, pick)} />;
        const settled = isResolved(conflict, choice);
        return (
          <li key={conflict.id} data-conflict={conflict.id} data-resolved={settled} className="grid gap-3 rounded-lg border p-3">
            {conflict.type === "blocks" && (
              <>
                <p className="text-sm font-medium">{t("conflict.blocks", { title: titleOf(conflict) })}</p>
                <div className="grid gap-2 sm:grid-cols-3">
                  <Side label={t("conflict.base")} blocks={conflict.base} />
                  <Side label={t("conflict.ours")} blocks={conflict.ours} tone="ours" />
                  <Side label={t("conflict.theirs")} blocks={conflict.theirs} tone="theirs" />
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-2">
                  {radio("ours", t("conflict.useOurs"), choice === "ours", "ours")}
                  {radio("theirs", t("conflict.useTheirs"), choice === "theirs", "theirs")}
                  {radio("both", t("conflict.both"), choice === "both", "both")}
                  {radio("own", t("conflict.own"), typeof choice === "object", { text: startingText(conflict) })}
                </div>
                {typeof choice === "object" && (
                  <div className="grid gap-1.5">
                    <Label htmlFor={`${name}-text`}>{t("conflict.ownLabel")}</Label>
                    <Textarea id={`${name}-text`} rows={4} value={choice.text} onChange={(event) => onChoose(conflict.id, { text: event.target.value })} />
                  </div>
                )}
              </>
            )}
            {conflict.type === "field" && (
              <>
                <p className="text-sm font-medium">{t("conflict.field", { title: titleOf(conflict), field: t(`compare.field.${conflict.field}`) })}</p>
                <div className="flex flex-wrap gap-x-5 gap-y-2">
                  {radio("ours", `${t("conflict.ours")}: ${String(conflict.ours)}`, choice === "ours", "ours")}
                  {radio("theirs", `${t("conflict.theirs")}: ${String(conflict.theirs)}`, choice === "theirs", "theirs")}
                </div>
              </>
            )}
            {conflict.type === "file" && (
              <>
                <p className="text-sm font-medium">{t("conflict.file", { path: conflict.path })}</p>
                <div className="flex flex-wrap gap-x-5 gap-y-2">
                  {radio("ours", `${t("conflict.ours")}${conflict.ours ? "" : ` ${t("conflict.deleted")}`}`, choice === "ours", "ours")}
                  {radio("theirs", `${t("conflict.theirs")}${conflict.theirs ? "" : ` ${t("conflict.deleted")}`}`, choice === "theirs", "theirs")}
                </div>
              </>
            )}
            {conflict.type === "document" && (
              <>
                <p className="text-sm font-medium">{t("conflict.document", { title: titleOf(conflict) })}</p>
                <p className="text-xs text-muted-foreground">{t(conflict.deletedBy === "ours" ? "conflict.deletedOurs" : "conflict.deletedTheirs")}</p>
                <div className="flex flex-wrap gap-x-5 gap-y-2">
                  {radio("keep", t("conflict.keep"), choice === "keep", "keep")}
                  {radio("delete", t("conflict.delete"), choice === "delete", "delete")}
                </div>
              </>
            )}
          </li>
        );
      })}
    </ol>
  );
}
