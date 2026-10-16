import type { Editor } from "@tiptap/core";
import { IpcChannel } from "../../../../../shared/enums/ipc-channel.enum";
import type { LabelIndex } from "../../../../../shared/ipc";
import { api } from "../../../shared/api";
import { StatementDialog } from "../blocks/StatementDialog";
import { unwrapStatement, updateStatement } from "../blocks/statement-commands";
import { CaptionDialog } from "../figures/CaptionDialog";
import { CropDialog } from "../figures/CropDialog";
import { FigureDialog } from "../figures/FigureDialog";
import { MathDialog } from "../math/MathDialog";
import type { CrossRefChoice } from "../references/atom-target";
import { CitationDialog } from "../references/CitationDialog";
import { CrossRefDialog } from "../references/CrossRefDialog";
import { FootnoteDialog } from "../references/FootnoteDialog";
import { EquationLabelBubble } from "../references/EquationLabelBubble";
import { ReferenceCard } from "../references/ReferenceCard";
import { LABELS_CHANGED } from "../references/use-label-index";
import { newLabel } from "../references/unlabeled-targets";
import { TableInsertDialog } from "../tables/TableInsertDialog";
import { insertGridTable, insertTemplateTable, removeMath, removeNode, replaceTable, setFigureSource, writeAtom, writeFigure, writeMath } from "./editor-commands";
import type { DialogTargets } from "./use-dialog-targets";

type Props = {
  editor: Editor;
  targets: DialogTargets;
  documentId: string;
  labels: LabelIndex;
  /** Goes to a block of a document from a card over a reference, opening the document first */
  onOpenTarget?: (documentId: string, block: number) => void;
};

/**
 * The dialogs that the toolbar, the slash menu, a click on a node and the shortcuts open, and the cards that open over a reference.
 * Each one is shown while its target is set, and the commands that they run are in editor-commands.
 */
export function EditorDialogs({ editor, targets, documentId, labels, onOpenTarget }: Props) {
  const { math, atom, caption, figure, statement, crop, tableDialog, replacing, unlabeled } = targets;
  // The focus goes back at once, the focus command of the editor waits for a frame, and what is typed in that frame was lost
  const restoreFocus = () => {
    editor.view.focus();
    editor.commands.focus();
  };

  /** Writes the reference, after the block that it points to has its label, which may be in another document. */
  const submitCrossRef = async (choice: CrossRefChoice, pos: number | null) => {
    let label: string;
    if (choice.kind === "existing") label = choice.label;
    else if (choice.kind === "remote") {
      // The other document gets its label first, and is saved, so that the reference has something to point to
      const made = await api.invoke(IpcChannel.LabelEnsure, { documentId: choice.documentId, block: choice.block, kind: choice.labelKind });
      if (!made) return;
      label = made.label;
      window.dispatchEvent(new Event(LABELS_CHANGED));
    } else {
      // Add a label to a target that has none, positions do not change, then write the reference
      label = newLabel(
        choice.labelKind,
        editor.state.doc,
        labels.targets.map((target) => target.label),
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
    writeAtom(editor, "crossRef", { label }, pos);
  };

  return (
    <>
      {statement && (
        <StatementDialog
          target={statement}
          onSubmit={(change) => updateStatement(editor, statement.pos, change)}
          onUnwrap={() => unwrapStatement(editor, statement.pos)}
          onClose={() => targets.setStatement(null)}
          onRestoreFocus={restoreFocus}
        />
      )}
      {math && (
        <MathDialog
          target={math}
          onSubmit={(latex) => writeMath(editor, math, latex)}
          onRemove={() => removeMath(editor, math)}
          onClose={() => targets.setMath(null)}
          onRestoreFocus={restoreFocus}
        />
      )}
      {tableDialog && (
        <TableInsertDialog
          onSubmit={(size) => insertGridTable(editor, size)}
          onSubmitTemplate={(markdown) => insertTemplateTable(editor, markdown)}
          onClose={() => targets.setTableDialog(false)}
          onRestoreFocus={restoreFocus}
        />
      )}
      {replacing !== null && (
        <TableInsertDialog
          replace
          onSubmit={() => undefined}
          onSubmitTemplate={(markdown) => replaceTable(editor, replacing, markdown)}
          onClose={() => targets.setReplacing(null)}
          onRestoreFocus={restoreFocus}
        />
      )}
      {crop && (
        <CropDialog
          src={crop.src}
          onCrop={async (png) => {
            const { src } = await api.invoke(IpcChannel.AssetStoreImage, { data: png });
            setFigureSource(editor, crop.pos, src);
          }}
          onClose={() => targets.setCrop(null)}
          onRestoreFocus={restoreFocus}
        />
      )}
      {figure && (
        <FigureDialog
          target={figure}
          onSubmit={({ caption: text, width, placement }) => writeFigure(editor, figure, { caption: text, width, placement })}
          onRemove={() => removeNode(editor, figure.pos)}
          onClose={() => targets.setFigure(null)}
          onRestoreFocus={restoreFocus}
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
          onClose={() => targets.setCaption(null)}
          onRestoreFocus={restoreFocus}
        />
      )}
      <EquationLabelBubble editor={editor} labels={labels} onOpenTarget={(id, block) => onOpenTarget?.(id, block)} />
      <ReferenceCard editor={editor} labels={labels} onOpenTarget={(id, block) => onOpenTarget?.(id, block)} />
      {atom?.type === "footnote" && (
        <FootnoteDialog
          target={atom}
          onSubmit={(text) => writeAtom(editor, "footnote", { text }, atom.pos)}
          onRemove={() => removeNode(editor, atom.pos)}
          onClose={() => targets.setAtom(null)}
          onRestoreFocus={restoreFocus}
        />
      )}
      {atom?.type === "citation" && (
        <CitationDialog
          target={atom}
          onSubmit={(keys, form) => writeAtom(editor, "citation", { keys, form }, atom.pos)}
          onRemove={() => removeNode(editor, atom.pos)}
          onClose={() => targets.setAtom(null)}
          onRestoreFocus={restoreFocus}
        />
      )}
      {atom?.type === "crossRef" && (
        <CrossRefDialog
          target={atom}
          documentId={documentId}
          labeled={labels.targets}
          unlabeled={unlabeled}
          onSubmit={(choice) => submitCrossRef(choice, atom.pos)}
          onRemove={() => removeNode(editor, atom.pos)}
          onClose={() => targets.setAtom(null)}
          onRestoreFocus={restoreFocus}
        />
      )}
    </>
  );
}
