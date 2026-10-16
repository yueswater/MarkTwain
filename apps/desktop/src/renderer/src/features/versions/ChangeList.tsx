import { useTranslation } from "react-i18next";
import type { CompareView, DocumentDiffView } from "../../../../shared/ipc";
import { charDiff } from "../../lib/char-diff";
import type { DocumentKind } from "../../../../shared/enums/document-kind.enum";
import { documentTitle } from "../project/sidebar/document-title";

/** The way a change is marked, as in the change history of a word processor: green for what was added, red for what was taken away. Square, with no line at the side. */
const MARK = {
  added: "bg-emerald-500/12",
  removed: "bg-red-500/12",
  modified: "bg-muted/40",
} as const;
const INSERTED = "bg-emerald-500/25 text-emerald-800 underline decoration-emerald-600/60 dark:text-emerald-300";
const DELETED = "bg-red-500/20 text-red-800 line-through decoration-red-600/70 dark:text-red-300";

/** A block that was changed, as one paragraph with the characters that went in green and those that went out in red. */
export function Modified({ before, after }: { before: string; after: string }) {
  const runs = charDiff(before, after);
  return (
    <p className={`whitespace-pre-wrap break-words p-2 text-sm ${MARK.modified}`} data-change="modified">
      {runs.map((run, index) => {
        if (run.type === "added") return <ins key={index} className={INSERTED} data-run="added">{run.text}</ins>;
        if (run.type === "removed") return <del key={index} className={DELETED} data-run="removed">{run.text}</del>;
        return <span key={index}>{run.text}</span>;
      })}
    </p>
  );
}

/** A block that was added or removed whole, with a mark in the margin. */
export function Whole({ type, text }: { type: "added" | "removed"; text: string }) {
  const { t } = useTranslation("versions");
  const added = type === "added";
  return (
    <p className={`flex gap-2 whitespace-pre-wrap break-words p-2 text-sm ${MARK[type]}`} data-change={type}>
      <span aria-hidden="true" className={added ? "select-none font-mono font-bold text-emerald-600" : "select-none font-mono font-bold text-red-600"}>
        {added ? "+" : "−"}
      </span>
      <span className={added ? undefined : DELETED}>{text || t("compare.empty")}</span>
    </p>
  );
}

function DocumentChanges({ document }: { document: DocumentDiffView }) {
  const { t } = useTranslation("versions");
  const { t: tp } = useTranslation();
  const title = documentTitle(tp, { kind: document.kind as DocumentKind, title: document.title, position: 1 });
  return (
    <section className="grid gap-2" data-document={document.docId}>
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        {title}
        {document.status !== "changed" && <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">{t(document.status === "added" ? "compare.documentAdded" : "compare.documentRemoved")}</span>}
      </h3>
      {document.fields.map((field) => (
        <p key={field.field} className="text-xs text-muted-foreground">
          {t("compare.fieldChanged", { field: t(`compare.field.${field.field}`), from: String(field.from ?? ""), to: String(field.to ?? "") })}
        </p>
      ))}
      {document.changes.map((change, index) => {
        if (change.type === "same") return <p key={index} className="text-xs text-muted-foreground">{t("compare.same", { count: change.count })}</p>;
        if (change.type === "modified") return <Modified key={index} before={change.before} after={change.after} />;
        return <Whole key={index} type={change.type} text={change.type === "added" ? change.after : change.before} />;
      })}
    </section>
  );
}

/** What differs between two versions: each document with its added, removed and changed blocks, and the files. */
export function ChangeList({ view }: { view: CompareView }) {
  const { t } = useTranslation("versions");
  if (view.documents.length === 0 && view.files.length === 0) return <p className="text-sm text-muted-foreground">{t("compare.none")}</p>;
  return (
    <div className="grid gap-5">
      <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs" aria-label={t("compare.legend")}>
        <span className="inline-flex items-center gap-1.5"><span className="size-2.5 bg-emerald-500" aria-hidden="true" />{t("compare.legendAdded")}</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-2.5 bg-red-500" aria-hidden="true" />{t("compare.legendRemoved")}</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-2.5 bg-amber-500" aria-hidden="true" />{t("compare.legendModified")}</span>
      </p>
      {view.documents.map((document) => (
        <DocumentChanges key={document.docId} document={document} />
      ))}
      {view.files.length > 0 && (
        <section className="grid gap-1">
          <h3 className="text-sm font-semibold">{t("compare.files")}</h3>
          <ul className="text-sm">
            {view.files.map((file) => (
              <li key={file.path} className="flex gap-2">
                <span className="truncate">{file.path}</span>
                <span className="text-muted-foreground">{t(`compare.file.${file.status}`)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
