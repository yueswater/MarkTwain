import type { Editor, Extensions } from "@tiptap/core";
import Placeholder from "@tiptap/extension-placeholder";
import type { EditorProps } from "@tiptap/pm/view";
import type { TFunction } from "i18next";
import type { Placement } from "@marktwain/schema";
import type { EditorPrefs, LabelIndex } from "../../../../shared/ipc";
import { headingName } from "../../shared/heading-names";
import { statementOf } from "./blocks/statement-heads";
import { unwrapStatement } from "./blocks/statement-commands";
import { anchorOfNode } from "./dialogs/editor-commands";
import type { DialogTargets } from "./dialogs/use-dialog-targets";
import { createSchemaExtensions } from "./extensions/schema-extensions";
import { CodeBlockWithLanguage } from "./extensions/nodes/code-block-view";
import { ChangeMarks } from "./extensions/change-marks";
import { EquationShortcut } from "./extensions/equation-shortcut";
import { LandscapeMarks } from "./extensions/landscape-marks";
import { ListMarkers } from "./extensions/list-markers";
import { MarkdownPaste } from "./extensions/markdown-paste";
import { PlacementMarks } from "./extensions/placement-marks";
import { RefDecorations } from "./extensions/ref-decorations";
import { StatementDecorations } from "./extensions/statement-decorations";
import { TableBorders } from "./extensions/table-borders";
import { TableCaptions } from "./extensions/table-captions";
import { TableLayout } from "./extensions/table-layout";
import { ThesisShortcuts } from "./extensions/thesis-shortcuts";
import type { ListLevelsState } from "./lists/use-list-levels";
import { findUnlabeledTargets } from "./references/unlabeled-targets";
import type { CitationInfo } from "./references/ref-display";
import { SlashCommand } from "./slash/slash-command";
import type { SlashHandlers } from "./slash/slash-items";
import type { TableLayoutSettings } from "./tables/use-table-layout";

/**
 * What the extensions of the editor read while it runs. The editor is made once for a document, so each value is a function that gives the current one,
 * and the state of the dialogs is reached through the targets.
 */
export type EditorContext = {
  documentId: string;
  t: () => TFunction;
  prefs: () => EditorPrefs;
  labels: () => LabelIndex;
  tableLayout: () => TableLayoutSettings;
  listLevels: () => ListLevelsState;
  citations: () => Record<string, CitationInfo>;
  /** The blocks of the latest saved version of the document as Markdown, null while they are not known */
  savedBlocks: () => string[] | null;
  editor: () => Editor | null;
  slash: () => SlashHandlers;
  targets: () => DialogTargets;
};

const ATOM_TYPES = new Set(["footnote", "citation", "crossRef"]);

export function buildExtensions(ctx: EditorContext): Extensions {
  const t = ctx.t;
  return [
    ...createSchemaExtensions({
      codeBlock: CodeBlockWithLanguage,
      onMathClick: (kind, latex, pos) => ctx.targets().setMath({ kind, latex, pos, anchor: anchorOfNode(ctx.editor(), pos) }),
      figureLabel: (percent) => t()("figure.dragWidth", { value: percent }),
      resizeLabels: {
        width: (percent) => t()("table.dragWidth", { value: percent }),
        height: (points) => t()("table.dragHeight", { value: points }),
      },
    }),
    EquationShortcut,
    ThesisShortcuts.configure({ handlers: () => ctx.slash() }),
    SlashCommand.configure({
      handlers: () => ctx.slash(),
      nameOf: (item) => {
        const own = t()(`slash.items.${item.id}.name`);
        // The author may have named the heading levels
        const level = /^heading([234])$/.exec(item.id)?.[1];
        return level ? headingName(Number(level) as 2 | 3 | 4, ctx.prefs().headingNames, own) : own;
      },
    }),
    MarkdownPaste.configure({ enabled: () => ctx.prefs().pasteMarkdown }),
    Placeholder.configure({ placeholder: t()("placeholder") }),
    PlacementMarks,
    ChangeMarks.configure({ getBase: () => ctx.savedBlocks(), enabled: () => ctx.prefs().showChanges }),
    LandscapeMarks.configure({
      label: () => t()("landscape.head"),
      removeLabel: () => t()("landscape.remove"),
      onRemove: (pos) => {
        const editor = ctx.editor();
        if (editor) unwrapStatement(editor, pos);
      },
    }),
    TableBorders,
    ListMarkers.configure({ getLevels: () => ctx.listLevels() }),
    TableLayout,
    TableCaptions.configure({
      getBase: () => ctx.labels().bases[ctx.documentId]?.tbl ?? 0,
      getPosition: () => ctx.tableLayout().position,
      getPrefix: () => ctx.tableLayout().prefix,
      getNotesLabel: () => t()("table.notesLabel"),
    }),
    StatementDecorations.configure({
      getBase: () => ctx.labels().bases[ctx.documentId] ?? {},
      nameOf: (kind) => t()(`statement.kinds.${kind.id}`),
      getStyle: () => ctx.prefs().statementStyle,
      colorOf: (kind) => ctx.prefs().statementColors[kind.id] ?? kind.accent,
      onEdit: (pos) => {
        const node = ctx.editor()?.state.doc.nodeAt(pos);
        const kind = node ? statementOf(node) : null;
        if (node && kind) ctx.targets().setStatement({ pos, kind: kind.id, title: String((node.attrs.props as { title?: string })?.title ?? "") });
      },
    }),
    RefDecorations.configure({
      getNumbers: () => ctx.labels().numbers,
      kindName: (kind) => t()(`crossRef.kind.${kind}`),
      brokenText: t()("crossRef.broken"),
      getCitations: () => ctx.citations(),
    }),
  ];
}

/** What a double click and a click on a node of the document open. */
export function buildEditorProps(ctx: EditorContext, label: string): EditorProps {
  return {
    attributes: { "aria-label": label, spellcheck: "false" },
    // A double click on a figure edits its caption, a single click only selects it
    handleDoubleClickOn: (_view, _pos, node, nodePos) => {
      if (node.type.name !== "figure") return false;
      ctx.targets().setFigure({ pos: nodePos, src: String(node.attrs.src), caption: String(node.attrs.caption ?? ""), width: (node.attrs.width as string | null) ?? null, placement: (node.attrs.placement as Placement | null) ?? null });
      return true;
    },
    // Open the edit dialog when a footnote, citation or cross-reference is clicked
    handleClickOn: (view, _pos, node, nodePos, _event, direct) => {
      if (!direct || !ATOM_TYPES.has(node.type.name)) return false;
      const targets = ctx.targets();
      if (node.type.name === "footnote") {
        targets.setAtom({ type: "footnote", pos: nodePos, text: String(node.attrs.text) });
      } else if (node.type.name === "citation") {
        targets.setAtom({ type: "citation", pos: nodePos, keys: node.attrs.keys as string[], form: String(node.attrs.form) });
      } else {
        targets.setUnlabeled(findUnlabeledTargets(view.state.doc));
        targets.setAtom({ type: "crossRef", pos: nodePos, label: String(node.attrs.label) });
      }
      return true;
    },
  };
}
