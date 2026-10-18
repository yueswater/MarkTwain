import { useState } from "react";
import type { MathTarget } from "../math/MathDialog";
import type { AtomTarget } from "../references/atom-target";
import type { CaptionTarget } from "../figures/CaptionDialog";
import type { FigureTarget } from "../figures/FigureDialog";
import type { StatementTarget } from "../blocks/StatementDialog";
import type { LinkTarget } from "../references/LinkDialog";
import type { UnlabeledTarget } from "../references/unlabeled-targets";

/** What each dialog of the editor is about, null while it is closed. The editor opens a dialog by setting its target. */
export type DialogTargets = ReturnType<typeof useDialogTargets>;

export function useDialogTargets() {
  const [math, setMath] = useState<MathTarget | null>(null);
  const [atom, setAtom] = useState<AtomTarget | null>(null);
  const [link, setLink] = useState<LinkTarget | null>(null);
  const [caption, setCaption] = useState<CaptionTarget | null>(null);
  const [figure, setFigure] = useState<FigureTarget | null>(null);
  const [statement, setStatement] = useState<StatementTarget | null>(null);
  const [crop, setCrop] = useState<{ pos: number; src: string } | null>(null);
  const [tableDialog, setTableDialog] = useState(false);
  // The position of a table that is given another template
  const [replacing, setReplacing] = useState<number | null>(null);
  // The targets of the editor that have no label yet, listed when the cross-reference dialog opens
  const [unlabeled, setUnlabeled] = useState<UnlabeledTarget[]>([]);
  const [importError, setImportError] = useState<string | null>(null);
  return { math, setMath, atom, setAtom, link, setLink, caption, setCaption, figure, setFigure, statement, setStatement, crop, setCrop, tableDialog, setTableDialog, replacing, setReplacing, unlabeled, setUnlabeled, importError, setImportError };
}
