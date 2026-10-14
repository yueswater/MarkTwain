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

function EditorSurface({ doc }: { doc: DocumentData }) {
  const { t } = useTranslation("editor");
  const [status, setStatus] = useState<SaveStatus>("idle");

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
        ...createSchemaExtensions(),
        Placeholder.configure({ placeholder: t("placeholder") }),
      ],
      content: parseMarkdown(doc.text) as JSONContent,
      onUpdate: ({ editor: e }) => autosaver.schedule(() => serializeMarkdown(e.getJSON())),
      editorProps: { attributes: { "aria-label": doc.title || doc.kind, spellcheck: "false" } },
    },
    [doc.id],
  );

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

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Toolbar editor={editor} />
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
    </div>
  );
}
