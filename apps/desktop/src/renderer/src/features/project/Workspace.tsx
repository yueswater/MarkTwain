import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { BuildState } from "../build/use-build";
import { PreviewPanel } from "../build/PreviewPanel";
import type { ProjectState } from "./use-project";
import { BibliographyPage } from "../bibliography/BibliographyPage";
import { BibliographyProvider, useBibliography } from "../bibliography/bibliography-context";
import { DocumentEditor } from "../editor/DocumentEditor";
import { DocumentSidebar } from "./DocumentSidebar";
import { SearchDialog } from "./SearchDialog";

type Props = {
  state: ProjectState;
  /** Opens the settings window */
  onOpenSettings: () => void;
  /** Grows whenever a document or the thesis settings were saved, the preview watches it */
  saveTick: number;
  onSaved: () => void;
  build: BuildState;
  previewOpen: boolean;
  onClosePreview: () => void;
};

export function Workspace(props: Props) {
  return (
    <BibliographyProvider saveTick={props.saveTick}>
      <WorkspaceBody {...props} />
    </BibliographyProvider>
  );
}

function WorkspaceBody({ state, build, previewOpen, onClosePreview, onOpenSettings, saveTick, onSaved }: Props) {
  const { t } = useTranslation("project");
  const project = state.project;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showBibliography, setShowBibliography] = useState(false);
  const { view: bibliography } = useBibliography();
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

  // Ctrl or Cmd plus a backslash folds the sidebar, and plus Shift and F searches the whole project
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "f") {
        event.preventDefault();
        setSearchOpen(true);
        return;
      }
      // The sidebar takes Ctrl or Cmd with a backslash, Ctrl or Cmd with B is bold in the editor
      if ((event.ctrlKey || event.metaKey) && event.key === "\\") {
        event.preventDefault();
        toggleCollapsed();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const [target, setTarget] = useState<{ block: number; nonce: number; term?: string } | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const flush = useRef<(() => Promise<void>) | null>(null);
  const registerFlush = useCallback((fn: (() => Promise<void>) | null) => {
    flush.current = fn;
  }, []);

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
    <div className="flex h-full min-h-0 overflow-hidden">
      <DocumentSidebar
        documents={documents}
        selectedId={selected?.id ?? null}
        onSelect={(id) => {
          setSelectedId(id);
          setShowBibliography(false);
        }}
        bibliographyActive={showBibliography}
        bibliographyCount={bibliography.items.length}
        onOpenBibliography={() => setShowBibliography(true)}
        onOpenSettings={onOpenSettings}
        onOpenSearch={() => setSearchOpen(true)}
        onReorder={(id, targetId, placement) => void state.reorderDocument(id, targetId, placement)}
        collapsed={collapsed}
        onToggleCollapsed={toggleCollapsed}
        onAdd={(kind) => void state.addDocument(kind)}
        onRename={(id, title) => void state.renameDocument(id, title)}
        onMove={(id, delta) => void state.moveDocument(id, delta)}
        onDelete={(id) => void state.removeDocument(id)}
      />
      <section className="min-h-0 min-w-0 flex-1 overflow-hidden">
        {showBibliography ? (
          <BibliographyPage
            documents={documents}
            onOpenDocument={(id) => {
              setSelectedId(id);
              setShowBibliography(false);
            }}
          />
        ) : selected ? (
          <DocumentEditor
            key={selected.id}
            documentId={selected.id}
            scrollTo={target}
            onSaved={onSaved}
            registerFlush={registerFlush}
            onOpenTarget={(documentId, block) => {
              setSelectedId(documentId);
              setTarget({ block, nonce: Date.now() });
            }}
          />
        ) : (
          <p className="p-8 text-sm text-muted-foreground">{t("workspace.empty")}</p>
        )}
      </section>
      <SearchDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        documents={documents}
        beforeSearch={async () => {
          await flush.current?.();
        }}
        onOpenHit={(hit, term) => {
          setShowBibliography(false);
          setSelectedId(hit.documentId);
          setTarget({ block: hit.block, nonce: Date.now(), term });
        }}
      />
      {previewOpen && (
        <PreviewPanel
          build={build}
          saveTick={saveTick}
          placeKey={project.path}
          onClose={onClosePreview}
          onJump={(documentId, block) => {
            setShowBibliography(false);
            setSelectedId(documentId);
            setTarget({ block, nonce: Date.now() });
          }}
        />
      )}
    </div>
  );
}
