import { CheckIcon, ChevronDownIcon, GitBranchIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DiscardBranchDialog } from "./DiscardBranchDialog";
import { CompareDialog } from "./CompareDialog";
import { HistoryDialog } from "./HistoryDialog";
import { MergeDialog } from "./MergeDialog";
import { NewBranchDialog } from "./NewBranchDialog";
import { SaveVersionDialog } from "./SaveVersionDialog";
import type { Versions } from "./use-versions";

type Dialog = "save" | "start" | "history" | "discard" | "merge" | null;

/** The branch that is open, at the top, with the menu of the versions: save, start a change, open another, history, discard. */
export function BranchBar({ versions }: { versions: Versions }) {
  const { t } = useTranslation("versions");
  const [dialog, setDialog] = useState<Dialog>(null);
  const [comparing, setComparing] = useState<{ from: string; to: string; label: string } | null>(null);
  const { status } = versions;
  if (!status) return null;

  const isMain = status.branch === "main";
  const name = isMain ? t("branch.main") : status.branch;
  const others = status.branches.filter((branch) => !branch.isCurrent);
  const close = () => {
    versions.clearError();
    setDialog(null);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" data-testid="branch-bar" aria-label={t("branch.menu")} data-branch={status.branch} data-dirty={status.dirty}>
            <GitBranchIcon aria-hidden="true" />
            <span className="max-w-40 truncate">{name}</span>
            {status.dirty && <span className="size-1.5 rounded-full bg-primary" role="img" aria-label={t("branch.unsaved")} title={t("branch.unsaved")} />}
            <ChevronDownIcon className="opacity-60" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-60">
          <DropdownMenuItem onSelect={() => setDialog("save")}>{t("action.save")}</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setDialog("start")}>{t("action.start")}</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setDialog("history")}>{t("action.history")}</DropdownMenuItem>
          {!isMain && <DropdownMenuItem onSelect={() => setDialog("merge")}>{t("action.merge")}</DropdownMenuItem>}
          {!isMain && <DropdownMenuItem onSelect={() => setDialog("discard")}>{t("action.discard")}</DropdownMenuItem>}
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs text-muted-foreground">{t("branch.open")}</DropdownMenuLabel>
          <DropdownMenuItem onSelect={() => undefined} disabled className="gap-2">
            <CheckIcon className="size-4" aria-hidden="true" />
            <span className="truncate">{name}</span>
          </DropdownMenuItem>
          {others.map((branch) => (
            <DropdownMenuItem key={branch.name} onSelect={() => void versions.switchTo(branch.name)} className="gap-2 pl-8">
              <span className="truncate">{branch.name === "main" ? t("branch.main") : branch.name}</span>
              {branch.hasDraft && <span className="ml-auto size-1.5 rounded-full bg-primary" role="img" aria-label={t("branch.unsaved")} />}
            </DropdownMenuItem>
          ))}
          {others.length === 0 && <DropdownMenuItem disabled className="pl-8">{t("branch.none")}</DropdownMenuItem>}
        </DropdownMenuContent>
      </DropdownMenu>
      {dialog === "save" && <SaveVersionDialog busy={versions.busy} error={versions.error} onSubmit={versions.save} onClose={close} />}
      {dialog === "start" && <NewBranchDialog busy={versions.busy} error={versions.error} onSubmit={versions.start} onClose={close} />}
      {dialog === "discard" && <DiscardBranchDialog name={status.branch} busy={versions.busy} error={versions.error} onConfirm={() => versions.discard(status.branch)} onClose={close} />}
      {dialog === "history" && <HistoryDialog branch={name} headId={status.headId} load={versions.history} busy={versions.busy} error={versions.error} onRestore={versions.restore} onCompare={(entry, label) => setComparing({ from: entry.parentId as string, to: entry.id, label })} onClose={close} />}
      {comparing && <CompareDialog label={comparing.label} load={() => versions.compare(comparing.from, comparing.to)} error={versions.error} onClose={() => setComparing(null)} />}
      {dialog === "merge" && <MergeDialog source={status.branch} dirty={status.dirty} busy={versions.busy} error={versions.error} preview={versions.previewMerge} onMerge={versions.merge} onSaveFirst={() => setDialog("save")} onClose={close} />}
    </>
  );
}
