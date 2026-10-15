import type { Editor, JSONContent } from "@tiptap/core";
import { findTable } from "@tiptap/pm/tables";
import { usePrefs } from "@/lib/prefs";
import { cn } from "@/lib/utils";
import { EditorContent, useEditor } from "@tiptap/react";
import Placeholder from "@tiptap/extension-placeholder";
import { parseMarkdown, serializeMarkdown } from "@marktwain/schema";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { IpcChannel } from "../../../../shared/enums/ipc-channel.enum";
import type { DocumentData } from "../../../../shared/ipc";
import { api } from "../../shared/api";
import { errorMessage } from "../../shared/error-message";
import { Autosaver, type SaveStatus } from "./autosaver";
import { createSchemaExtensions } from "./extensions/schema-extensions";
import {
  CitationDialog,
  CrossRefDialog,
  FootnoteDialog,
  type AtomTarget,
  type CrossRefChoice,
} from "./AtomDialogs";
import { CaptionDialog, type CaptionTarget } from "./CaptionDialog";
import { FigureDialog, type FigureTarget } from "./FigureDialog";
import { CropDialog } from "./CropDialog";
import { FindBar } from "./FindBar";
import { EditorBubbleMenu } from "./EditorBubbleMenu";
import { TableInsertDialog } from "./TableInsertDialog";
import { MathDialog, type MathTarget } from "./MathDialog";
import { MarkdownPaste } from "./extensions/markdown-paste";
import { RefDecorations, REFS_CHANGED } from "./extensions/ref-decorations";
import { useLabelIndex } from "./use-label-index";
import { useBibliography } from "../bibliography/bibliography-context";
import type { CitationInfo } from "./ref-display";
import { findUnlabeledTargets, newLabel, type UnlabeledTarget } from "./unlabeled-targets";
import { Toolbar } from "./Toolbar";
import { CodeBlockWithLanguage } from "./extensions/nodes/code-block-view";
import { LineGutter } from "./LineGutter";
import { EquationLabelBubble } from "./EquationLabelBubble";
import { ReferenceCard } from "./ReferenceCard";
import { SlashCommand } from "./slash/slash-command";
import type { SlashHandlers } from "./slash/slash-items";
import { EquationShortcut } from "./extensions/equation-shortcut";
import type { Placement } from "@marktwain/schema";
import { TableBorders } from "./extensions/table-borders";
import { TableCaptions } from "./extensions/table-captions";
import { TableLayout } from "./extensions/table-layout";
import { useTableLayout } from "./use-table-layout";
import { PlacementMarks } from "./extensions/placement-marks";
import { StatementDecorations, STATEMENTS_CHANGED } from "./extensions/statement-decorations";
import { StatementDialog, type StatementTarget } from "./StatementDialog";
import { statementOf } from "./statement-heads";
import { unwrapStatement, updateStatement } from "./statement-commands";

type Props = {
  documentId: string;
  scrollTo?: { block: number; nonce: number; term?: string } | null;
  /** Gives the parent a way to save what is being typed at once */
  registerFlush?: (flush: (() => Promise<void>) | null) => void;
  /** Called every time the text has been saved */
  onSaved?: () => void;
  /** Goes to a block of a document from a card over a reference, opening the document first */
  onOpenTarget?: (documentId: string, block: number) => void;
};

/** Loads one document. The caller remounts with key when the document changes, so each document has its own editor and undo history. */
export function DocumentEditor({ documentId, scrollTo, onSaved, registerFlush, onOpenTarget }: Props) {
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
  return <EditorSurface doc={doc} scrollTo={scrollTo ?? null} onSaved={onSaved} registerFlush={registerFlush} onOpenTarget={onOpenTarget} />;
}

const WIDTH = { narrow: "max-w-xl", normal: "max-w-3xl", wide: "max-w-5xl" } as const;

/** Where the cursor is, in window coordinates, for a box that opens at it. */
function anchorAtCursor(editor: Editor | null): MathTarget["anchor"] {
  if (!editor || editor.isDestroyed) return undefined;
  const coords = editor.view.coordsAtPos(editor.state.selection.from);
  return { top: coords.top, bottom: coords.bottom, left: coords.left, right: coords.right };
}

/** Where an existing formula is drawn. */
function anchorOfNode(editor: Editor | null, pos: number): MathTarget["anchor"] {
  if (!editor || editor.isDestroyed) return undefined;
  const dom = editor.view.nodeDOM(pos);
  if (!(dom instanceof HTMLElement)) return undefined;
  const box = dom.getBoundingClientRect();
  return { top: box.top, bottom: box.bottom, left: box.left, right: box.right };
}

