import {
  ArrowDownIcon,
  ArrowUpIcon,
  MoreHorizontalIcon,
  FileTextIcon,
  PanelLeftIcon,
  PencilIcon,
  PlusIcon,
  SettingsIcon,
  Trash2Icon,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  DOCUMENT_KIND_ORDER,
  SINGLETON_KINDS,
  type DocumentKind,
} from "../../../../shared/enums/document-kind.enum";
import type { DocumentSummary } from "../../../../shared/ipc";
import { DeleteDialog } from "./DeleteDialog";
import { documentTitle } from "./document-title";
import { RenameDialog } from "./RenameDialog";

type Props = {
  documents: DocumentSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: (kind: DocumentKind) => void;
  onRename: (id: string, title: string) => void;
  onMove: (id: string, delta: -1 | 1) => void;
  onDelete: (id: string) => void;
  settingsSelected: boolean;
  onSelectSettings: () => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
};

type Pending = { type: "rename" | "delete"; doc: DocumentSummary };

export function DocumentSidebar({
  documents,
  selectedId,
  onSelect,
  onAdd,
  onRename,
  onMove,
  onDelete,
  settingsSelected,
  onSelectSettings,
  collapsed,
  onToggleCollapsed,
}: Props) {
  const { t } = useTranslation("project");
  const { t: tConfig } = useTranslation("config");
  const [pending, setPending] = useState<Pending | null>(null);

  const kindCount = (kind: DocumentKind) => documents.filter((d) => d.kind === kind).length;

  return (
    <aside
      className={cn("flex shrink-0 flex-col border-r transition-[width] duration-150", collapsed ? "w-12" : "w-64")}
      aria-label={t("workspace.documents")}
      data-collapsed={collapsed}
    >
      <div className={cn("flex h-10 items-center px-2", collapsed ? "justify-center" : "justify-between")}>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t(collapsed ? "workspace.expand" : "workspace.collapse")}
          title={t(collapsed ? "workspace.expand" : "workspace.collapse")}
          aria-expanded={!collapsed}
          onClick={onToggleCollapsed}
        >
          <PanelLeftIcon aria-hidden="true" />
        </Button>
        {!collapsed && (
          <>
            <h2 className="mr-auto ml-2 text-xs font-medium text-muted-foreground">{t("workspace.documents")}</h2>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label={t("workspace.add")}>
                  <PlusIcon aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {DOCUMENT_KIND_ORDER.map((kind) => (
                  <DropdownMenuItem
                    key={kind}
                    disabled={SINGLETON_KINDS.includes(kind) && kindCount(kind) > 0}
                    onSelect={() => onAdd(kind)}
                  >
                    {t(`kind.name.${kind}`)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </div>

      <ul className="flex-1 overflow-y-auto px-2 pb-2">
        {documents.map((doc) => {
          const title = documentTitle(t, doc);
          const current = !settingsSelected && doc.id === selectedId;
          return (
            <li key={doc.id} className="group/item relative">
              <button
                type="button"
                aria-current={current ? "true" : undefined}
                aria-label={collapsed ? title : undefined}
                title={collapsed ? title : undefined}
                onClick={() => onSelect(doc.id)}
                className={cn(
                  "flex h-8 w-full items-center rounded-md text-left text-sm hover:bg-muted",
                  collapsed ? "justify-center px-0" : "truncate px-2 pr-9",
                  current && "bg-muted font-medium",
                )}
              >
                {collapsed ? (
                  <FileTextIcon className="size-4 text-muted-foreground" aria-hidden="true" />
                ) : (
                  <span className="truncate">{title}</span>
                )}
              </button>
              {!collapsed && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label={t("document.actions", { title })}
                      className="absolute top-1 right-1 opacity-0 group-hover/item:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100"
                    >
                      <MoreHorizontalIcon aria-hidden="true" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => setPending({ type: "rename", doc })}>
                      <PencilIcon aria-hidden="true" />
                      {t("document.rename")}
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled={doc.position <= 1} onSelect={() => onMove(doc.id, -1)}>
                      <ArrowUpIcon aria-hidden="true" />
                      {t("document.moveUp")}
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled={doc.position >= kindCount(doc.kind)} onSelect={() => onMove(doc.id, 1)}>
                      <ArrowDownIcon aria-hidden="true" />
                      {t("document.moveDown")}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onSelect={() => setPending({ type: "delete", doc })}>
                      <Trash2Icon aria-hidden="true" />
                      {t("document.delete")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </li>
          );
        })}
      </ul>

      <div className="border-t p-2">
        <button
          type="button"
          aria-current={settingsSelected ? "true" : undefined}
          aria-label={collapsed ? tConfig("open") : undefined}
          title={collapsed ? tConfig("open") : undefined}
          onClick={onSelectSettings}
          className={cn(
            "flex h-8 w-full items-center gap-2 rounded-md text-left text-sm hover:bg-muted",
            collapsed ? "justify-center" : "px-2",
            settingsSelected && "bg-muted font-medium",
          )}
        >
          <SettingsIcon className="size-4 text-muted-foreground" aria-hidden="true" />
          {!collapsed && tConfig("open")}
        </button>
      </div>

      {pending?.type === "rename" && (
        <RenameDialog
          initialTitle={pending.doc.title}
          onSubmit={(title) => onRename(pending.doc.id, title)}
          onClose={() => setPending(null)}
        />
      )}
      {pending?.type === "delete" && (
        <DeleteDialog
          title={documentTitle(t, pending.doc)}
          onConfirm={() => onDelete(pending.doc.id)}
          onClose={() => setPending(null)}
        />
      )}
    </aside>
  );
}
