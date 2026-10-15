import { BadgeCheckIcon, BookOpenTextIcon, CornerDownRightIcon, FlaskConicalIcon, LightbulbIcon, PuzzleIcon, SplitIcon, StickyNoteIcon, TrophyIcon, type LucideIcon } from "lucide-react";

/** An icon for each kind of block of a mathematical thesis, so the menus tell them apart at a glance. */
const ICONS: Record<string, LucideIcon> = {
  definition: BookOpenTextIcon,
  lemma: PuzzleIcon,
  theorem: TrophyIcon,
  proposition: LightbulbIcon,
  corollary: CornerDownRightIcon,
  case: SplitIcon,
  example: FlaskConicalIcon,
  remark: StickyNoteIcon,
  proof: BadgeCheckIcon,
};

export function statementIcon(kind: string): LucideIcon {
  return ICONS[kind] ?? StickyNoteIcon;
}