const ATOM_TYPES = new Set(["footnote", "citation", "crossRef"]);

function EditorSurface({
  doc,
  scrollTo,
  onSaved,
  registerFlush,
  onOpenTarget,
}: {
  doc: DocumentData;
  scrollTo: { block: number; nonce: number; term?: string } | null;
  onSaved?: () => void;
  registerFlush?: (flush: (() => Promise<void>) | null) => void;
  onOpenTarget?: (documentId: string, block: number) => void;
}) {
  const { t } = useTranslation("editor");
  const { t: tCommon } = useTranslation();
  const [status, setStatus] = useState<SaveStatus>("idle");
  const { prefs } = usePrefs();
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;
  const [math, setMath] = useState<MathTarget | null>(null);
  const [atom, setAtom] = useState<AtomTarget | null>(null);
  const [caption, setCaption] = useState<CaptionTarget | null>(null);
  const [tableDialog, setTableDialog] = useState(false);
  const [find, setFind] = useState<{ open: boolean; term: string }>({ open: false, term: "" });
  const [crop, setCrop] = useState<{ pos: number; src: string } | null>(null);
  const [figure, setFigure] = useState<FigureTarget | null>(null);
  const gutterHolder = useRef<HTMLDivElement>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [unlabeled, setUnlabeled] = useState<UnlabeledTarget[]>([]);
  const [statement, setStatement] = useState<StatementTarget | null>(null);

  const labels = useLabelIndex(status);
  const tableLayout = useTableLayout();
  const tableLayoutRef = useRef(tableLayout);
  tableLayoutRef.current = tableLayout;
  const { view: bibliography } = useBibliography();
  const citations = useMemo(
    () => Object.fromEntries(bibliography.items.map((item): [string, CitationInfo] => [item.key, { author: item.author, year: item.year }])),
    [bibliography.items],
  );
  const citationsRef = useRef(citations);
  citationsRef.current = citations;
  const savedRef = useRef(onSaved);
  savedRef.current = onSaved;
  useEffect(() => {
    if (status === "saved") savedRef.current?.();
  }, [status]);
  const labelsRef = useRef(labels);
  labelsRef.current = labels;
  const tRef = useRef(t);
  tRef.current = t;

  const autosaver = useMemo(
    () =>
      new Autosaver(
        (text) => api.invoke(IpcChannel.DocumentSave, { id: doc.id, text }),
        setStatus,
      ),
    [doc.id],
  );
  const editorRef = useRef<Editor | null>(null);
  // What the slash menu asks the view to do, the same functions the toolbar uses
  const slashRef = useRef<SlashHandlers>({ insertMath: () => undefined, insertAtom: () => undefined, insertImage: () => undefined, insertTable: () => undefined });
  const flushRef = useRef(autosaver);
  flushRef.current = autosaver;
  useEffect(() => autosaver.setDelay(prefs.autosaveDelayMs), [autosaver, prefs.autosaveDelayMs]);
  useEffect(() => {
    registerFlush?.(() => autosaver.flush());
    return () => registerFlush?.(null);
  }, [autosaver, registerFlush]);

  const editor = useEditor(
    {
      extensions: [
        ...createSchemaExtensions({
          codeBlock: CodeBlockWithLanguage,
          onMathClick: (kind, latex, pos) => setMath({ kind, latex, pos, anchor: anchorOfNode(editorRef.current, pos) }),
          figureLabel: (percent) => tRef.current("figure.dragWidth", { value: percent }),
          resizeLabels: {
            width: (percent) => tRef.current("table.dragWidth", { value: percent }),
            height: (points) => tRef.current("table.dragHeight", { value: points }),
          },
        }),
        EquationShortcut,
        SlashCommand.configure({
          handlers: () => slashRef.current,
          nameOf: (item) => tRef.current(`slash.items.${item.id}.name`),
        }),
        MarkdownPaste.configure({ enabled: () => prefsRef.current.pasteMarkdown }),
        Placeholder.configure({ placeholder: t("placeholder") }),
        PlacementMarks,
        TableBorders,
        TableLayout,
        TableCaptions.configure({
          getBase: () => labelsRef.current.bases[doc.id]?.tbl ?? 0,
          getPosition: () => tableLayoutRef.current.position,
          getPrefix: () => tableLayoutRef.current.prefix,
          getNotesLabel: () => tRef.current("table.notesLabel"),
        }),
        StatementDecorations.configure({
          getBase: () => labelsRef.current.bases[doc.id] ?? {},
          nameOf: (kind) => tRef.current(`statement.kinds.${kind.id}`),
          getStyle: () => prefsRef.current.statementStyle,
          colorOf: (kind) => prefsRef.current.statementColors[kind.id] ?? kind.accent,
          onEdit: (pos) => {
            const node = editorRef.current?.state.doc.nodeAt(pos);
            const kind = node ? statementOf(node) : null;
            if (node && kind) setStatement({ pos, kind: kind.id, title: String((node.attrs.props as { title?: string })?.title ?? "") });
          },
        }),
        RefDecorations.configure({
          getNumbers: () => labelsRef.current.numbers,
          kindName: (kind) => tRef.current(`crossRef.kind.${kind}`),
          brokenText: t("crossRef.broken"),
          getCitations: () => citationsRef.current,
        }),
      ],
      content: parseMarkdown(doc.text) as JSONContent,
      onUpdate: ({ editor: e }) => autosaver.schedule(() => serializeMarkdown(e.getJSON())),
      editorProps: {
        attributes: { "aria-label": doc.title || doc.kind, spellcheck: "false" },
        // A double click on a figure edits its caption, a single click only selects it
        handleDoubleClickOn: (_view, _pos, node, nodePos) => {
          if (node.type.name !== "figure") return false;
          setFigure({ pos: nodePos, src: String(node.attrs.src), caption: String(node.attrs.caption ?? ""), width: (node.attrs.width as string | null) ?? null, placement: (node.attrs.placement as Placement | null) ?? null });
          return true;
        },
        // Open the edit dialog when a footnote, citation or cross-reference is clicked
        handleClickOn: (_view, _pos, node, nodePos, _event, direct) => {
          if (!direct || !ATOM_TYPES.has(node.type.name)) return false;
          if (node.type.name === "footnote") {
            setAtom({ type: "footnote", pos: nodePos, text: String(node.attrs.text) });
          } else if (node.type.name === "citation") {
            setAtom({
              type: "citation",
              pos: nodePos,
              keys: node.attrs.keys as string[],
              form: String(node.attrs.form),
            });
          } else {
            setUnlabeled(findUnlabeledTargets(_view.state.doc));
            setAtom({ type: "crossRef", pos: nodePos, label: String(node.attrs.label) });
          }
          return true;
        },
      },
    },
    [doc.id],
  );

  useEffect(() => {
    if (editor && !editor.isDestroyed) editor.view.dom.setAttribute("spellcheck", String(prefs.spellcheck));
  }, [editor, prefs.spellcheck]);

  // A hit of the project search brings its term along, the find bar shows it in this document
  useEffect(() => {
    if (scrollTo?.term) setFind({ open: true, term: scrollTo.term });
  }, [scrollTo]);

  // Move the cursor to the top level block named by a build error
  useEffect(() => {
    if (!editor || editor.isDestroyed || !scrollTo) return;
    let pos = 0;
    editor.state.doc.forEach((_node, offset, index) => {
      if (index === scrollTo.block) pos = offset;
    });
    const node = editor.state.doc.nodeAt(pos);
    const chain = editor.chain().focus();
    // Atom blocks such as figures have no text, so select the whole node
    (node?.isAtom ? chain.setNodeSelection(pos) : chain.setTextSelection(Math.min(pos + 1, editor.state.doc.content.size))).scrollIntoView().run();
  }, [editor, scrollTo]);

  // Tell the editor to recompute the display text of cross-references when numbers change
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    editor.view.dispatch(editor.state.tr.setMeta(REFS_CHANGED, true));
  }, [editor, labels, citations]);

  // The numbers of the blocks follow the other documents, and the style and colors are a preference
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    editor.view.dispatch(editor.state.tr.setMeta(STATEMENTS_CHANGED, true));
  }, [editor, labels, prefs.statementStyle, prefs.statementColors, tableLayout]);

  // Save pending changes before switching documents, closing the project or closing the window
  useEffect(() => {
    const flush = () => void flushRef.current.flush();
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
  }, [autosaver]);

  editorRef.current = editor;
  if (!editor) return null;

  const insertImage = () => {
          setImportError(null);
          api
            .invoke(IpcChannel.AssetImportImage)
            .then((imported) => {
              if (imported) setFigure({ pos: null, src: imported.src, caption: "", width: null });
            })
            .catch((e: unknown) => setImportError(errorMessage(tCommon, e)));
  };

  const openAtom = (type: "footnote" | "citation" | "crossRef") => {
    if (type === "footnote") setAtom({ type, pos: null, text: "" });
    else if (type === "citation") setAtom({ type, pos: null, keys: [], form: "paren" });
    else {
      setUnlabeled(findUnlabeledTargets(editor.state.doc));
      setAtom({ type, pos: null, label: "" });
    }
  };

  /** Adds a new atom node, or updates an existing one when pos is set. */
  const writeAtom = (name: string, attrs: Record<string, unknown>, pos: number | null) => {
    const chain = editor.chain().focus();
    if (pos === null) chain.insertContent({ type: name, attrs }).run();
    else {
      chain
        .command(({ tr }) => {
          tr.setNodeMarkup(pos, undefined, attrs);
          return true;
        })
        .run();
    }
  };

  const removeAtom = (pos: number | null) => {
    if (pos === null) return;
    const node = editor.state.doc.nodeAt(pos);
    if (node) editor.chain().focus().deleteRange({ from: pos, to: pos + node.nodeSize }).run();
  };

  const submitCrossRef = (choice: CrossRefChoice, pos: number | null) => {
    let label: string;
    if (choice.kind === "existing") label = choice.label;
    else {
      // Add a label to a target that has none, positions do not change, then write the reference
      label = newLabel(
        choice.labelKind,
        editor.state.doc,
        labelsRef.current.targets.map((target) => target.label),
      );
      const target = editor.state.doc.nodeAt(choice.pos);
      if (target) {
        editor
          .chain()
          .command(({ tr }) => {
            // A block of a mathematical thesis keeps its label in id
            tr.setNodeMarkup(choice.pos, undefined, { ...target.attrs, [target.type.name === "div" ? "id" : "label"]: label });
            return true;
          })
          .run();
      }
    }
    writeAtom("crossRef", { label }, pos);
  };

  slashRef.current = {
    insertMath: (kind) => setMath({ kind, latex: "", pos: null, anchor: anchorAtCursor(editor) }),
    insertAtom: openAtom,
    insertImage,
    insertTable: () => setTableDialog(true),
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Toolbar
        editor={editor}
        onInsertMath={(kind) => setMath({ kind, latex: "", pos: null, anchor: anchorAtCursor(editor) })}
        onInsertAtom={openAtom}
        onInsertTable={() => setTableDialog(true)}
        onInsertImage={insertImage}
        onEditCaption={() => {
          const attrs = editor.getAttributes(editor.isActive("table") ? "table" : "codeBlock");
          setCaption({
            kind: editor.isActive("table") ? "table" : "codeBlock",
            caption: String(attrs.caption ?? ""),
            notes: String(attrs.notes ?? ""),
            placement: (attrs.placement as Placement | null | undefined) ?? null,
          });
        }}
      />
      <EditorBubbleMenu
        editor={editor}
        onInsertMath={() => setMath({ kind: "inline", latex: "", pos: null, anchor: anchorAtCursor(editor) })}
        onEditFigure={(pos, attrs) =>
          setFigure({ pos, src: String(attrs.src), caption: String(attrs.caption ?? ""), width: (attrs.width as string | null) ?? null, placement: (attrs.placement as Placement | null) ?? null })
        }
        onCropFigure={(pos, src) => setCrop({ pos, src })}
      />
      <div className="relative min-h-0 flex-1">
      {find.open && <FindBar key={find.term} editor={editor} initialTerm={find.term} onClose={() => setFind((c) => ({ ...c, open: false }))} />}
      <div className="h-full overflow-y-auto">
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
      {statement && (
        <StatementDialog
          target={statement}
          onSubmit={(change) => updateStatement(editor, statement.pos, change)}
          onUnwrap={() => unwrapStatement(editor, statement.pos)}
          onClose={() => setStatement(null)}
          onRestoreFocus={() => editor.commands.focus()}
        />
      )}
      {importError && (
        <p role="alert" className="border-t bg-destructive/5 px-4 py-1 text-xs text-destructive select-text">
          {importError}
        </p>
      )}
      <p
        role="status"
        className="shrink-0 border-t px-4 py-1 text-xs text-muted-foreground"
        data-status={status}
      >
        {status === "idle" ? "" : t(`save.${status}`)}
      </p>
      {math && (
        <MathDialog
          target={math}
          onSubmit={(latex) => {
            const chain = editor.chain().focus();
            if (math.pos === null) {
              (math.kind === "inline"
                ? chain.insertInlineMath({ latex })
                : chain.insertBlockMath({ latex })
              ).run();
            } else {
              (math.kind === "inline"
                ? chain.updateInlineMath({ latex, pos: math.pos })
                : chain.updateBlockMath({ latex, pos: math.pos })
              ).run();
            }
          }}
          onRemove={() => {
            if (math.pos === null) return;
            const chain = editor.chain().focus();
            (math.kind === "inline"
              ? chain.deleteInlineMath({ pos: math.pos })
              : chain.deleteBlockMath({ pos: math.pos })
            ).run();
          }}
          onClose={() => setMath(null)}
          onRestoreFocus={() => editor.commands.focus()}
        />
      )}
      {tableDialog && (
        <TableInsertDialog
          onSubmit={({ rows, columns, caption }) => {
            const chain = editor.chain().focus();
            // A table cannot hold another table, so a new one goes after the current one
            const table = findTable(editor.state.selection.$from);
            if (table) {
              const after = table.pos + table.node.nodeSize;
              chain.insertContentAt(after, { type: "paragraph" }).setTextSelection(after + 1);
            }
            chain.insertTable({ rows, cols: columns, withHeaderRow: true }).run();
            if (caption) editor.chain().updateAttributes("table", { caption }).run();
          }}
          onClose={() => setTableDialog(false)}
          onRestoreFocus={() => editor.commands.focus()}
        />
      )}
      {crop && (
        <CropDialog
          src={crop.src}
          onCrop={async (png) => {
            const { src } = await api.invoke(IpcChannel.AssetStoreImage, { data: png });
            const node = editor.state.doc.nodeAt(crop.pos);
            if (node) editor.view.dispatch(editor.state.tr.setNodeMarkup(crop.pos, undefined, { ...node.attrs, src }));
          }}
          onClose={() => setCrop(null)}
          onRestoreFocus={() => editor.commands.focus()}
        />
      )}
      {figure && (
        <FigureDialog
          target={figure}
          onSubmit={({ caption: text, width, placement }) => {
            const attrs = { src: figure.src, caption: text, width, placement };
            if (figure.pos === null) {
              // A figure cannot live inside a table cell, so it goes after the table
              const table = findTable(editor.state.selection.$from);
              const chain = editor.chain().focus();
              if (table) chain.insertContentAt(table.pos + table.node.nodeSize, { type: "figure", attrs });
              else chain.insertContent({ type: "figure", attrs });
              chain.run();
            }
            else {
              const pos = figure.pos;
              const node = editor.state.doc.nodeAt(pos);
              if (node) {
                editor
                  .chain()
                  .focus()
                  .command(({ tr }) => {
                    tr.setNodeMarkup(pos, undefined, { ...node.attrs, caption: text, width, placement });
                    return true;
                  })
                  .run();
              }
            }
          }}
          onRemove={() => removeAtom(figure.pos)}
          onClose={() => setFigure(null)}
          onRestoreFocus={() => editor.commands.focus()}
        />
      )}
      {caption && (
        <CaptionDialog
          target={caption}
          onSubmit={({ caption: text, notes, placement }) =>
            editor
              .chain()
              .focus()
              .updateAttributes(caption.kind, caption.kind === "table" ? { caption: text, notes, placement } : { caption: text })
              .run()
          }
          onClose={() => setCaption(null)}
          onRestoreFocus={() => editor.commands.focus()}
        />
      )}
      <EquationLabelBubble editor={editor} labels={labels} onOpenTarget={(documentId, block) => onOpenTarget?.(documentId, block)} />
      <ReferenceCard editor={editor} labels={labels} onOpenTarget={(documentId, block) => onOpenTarget?.(documentId, block)} />
      {atom?.type === "footnote" && (
        <FootnoteDialog
          target={atom}
          onSubmit={(text) => writeAtom("footnote", { text }, atom.pos)}
          onRemove={() => removeAtom(atom.pos)}
          onClose={() => setAtom(null)}
          onRestoreFocus={() => editor.commands.focus()}
        />
      )}
      {atom?.type === "citation" && (
        <CitationDialog
          target={atom}
          onSubmit={(keys, form) => writeAtom("citation", { keys, form }, atom.pos)}
          onRemove={() => removeAtom(atom.pos)}
          onClose={() => setAtom(null)}
          onRestoreFocus={() => editor.commands.focus()}
        />
      )}
      {atom?.type === "crossRef" && (
        <CrossRefDialog
          target={atom}
          labeled={labels.targets}
          unlabeled={unlabeled}
          onSubmit={(choice) => submitCrossRef(choice, atom.pos)}
          onRemove={() => removeAtom(atom.pos)}
          onClose={() => setAtom(null)}
          onRestoreFocus={() => editor.commands.focus()}
        />
      )}
    </div>
  );
}
