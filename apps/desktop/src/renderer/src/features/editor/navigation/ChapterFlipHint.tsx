import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import type { Hint } from "./use-chapter-flip";
import { Rich } from "../../../shared/rich";

/** The small bar at the top or the bottom of the page that says which document opens when the push goes on. */
export function ChapterFlipHint({ hint }: { hint: Hint }) {
  const { t } = useTranslation("editor");
  return (
    <div className={cn("pointer-events-none absolute inset-x-0 z-10 flex justify-center px-4", hint.edge === "end" ? "bottom-4" : "top-4")} role="status" data-testid="edge-hint">
      <div className="flex min-w-48 max-w-md flex-col gap-1.5 rounded-lg border bg-popover px-4 py-2 text-sm shadow-md">
        <span className="truncate"><Rich text={t(hint.edge === "end" ? "flip.next" : "flip.previous", { title: hint.title })} /></span>
        <span className="h-1 overflow-hidden rounded-full bg-muted">
          <span className="block h-full bg-primary" style={{ width: `${Math.round(hint.progress * 100)}%` }} />
        </span>
      </div>
    </div>
  );
}
