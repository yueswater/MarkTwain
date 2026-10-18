import { getMarkRange, type Editor } from "@tiptap/core";
import { findTable } from "@tiptap/pm/tables";
import type { TFunction } from "i18next";
import type { Placement } from "@marktwain/schema";
import { IpcChannel } from "../../../../../shared/enums/ipc-channel.enum";
import { api } from "../../../shared/api";
import { errorMessage } from "../../../shared/error-message";
import { findUnlabeledTargets } from "../references/unlabeled-targets";
import { anchorAtCursor } from "./editor-commands";
import type { DialogTargets } from "./use-dialog-targets";

/** What the toolbar, the slash menu and the shortcuts ask of the editor, each one opens a dialog or starts an import. */
export function createEditorActions(editor: Editor, targets: DialogTargets, t: TFunction) {
  const insertMath = (kind: "inline" | "block") => targets.setMath({ kind, latex: "", pos: null, anchor: anchorAtCursor(editor) });

  const insertImage = () => {
    targets.setImportError(null);
    api
      .invoke(IpcChannel.AssetImportImage)
      .then((imported) => {
        if (imported) targets.setFigure({ pos: null, src: imported.src, caption: "", width: null });
      })
      .catch((e: unknown) => targets.setImportError(errorMessage(t, e)));
  };

  const insertAtom = (type: "footnote" | "citation" | "crossRef") => {
    if (type === "footnote") targets.setAtom({ type, pos: null, text: "" });
    else if (type === "citation") targets.setAtom({ type, pos: null, keys: [], form: "paren" });
    else {
      targets.setUnlabeled(findUnlabeledTargets(editor.state.doc));
      targets.setAtom({ type, pos: null, label: "" });
    }
  };

  /**
   * The dialog of a link for the selection. A caret inside a link takes the whole link, a selected text is made the text of the link,
   * and without either the link is a new one that has no text yet.
   */
  const editLink = () => {
    const { state } = editor;
    const linkType = state.schema.marks.link;
    const range = linkType ? getMarkRange(state.selection.$from, linkType) : undefined;
    if (range && linkType && state.selection.empty) {
      const url = String(state.doc.nodeAt(range.from)?.marks.find((mark) => mark.type === linkType)?.attrs.href ?? "");
      targets.setLink({ from: range.from, to: range.to, text: state.doc.textBetween(range.from, range.to), url, editing: true });
      return;
    }
    const { from, to } = state.selection;
    const editing = linkType ? state.doc.rangeHasMark(from, to, linkType) : false;
    const url = editing ? String(editor.getAttributes("link").href ?? "") : "";
    targets.setLink({ from, to, text: state.doc.textBetween(from, to, " "), url, editing });
  };

  /** Opens the templates for the table that holds the selection, what it has is replaced when one is chosen */
  const changeTemplate = () => {
    const found = findTable(editor.state.selection.$from);
    if (found) targets.setReplacing(found.pos);
  };

  /** The caption of the table or the code block that holds the cursor. */
  const editCaption = () => {
    const kind = editor.isActive("table") ? "table" : "codeBlock";
    const attrs = editor.getAttributes(kind);
    targets.setCaption({
      kind,
      caption: String(attrs.caption ?? ""),
      notes: String(attrs.notes ?? ""),
      placement: (attrs.placement as Placement | null | undefined) ?? null,
    });
  };

  return { insertMath, insertImage, insertAtom, editLink, changeTemplate, editCaption, insertTable: () => targets.setTableDialog(true) };
}

export type EditorActions = ReturnType<typeof createEditorActions>;
