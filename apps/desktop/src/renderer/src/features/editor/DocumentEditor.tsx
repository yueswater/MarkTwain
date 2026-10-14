import type { JSONContent } from "@tiptap/core";
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
import { EditorBubbleMenu } from "./EditorBubbleMenu";
import { TableInsertDialog } from "./TableInsertDialog";
import { MathDialog, type MathTarget } from "./MathDialog";
import { MarkdownPaste } from "./extensions/markdown-paste";
import { RefDecorations, REFS_CHANGED } from "./extensions/ref-decorations";
import { useLabelIndex } from "./use-label-index";
import { findUnlabeledTargets, newLabel, type UnlabeledTarget } from "./unlabeled-targets";
import { Toolbar } from "./Toolbar";

type Props = {
  documentId: string;
  scrollTo?: { block: number; nonce: number } | null;
  /** Called every time the text has been saved */
  onSaved?: () => void;
};

/** Loads one document. The caller remounts with key when the document changes, so each document has its own editor and undo history. */
export function DocumentEditor({ documentId, scrollTo, onSaved }: Props) {
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
  return <EditorSurface doc={doc} scrollTo={scrollTo ?? null} onSaved={onSaved} />;
}

const WIDTH = { narrow: "max-w-xl", normal: "max-w-3xl", wide: "max-w-5xl" } as const;

const ATOM_TYPES = new Set(["footnote", "citation", "crossRef"]);

function EditorSurface({
  doc,
  scrollTo,
  onSaved,
}: {
  doc: DocumentData;
  scrollTo: { block: number; nonce: number } | null;
  onSaved?: () => void;
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
  const [figure, setFigure] = useState<FigureTarget | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [unlabeled, setUnlabeled] = useState<UnlabeledTarget[]>([]);

  const labels = useLabelIndex(status);
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
  const flushRef = useRef(autosaver);
  flushRef.current = autosaver;
  useEffect(() => autosaver.setDelay(prefs.autosaveDelayMs), [autosaver, prefs.autosaveDelayMs]);

  const editor = useEditor(
    {
      extensions: [
        ...createSchemaExtensions({
          onMathClick: (kind, latex, pos) => setMath({ kind, latex, pos }),
        }),
        MarkdownPaste.configure({ enabled: () => prefsRef.current.pasteMarkdown }),
        Placeholder.configure({ placeholder: t("placeholder") }),
        RefDecorations.configure({
          getNumbers: () => labelsRef.current.numbers,
          kindName: (kind) => tRef.current(`crossRef.kind.${kind}`),
          brokenText: t("crossRef.broken"),
        }),
      ],
      content: parseMarkdown(doc.text) as JSONContent,
      onUpdate: ({ editor: e }) => autosaver.schedule(() => serializeMarkdown(e.getJSON())),
      editorProps: {
        attributes: { "aria-label": doc.title || doc.kind, spellcheck: "false" },
        // Open the edit dialog when a footnote, citation or cross-reference is clicked
        handleClickOn: (_view, _pos, node, nodePos, _event, direct) => {
          if (direct && node.type.name === "figure") {
            setFigure({
              pos: nodePos,
              src: String(node.attrs.src),
              caption: String(node.attrs.caption ?? ""),
              width: (node.attrs.width as string | null) ?? null,
            });
            return true;
          }
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
  }, [editor, labels]);

  // Save pending changes before switching documents, closing the project or closing the window
  useEffect(() => {
    const flush = () => void flushRef.current.flush();
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
      flush();
    };
  }, [autosaver]);

  if (!editor) return null;

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
            tr.setNodeMarkup(choice.pos, undefined, { ...target.attrs, label });
            return true;
          })
          .run();
      }
    }
    writeAtom("crossRef", { label }, pos);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Toolbar
        editor={editor}
        onInsertMath={(kind) => setMath({ kind, latex: "", pos: null })}
        onInsertAtom={openAtom}
        onInsertTable={() => setTableDialog(true)}
        onInsertImage={() => {
          setImportError(null);
          api
            .invoke(IpcChannel.AssetImportImage)
            .then((imported) => {
              if (imported) setFigure({ pos: null, src: imported.src, caption: "", width: null });
            })
            .catch((e: unknown) => setImportError(errorMessage(tCommon, e)));
        }}
        onEditCaption={() => {
          const attrs = editor.getAttributes(editor.isActive("table") ? "table" : "codeBlock");
          setCaption({
            kind: editor.isActive("table") ? "table" : "codeBlock",
            caption: String(attrs.caption ?? ""),
            notes: String(attrs.notes ?? ""),
          });
        }}
      />
      <EditorBubbleMenu editor={editor} onInsertMath={() => setMath({ kind: "inline", latex: "", pos: null })} />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <EditorContent
          editor={editor}
          data-line-numbers={prefs.lineNumbers}
          data-font={prefs.fontFamily}
          className={cn("mx-auto px-8 py-8", WIDTH[prefs.contentWidth])}
          style={
            {
              "--editor-font-size": `${prefs.fontSize}px`,
              "--editor-line-height": String(prefs.lineHeight),
              "--editor-code-size": `${prefs.codeFontSize}px`,
            } as React.CSSProperties
          }
        />
      </div>
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
      {figure && (
        <FigureDialog
          target={figure}
          onSubmit={({ caption: text, width }) => {
            const attrs = { src: figure.src, caption: text, width };
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
                    tr.setNodeMarkup(pos, undefined, { ...node.attrs, caption: text, width });
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
          onSubmit={({ caption: text, notes }) =>
            editor
              .chain()
              .focus()
              .updateAttributes(caption.kind, caption.kind === "table" ? { caption: text, notes } : { caption: text })
              .run()
          }
          onClose={() => setCaption(null)}
          onRestoreFocus={() => editor.commands.focus()}
        />
      )}
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
