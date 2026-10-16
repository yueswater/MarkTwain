import type { JSONContent } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import { parseMarkdown, serializeMarkdown, type Placement } from "@marktwain/schema";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { usePrefs } from "@/lib/prefs";
import { cn } from "@/lib/utils";
import { IpcChannel } from "../../../../shared/enums/ipc-channel.enum";
import type { DocumentData } from "../../../../shared/ipc";
import { api } from "../../shared/api";
import { errorMessage } from "../../shared/error-message";
import { useLatest } from "../../shared/use-latest";
import { Autosaver, type SaveStatus } from "../../shared/autosaver";
import { useBibliography } from "../bibliography/bibliography-context";
import { BlockHandle } from "./blocks/BlockHandle";
import { createEditorActions } from "./dialogs/editor-actions";
import { EditorDialogs } from "./dialogs/EditorDialogs";
import { useDialogTargets } from "./dialogs/use-dialog-targets";
import { EditorBubbleMenu } from "./EditorBubbleMenu";
import { buildEditorProps, buildExtensions, type EditorContext } from "./editor-config";
import { savedBlocks } from "./changes/change-marks";
import { CHANGES_CHANGED } from "./extensions/change-marks";
import { REFS_CHANGED } from "./extensions/ref-decorations";
import { STATEMENTS_CHANGED } from "./extensions/statement-decorations";
import { FindBar } from "./find/FindBar";
import { LineGutter } from "./lines/LineGutter";
import { useListLevels } from "./lists/use-list-levels";
import { ChapterFlipHint } from "./navigation/ChapterFlipHint";
import type { Edge } from "./navigation/edge-flip";
import { useChapterFlip, type Neighbors } from "./navigation/use-chapter-flip";
import { usePreviewFollow } from "./navigation/use-preview-follow";
import type { CitationInfo } from "./references/ref-display";
import { useLabelIndex } from "./references/use-label-index";
import type { SlashHandlers } from "./slash/slash-items";
import { insertLandscape } from "./blocks/statement-commands";
import { TableHandle } from "./tables/TableHandle";
import { useTableLayout } from "./tables/use-table-layout";
import { Toolbar } from "./Toolbar";

type Props = {
  documentId: string;
  scrollTo?: { block: number; nonce: number; term?: string } | null;
  /** Gives the parent a way to save what is being typed at once */
  registerFlush?: (flush: (() => Promise<void>) | null) => void;
  /** Called every time the text has been saved */
  onSaved?: () => void;
  /** Goes to a block of a document from a card over a reference, opening the document first */
  onOpenTarget?: (documentId: string, block: number) => void;
  /** The top level block that the caret moved to, the preview follows it */
  onCaretBlock?: (block: number) => void;
  /** The top level block at the top of the editor while it scrolls, and how far into the block the top is, 0 to 1 */
  onTopBlock?: (block: number, fraction: number) => void;
  /** The titles of the documents before and after this one, null when there is none, a push against an end of the page opens them */
  neighbors?: Neighbors;
  /** Opens the document after this one for the end, the one before for the start */
  onFlip?: (edge: Edge) => void;
  /** Which end of the document to show on arrival, set when it was opened by a push against the end of the other one */
  arrive?: { edge: Edge; nonce: number } | null;
  /** Called once the end was shown, so that opening the document again later does not repeat it */
  onArrived?: () => void;
  /** Changes when a version is saved or another one is opened, so the marks of what changed since the latest version are worked out again */
  versionKey?: string | null;
};

/** Loads one document. The caller remounts with key when the document changes, so each document has its own editor and undo history. */
export function DocumentEditor({ documentId, scrollTo, onSaved, registerFlush, onOpenTarget, onCaretBlock, onTopBlock, neighbors, onFlip, arrive, onArrived, versionKey }: Props) {
  const { t } = useTranslation();
  const [doc, setDoc] = useState<DocumentData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .invoke(IpcChannel.DocumentGet, { id: documentId })
      .then((data) => !cancelled && setDoc(data))
      .catch((e: unknown) => !cancelled && setError(errorMessage(t, e)));
    return () => {
      cancelled = true;
    };
    // Reload when the document id changes, a change of t does not matter
  }, [documentId]);

  if (error) {
    return (
      <p role="alert" className="p-8 text-sm text-destructive select-text">
        {error}
      </p>
    );
  }
  if (!doc) return null;
  return <EditorSurface doc={doc} scrollTo={scrollTo ?? null} onSaved={onSaved} registerFlush={registerFlush} onOpenTarget={onOpenTarget} onCaretBlock={onCaretBlock} onTopBlock={onTopBlock} neighbors={neighbors} onFlip={onFlip} arrive={arrive ?? null} onArrived={onArrived} versionKey={versionKey ?? null} />;
}

const WIDTH = { narrow: "max-w-xl", normal: "max-w-3xl", wide: "max-w-5xl" } as const;

