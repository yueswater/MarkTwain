import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { ProjectState } from "./use-project";
import { DocumentSidebar } from "./DocumentSidebar";
import { documentTitle } from "./document-title";

type Props = { state: ProjectState };

export function Workspace({ state }: Props) {
  const { t } = useTranslation("project");
  const project = state.project;
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const documents = project?.documents ?? [];
  const selected = documents.find((d) => d.id === selectedId) ?? null;

  // 選取的文件被刪除（或剛開啟專案）時，改選第一份第一章，沒有就選第一份。
  useEffect(() => {
    if (selected) return;
    const fallback = documents.find((d) => d.kind === "chapter") ?? documents[0];
    setSelectedId(fallback?.id ?? null);
  }, [selected, documents]);

  if (!project) return null;

  return (
    <div className="flex h-full min-h-0">
      <DocumentSidebar
        documents={documents}
        selectedId={selected?.id ?? null}
        onSelect={setSelectedId}
        onAdd={(kind) => void state.addDocument(kind)}
        onRename={(id, title) => void state.renameDocument(id, title)}
        onMove={(id, delta) => void state.moveDocument(id, delta)}
        onDelete={(id) => void state.removeDocument(id)}
      />
      <section className="min-w-0 flex-1 overflow-y-auto p-8">
        {selected ? (
          <h2 className="text-2xl font-semibold tracking-tight">{documentTitle(t, selected)}</h2>
        ) : (
          <p className="text-sm text-muted-foreground">{t("workspace.empty")}</p>
        )}
      </section>
    </div>
  );
}
