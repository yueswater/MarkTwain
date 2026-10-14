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
import { MathDialog, type MathTarget } from "./MathDialog";
import { RefDecorations, REFS_CHANGED } from "./extensions/ref-decorations";
import { useLabelIndex } from "./use-label-index";
import { findUnlabeledTargets, newLabel, type UnlabeledTarget } from "./unlabeled-targets";
import { Toolbar } from "./Toolbar";

type Props = { documentId: string };

/** 載入一份文件；換文件時由呼叫端以 `key` 重新掛載，讓每份文件有獨立的編輯器與復原紀錄。 */
export function DocumentEditor({ documentId }: Props) {
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
    // 文件 id 改變就重新載入；t 的變動不需要
  }, [documentId]);

  if (error) {
    return (
      <p role="alert" className="p-8 text-sm text-destructive select-text">
        {error}
      </p>
    );
  }
  if (!doc) return null;
  return <EditorSurface doc={doc} />;
}

const ATOM_TYPES = new Set(["footnote", "citation", "crossRef"]);

function EditorSurface({ doc }: { doc: DocumentData }) {
  const { t } = useTranslation("editor");
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [math, setMath] = useState<MathTarget | null>(null);
  const [atom, setAtom] = useState<AtomTarget | null>(null);
  const [caption, setCaption] = useState<CaptionTarget | null>(null);
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
        // 點到腳註、引用、交叉引用時開啟編輯對話框
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

  // 編號改變時，通知編輯器重算交叉引用的顯示文字
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    editor.view.dispatch(editor.state.tr.setMeta(REFS_CHANGED, true));
  }, [editor, labels]);

  // 切換文件、關閉專案或關閉視窗前，把未存的變更存下來
  useEffect(() => {
    const flush = () => void flushRef.current.flush();
    window.addEventListener("beforeunload", flush);
    return () => {
      window.removeEventListener("beforeunload", flush);
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

  /** 新增（pos 為 null）或更新既有的原子節點。 */
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
      // 替還沒有標籤的目標加上標籤；位置不會因此改變，接著再寫入引用
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