type SurfaceProps = {
  doc: DocumentData;
  scrollTo: { block: number; nonce: number; term?: string } | null;
  onSaved?: () => void;
  registerFlush?: (flush: (() => Promise<void>) | null) => void;
  onOpenTarget?: (documentId: string, block: number) => void;
  onCaretBlock?: (block: number) => void;
  onTopBlock?: (block: number, fraction: number) => void;
  neighbors?: Neighbors;
  onFlip?: (edge: Edge) => void;
  arrive: { edge: Edge; nonce: number } | null;
  onArrived?: () => void;
  versionKey: string | null;
};

function EditorSurface({ doc, scrollTo, onSaved, registerFlush, onOpenTarget, onCaretBlock, onTopBlock, neighbors, onFlip, arrive, onArrived, versionKey }: SurfaceProps) {
  const { t } = useTranslation("editor");
  const { t: tCommon } = useTranslation();
  const { prefs } = usePrefs();
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [find, setFind] = useState<{ open: boolean; term: string }>({ open: false, term: "" });
  const targets = useDialogTargets();

  // What the editor reads while it runs is kept in refs, since the editor is made once for a document
  const labels = useLabelIndex(status);
  const tableLayout = useTableLayout();
  const listLevels = useListLevels();
  const { view: bibliography } = useBibliography();
  const citations = useMemo(
    () => Object.fromEntries(bibliography.items.map((item): [string, CitationInfo] => [item.key, { author: item.author, year: item.year }])),
    [bibliography.items],
  );
  const prefsRef = useLatest(prefs);
  const labelsRef = useLatest(labels);
  const tableLayoutRef = useLatest(tableLayout);
  const listLevelsRef = useLatest(listLevels);
  const citationsRef = useLatest(citations);
  const tRef = useLatest(t);
  const targetsRef = useLatest(targets);
  const caretRef = useLatest(onCaretBlock);
  const savedRef = useLatest(onSaved);
  // The blocks of the latest saved version of this document, which the editor compares itself with
  const [saved, setSaved] = useState<string[] | null>(null);
  const savedBlocksRef = useLatest(saved);
  const editorRef = useRef<ReturnType<typeof useEditor>>(null);
  // What the slash menu asks the view to do, the same functions the toolbar uses
  const slashRef = useRef<SlashHandlers>({ insertMath: () => undefined, insertAtom: () => undefined, insertImage: () => undefined, insertTable: () => undefined, insertLandscape: () => undefined });
  const scroller = useRef<HTMLDivElement>(null);
  const editorFrame = useRef<HTMLDivElement>(null);
  const gutterHolder = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status === "saved") savedRef.current?.();
  }, [status, savedRef]);

  const autosaver = useMemo(() => new Autosaver((text) => api.invoke(IpcChannel.DocumentSave, { id: doc.id, text }), setStatus), [doc.id]);
  const autosaverRef = useLatest(autosaver);
  useEffect(() => autosaver.setDelay(prefs.autosaveDelayMs), [autosaver, prefs.autosaveDelayMs]);
  useEffect(() => {
    registerFlush?.(() => autosaver.flush());
    return () => registerFlush?.(null);
  }, [autosaver, registerFlush]);

  const context: EditorContext = {
    documentId: doc.id,
    t: () => tRef.current,
    prefs: () => prefsRef.current,
    labels: () => labelsRef.current,
    tableLayout: () => tableLayoutRef.current,
    listLevels: () => listLevelsRef.current,
    citations: () => citationsRef.current,
    savedBlocks: () => savedBlocksRef.current,
    editor: () => editorRef.current,
    slash: () => slashRef.current,
    targets: () => targetsRef.current,
  };

  const editor = useEditor(
    {
      extensions: buildExtensions(context),
      content: parseMarkdown(doc.text) as JSONContent,
      onUpdate: ({ editor: e }) => autosaver.schedule(() => serializeMarkdown(e.getJSON())),
      // Where the caret is, only when a person moved it in the editor, the preview follows
      onSelectionUpdate: ({ editor: e }) => {
        if (!e.isFocused) return;
        caretRef.current?.(e.state.selection.$from.index(0));
      },
      editorProps: buildEditorProps(context, doc.title || doc.kind),
    },
    [doc.id],
  );
  editorRef.current = editor;

  const follow = usePreviewFollow({ editor, scroller, onTopBlock, scrollTo });
  const flip = useChapterFlip({ editor, scroller, neighbors, onFlip, arrive, onArrived });

  useEffect(() => {
    if (editor && !editor.isDestroyed) editor.view.dom.setAttribute("spellcheck", String(prefs.spellcheck));
  }, [editor, prefs.spellcheck]);

  // A hit of the project search brings its term along, the find bar shows it in this document
  useEffect(() => {
    if (scrollTo?.term) setFind({ open: true, term: scrollTo.term });
  }, [scrollTo]);

  // The latest saved version of the document is read when the document opens and again when a version is saved or another one is opened.
  // A document that the version does not have counts as empty there, and an empty one is not marked.
  useEffect(() => {
    let cancelled = false;
    api
      .invoke(IpcChannel.VersionHeadText, { documentId: doc.id })
      .then((text) => !cancelled && setSaved(text === null ? [] : savedBlocks(text)))
      .catch(() => !cancelled && setSaved(null));
    return () => {
      cancelled = true;
    };
  }, [doc.id, versionKey]);

  // Mark again what differs when the saved version or the setting changed
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    editor.view.dispatch(editor.state.tr.setMeta(CHANGES_CHANGED, true));
  }, [editor, saved, prefs.showChanges]);

  // Tell the editor to recompute the display text of cross-references when numbers change
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    editor.view.dispatch(editor.state.tr.setMeta(REFS_CHANGED, true));
  }, [editor, labels, citations]);

  // The numbers of the blocks follow the other documents, and the style and colors are a preference
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    editor.view.dispatch(editor.state.tr.setMeta(STATEMENTS_CHANGED, true));
  }, [editor, labels, prefs.statementStyle, prefs.statementColors, tableLayout, listLevels]);

  // Save pending changes before switching documents, closing the project or closing the window
  useEffect(() => {
    const flush = () => void autosaverRef.current.flush();
    // Ctrl or Cmd plus F finds in this document, with the selected text as the start
    const onFind = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === "f") {
        event.preventDefault();
        const { from, to, empty } = editorRef.current?.state.selection ?? { from: 0, to: 0, empty: true };
        const selected = !empty && to - from < 80 ? (editorRef.current?.state.doc.textBetween(from, to, " ") ?? "") : "";
        setFind((current) => ({ open: true, term: selected || current.term }));
      }
    };
    window.addEventListener("keydown", onFind);
    // Ctrl or Cmd plus S saves at once, normally saving happens after typing stops
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        flush();
      }
    };
    window.addEventListener("beforeunload", flush);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("beforeunload", flush);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keydown", onFind);
      flush();
    };
  }, [autosaver, autosaverRef]);

  if (!editor) return null;

  const actions = createEditorActions(editor, targets, tCommon);
  slashRef.current = {
    insertMath: actions.insertMath,
    insertAtom: actions.insertAtom,
    insertImage: actions.insertImage,
    insertTable: actions.insertTable,
    insertLandscape: () => insertLandscape(editor),
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Toolbar
        editor={editor}
        onInsertMath={actions.insertMath}
        onInsertAtom={actions.insertAtom}
        onInsertTable={actions.insertTable}
        onChangeTemplate={actions.changeTemplate}
        onInsertImage={actions.insertImage}
        onEditCaption={actions.editCaption}
      />
      <EditorBubbleMenu
        editor={editor}
        onInsertMath={() => actions.insertMath("inline")}
        onEditFigure={(pos, attrs) =>
          targets.setFigure({ pos, src: String(attrs.src), caption: String(attrs.caption ?? ""), width: (attrs.width as string | null) ?? null, placement: (attrs.placement as Placement | null) ?? null })
        }
        onCropFigure={(pos, src) => targets.setCrop({ pos, src })}
      />
      <div className="relative min-h-0 flex-1" ref={editorFrame}>
        <TableHandle editor={editor} frame={editorFrame} scroller={scroller} onChangeTemplate={actions.changeTemplate} />
        <BlockHandle editor={editor} frame={editorFrame} inset={prefs.lineNumbers ? 30 : 0} />
        {flip.hint && <ChapterFlipHint hint={flip.hint} />}
        {find.open && <FindBar key={find.term} editor={editor} initialTerm={find.term} onClose={() => setFind((c) => ({ ...c, open: false }))} />}
        <div
          ref={scroller}
          className="h-full overflow-y-auto"
          onScroll={follow.onScroll}
          onWheel={(event) => {
            follow.touch();
            flip.onWheel(event);
          }}
          onKeyDown={follow.touch}
          onPointerDown={follow.touch}
        >
          <div className="relative" ref={gutterHolder}>
            {prefs.lineNumbers && <LineGutter editor={editor} container={gutterHolder} layoutKey={`${prefs.fontSize}:${prefs.lineHeight}:${prefs.contentWidth}:${prefs.fontFamily}:${prefs.codeFontSize}`} />}
            <EditorContent
              editor={editor}
              data-line-numbers={prefs.lineNumbers}
              data-font={prefs.fontFamily}
              className={cn("mx-auto py-8 pr-8", prefs.lineNumbers ? "pl-20" : "pl-8", WIDTH[prefs.contentWidth])}
              style={
                {
                  "--editor-font-size": `${prefs.fontSize}px`,
                  "--editor-line-height": String(prefs.lineHeight),
                  "--editor-code-size": `${prefs.codeFontSize}px`,
                } as React.CSSProperties
              }
            />
          </div>
        </div>
      </div>
      {targets.importError && (
        <p role="alert" className="border-t bg-destructive/5 px-4 py-1 text-xs text-destructive select-text">
          {targets.importError}
        </p>
      )}
      <p role="status" className="shrink-0 border-t px-4 py-1 text-xs text-muted-foreground" data-status={status}>
        {status === "idle" ? "" : t(`save.${status}`)}
      </p>
      <EditorDialogs editor={editor} targets={targets} documentId={doc.id} labels={labels} onOpenTarget={onOpenTarget} />
    </div>
  );
}
