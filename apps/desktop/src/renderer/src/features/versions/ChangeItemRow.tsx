import { fileLabel } from "./file-label";
import { useTranslation } from "react-i18next";
import type { DocumentKind } from "../../../../shared/enums/document-kind.enum";
import type { ChangeItemView } from "../../../../shared/ipc";
import { documentTitle } from "../project/sidebar/document-title";
import { Modified, Whole } from "./ChangeList";

type Props = {
  item: ChangeItemView;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

/** One change that a version can take or leave, with a box to choose it and the change drawn in green and red. */
export function ChangeItemRow({ item, checked, onChange }: Props) {
  const { t } = useTranslation("versions");
  const { t: tp } = useTranslation();
  const name = item.type === "file" ? fileLabel(item.path, t("compare.configFile")) : documentTitle(tp, { kind: item.kind as DocumentKind, title: item.title, position: 1 });
  return (
    <li data-change-item={item.id} data-checked={checked} className="grid gap-1.5 border p-2">
      <label className="flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} aria-label={`${name}: ${t(`stage.kind.${item.type}`)}`} />
        <span className="truncate">{name}</span>
        <span className="text-xs font-normal text-muted-foreground">{item.type === "file" ? t(`compare.file.${item.status}`) : item.type === "document" ? t(item.status === "added" ? "compare.documentAdded" : "compare.documentRemoved") : t(`stage.kind.${item.type}`)}</span>
      </label>
      {item.type === "fields" &&
        item.fields.map((field) => (
          <p key={field.field} className="text-xs text-muted-foreground">
            {t("compare.fieldChanged", { field: t(`compare.field.${field.field}`), from: String(field.from), to: String(field.to) })}
          </p>
        ))}
      {item.type === "document" && item.blocks.map((block, index) => <Whole key={index} type={item.status === "added" ? "added" : "removed"} text={block} />)}
      {item.type === "hunk" &&
        item.changes.map((change, index) =>
          change.type === "modified" ? <Modified key={index} before={change.before} after={change.after} /> : <Whole key={index} type={change.type} text={change.type === "added" ? change.after : change.before} />,
        )}
    </li>
  );
}
