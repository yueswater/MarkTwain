import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { BuildState } from "../build/use-build";
import { PreviewPanel } from "../build/PreviewPanel";
import type { ProjectState } from "./use-project";
import { DocumentEditor } from "../editor/DocumentEditor";
import { ConfigForm } from "./ConfigForm";
import { DocumentSidebar } from "./DocumentSidebar";

type Props = {
  state: ProjectState;
  build: BuildState;
  previewOpen: boolean;
  onClosePreview: () => void;
};

export function Workspace({ state, build, previewOpen, onClosePreview }: Props) {
  const { t } = useTranslation("project");
  const project = state.project;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [settings, setSettings] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem("marktwain.sidebar.collapsed") === "1";
    } catch {
      return false;
    }
  });
  const toggleCollapsed = () =>
    setCollapsed((value) => {
      try {
        localStorage.setItem("marktwain.sidebar.collapsed", value ? "0" : "1");
      } catch {
        // The choice is only a convenience
      }
      return !value;
    });

  // Ctrl or Cmd plus B folds the sidebar, like in many editors
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "b") {
        event.preventDefault();
        toggleCollapsed();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const [target, setTarget] = useState<{ block: number; nonce: number } | null>(null);

  const documents = project?.documents ?? [];
  const selected = documents.find((d) => d.id === selectedId) ?? null;

  // When the selected document is deleted or a project was just opened, select the first chapter, or else the first document.
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
        onSelect={(id) => {
          setSettings(false);
          setSelectedId(id);
        }}
        settingsSelected={settings}
        onSelectSettings={() => setSettings(true)}
        collapsed={collapsed}
        onToggleCollapsed={toggleCollapsed}
        onAdd={(kind) => void state.addDocument(kind)}
        onRename={(id, title) => void state.renameDocument(id, title)}
        onMove={(id, delta) => void state.moveDocument(id, delta)}
        onDelete={(id) => void state.removeDocument(id)}
      />
      <section className="min-w-0 flex-1">
        {settings ? (
          <ConfigForm />
        ) : selected ? (
          <DocumentEditor key={selected.id} documentId={selected.id} scrollTo={target} />
        ) : (
          <p className="p-8 text-sm text-muted-foreground">{t("workspace.empty")}</p>
        )}
      </section>
      {previewOpen && (
        <PreviewPanel
          build={build}
          onClose={onClosePreview}
          onJump={(documentId, block) => {
            setSettings(false);
            setSelectedId(documentId);
            setTarget({ block, nonce: Date.now() });
          }}
        />
      )}
    </div>
  );
}
