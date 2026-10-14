import type { JSONContent } from "@tiptap/core";
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
import { RowHeightDialog } from "./RowHeightDialog";
import { currentRowHeight, setRowHeight } from "./table-commands";
import { MathDialog, type MathTarget } from "./MathDialog";
import { MarkdownPaste } from "./extensions/markdown-paste";
import { RefDecorations, REFS_CHANGED } from "./extensions/ref-decorations";
import { useLabelIndex } from "./use-label-index";
import { findUnlabeledTargets, newLabel, type UnlabeledTarget } from "./unlabeled-targets";
import { Toolbar } from "./Toolbar";

type Props = { documentId: string; scrollTo?: { block: number; nonce: number } | null };

/** Loads one document. The caller remounts with key when the document changes, so each document has its own editor and undo history. */
export function DocumentEditor({ documentId, scrollTo }: Props) {
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
  return <EditorSurface doc={doc} scrollTo={scrollTo ?? null} />;
}

const ATOM_TYPES = new Set(["footnote", "citation", "crossRef"]);

function EditorSurface({ doc, scrollTo }: { doc: DocumentData; scrollTo: { block: number; nonce: number } | null }) {
  const { t } = useTranslation("editor");
  const { t: tCommon } = useTranslation();
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [math, setMath] = useState<MathTarget | null>(null);
  const [atom, setAtom] = useState<AtomTarget | null>(null);
  const [caption, setCaption] = useState<CaptionTarget | null>(null);
  const [rowHeight, setRowHeightState] = useState<string | null>(null);
  const [figure, setFigure] = useState<FigureTarget | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [unlabeled, setUnlabeled] = useState<UnlabeledTarget[]>([]);

  const labels = useLabelIndex(status);
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

  const editor = useEditor(
    {
      extensions: [
        ...createSchemaExtensions({
          onMathClick: (kind, latex, pos) => setMath({ kind, latex, pos }),
        }),
        MarkdownPaste,
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
        onEditRowHeight={() => setRowHeightState(currentRowHeight(editor))}
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
      <div className="min-h-0 flex-1 overflow-y-auto">
        <EditorContent editor={editor} className="mx-auto max-w-3xl px-8 py-8" />
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
      {rowHeight !== null && (
        <RowHeightDialog
          initial={rowHeight}
          onSubmit={(height) => setRowHeight(editor, height)}
          onClose={() => setRowHeightState(null)}
          onRestoreFocus={() => editor.commands.focus()}
        />
      )}
      {figure && (
        <FigureDialog
          target={figure}
          onSubmit={({ caption: text, width }) => {
            const attrs = { src: figure.src, caption: text, width };
            if (figure.pos === null) editor.chain().focus().insertContent({ type: "figure", attrs }).run();
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
