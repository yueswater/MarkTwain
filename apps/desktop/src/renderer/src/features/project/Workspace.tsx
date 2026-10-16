import { useCallback, useEffect, useRef, useState, type MutableRefObject } from "react";
import { useTranslation } from "react-i18next";
import type { BuildState } from "../build/use-build";
import { PreviewPanel } from "../build/PreviewPanel";
import type { ProjectState } from "./use-project";
import { BibliographyPage } from "../bibliography/BibliographyPage";
import { BibliographyProvider, useBibliography } from "../bibliography/bibliography-context";
import { DocumentEditor } from "../editor/DocumentEditor";
import { FontsPage } from "../fonts/FontsPage";
import { DocumentSidebar } from "./sidebar/DocumentSidebar";
import { SearchDialog } from "./SearchDialog";
import { documentTitle } from "./sidebar/document-title";
import type { Edge } from "../editor/navigation/edge-flip";

type Props = {
  state: ProjectState;
  /** Opens the settings window */
  onOpenSettings: () => void;
  /** Grows whenever a document or the thesis settings were saved, the preview watches it */
  saveTick: number;
  onSaved: () => void;
  /** Where the editor puts the function that saves what is typed, the versions use it before they read the documents */
  flushRef: MutableRefObject<(() => Promise<void>) | null>;
  /** Grows when the documents were replaced, the editor is made again */
  generation: number;
  /** The latest version of the branch that is open, the editor marks what changed since it */
  versionKey: string | null;
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

function WorkspaceBody({ state, build, previewOpen, onClosePreview, onOpenSettings, saveTick, onSaved, flushRef, generation, versionKey }: Props) {
  const { t } = useTranslation("project");
  const project = state.project;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showBibliography, setShowBibliography] = useState(false);
  const [showFonts, setShowFonts] = useState(false);
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
  // The document that a push against the end of the page opened shows the end that touches the other one
  const [arrive, setArrive] = useState<{ edge: Edge; nonce: number } | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  // The preview follows the caret of the editor, and a click in the preview takes the caret to a block. A jump from the preview must not send the preview back.
  const [follow, setFollow] = useState<{ documentId: string; block: number; nonce: number; mode: "caret" | "scroll"; fraction: number } | null>(null);
  const quietUntil = useRef(0);
  const flush = flushRef;
  const registerFlush = useCallback((fn: (() => Promise<void>) | null) => {
    flush.current = fn;
  }, [flush]);

  const documents = project?.documents ?? [];
  const selected = documents.find((d) => d.id === selectedId) ?? null;

  // When the selected document is deleted or a project was just opened, select the first chapter, or else the first document.
  useEffect(() => {
    if (selected) return;
    const fallback = documents.find((d) => d.kind === "chapter") ?? documents[0];
    setSelectedId(fallback?.id ?? null);
  }, [selected, documents]);

  if (!project) return null;

  const at = selected ? documents.indexOf(selected) : -1;
  const before = at > 0 ? documents[at - 1] : undefined;
  const after = at >= 0 ? documents[at + 1] : undefined;
  const flipTo = async (edge: Edge) => {
    const next = edge === "end" ? after : before;
    if (!next) return;
    await flush.current?.();
    setTarget(null);
    setArrive({ edge: edge === "end" ? "start" : "end", nonce: Date.now() });
    setSelectedId(next.id);
  };

  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      <DocumentSidebar
        documents={documents}
        selectedId={selected?.id ?? null}
        onSelect={(id) => {
          setSelectedId(id);
          setShowBibliography(false);
          setShowFonts(false);
        }}
        fontsActive={showFonts}
        onOpenFonts={() => {
          setShowFonts(true);
          setShowBibliography(false);
        }}
        bibliographyActive={showBibliography}
        bibliographyCount={bibliography.items.length}
        onOpenBibliography={() => {
          setShowBibliography(true);
          setShowFonts(false);
        }}
        onOpenSettings={onOpenSettings}
        onOpenSearch={() => setSearchOpen(true)}
        onReorder={(id, targetId, placement) => void state.reorderDocument(id, targetId, placement)}
        collapsed={collapsed}
        onToggleCollapsed={toggleCollapsed}
        onAdd={(kind) =>
          void state.addDocument(kind).then(async (id) => {
            if (!id) return;
            // What was typed goes to the document it was typed in, then the new one opens
            await flush.current?.();
            setTarget(null);
            setSelectedId(id);
            setShowBibliography(false);
            setShowFonts(false);
          })
        }
        onRename={(id, title) => void state.renameDocument(id, title)}
        onMove={(id, delta) => void state.moveDocument(id, delta)}
        onDelete={(id) => void state.removeDocument(id)}
      />
      <section className="min-h-0 min-w-0 flex-1 overflow-hidden">
        {showFonts ? (
          <FontsPage />
        ) : showBibliography ? (
          <BibliographyPage
            documents={documents}
            onOpenDocument={(id) => {
              setSelectedId(id);
              setShowBibliography(false);
            }}
          />
        ) : selected ? (
          <DocumentEditor
            key={`${selected.id}:${generation}`}
            documentId={selected.id}
            scrollTo={target}
            arrive={arrive}
            versionKey={versionKey}
            onArrived={() => setArrive(null)}
            neighbors={{ previous: before ? documentTitle(t, before) : null, next: after ? documentTitle(t, after) : null }}
            onFlip={(edge) => void flipTo(edge)}
            onSaved={onSaved}
            registerFlush={registerFlush}
            onCaretBlock={(block) => {
              if (previewOpen && Date.now() > quietUntil.current) setFollow({ documentId: selected.id, block, nonce: Date.now(), mode: "caret", fraction: 0 });
            }}
            onTopBlock={(block, fraction) => {
              if (previewOpen && Date.now() > quietUntil.current) setFollow({ documentId: selected.id, block, nonce: Date.now(), mode: "scroll", fraction });
            }}
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
          engine={project.engine}
          onClose={onClosePreview}
          follow={follow}
          onPick={(documentId, block) => {
            quietUntil.current = Date.now() + 1500;
            setShowBibliography(false);
            setSelectedId(documentId);
            setTarget({ block, nonce: Date.now() });
          }}
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
