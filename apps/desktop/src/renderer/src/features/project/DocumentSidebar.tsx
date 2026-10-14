import {
  ArrowDownIcon,
  ArrowUpIcon,
  BookMarkedIcon,
  BookOpenIcon,
  FileTextIcon,
  GripVerticalIcon,
  MoreHorizontalIcon,
  PanelLeftIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  SettingsIcon,
  Trash2Icon,
} from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
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
import { autoScrollStep, dropTarget, type DropTarget, type RowBox } from "@/lib/row-drag";
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
  onReorder: (id: string, targetId: string, placement: "before" | "after") => void;
  onDelete: (id: string) => void;
  onOpenSettings: () => void;
  onOpenSearch: () => void;
  /** The bibliography page is shown instead of a document */
  bibliographyActive: boolean;
  bibliographyCount: number;
  onOpenBibliography: () => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
};

type Pending = { type: "rename" | "delete"; doc: DocumentSummary };
type Drop = DropTarget;

/** A press that moves farther than this many pixels starts a drag, a shorter one is a click. */
const DRAG_THRESHOLD = 5;

export function DocumentSidebar({
  documents,
  selectedId,
  onSelect,
  onAdd,
  onRename,
  onMove,
  onReorder,
  onDelete,
  onOpenSettings,
  onOpenSearch,
  bibliographyActive,
  bibliographyCount,
  onOpenBibliography,
  collapsed,
  onToggleCollapsed,
}: Props) {
  const { t } = useTranslation("project");
  const { t: tConfig } = useTranslation("config");
  const { t: tBib } = useTranslation("bibliography");
  const [pending, setPending] = useState<Pending | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [drop, setDrop] = useState<Drop | null>(null);
  // Set while the pointer is over a place that does not accept the dragged document
  const [refused, setRefused] = useState<{ x: number; y: number } | null>(null);
  const press = useRef<{ id: string; startY: number; active: boolean; list: HTMLElement | null; y: number } | null>(null);
  const suppressClick = useRef(false);

  const kindCount = (kind: DocumentKind) => documents.filter((d) => d.kind === kind).length;
  const addMenu = (
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
  );

  function boxes(list: HTMLElement): RowBox[] {
    return [...list.querySelectorAll<HTMLElement>("li[data-doc-id]")].flatMap((element) => {
      const doc = documents.find((d) => d.id === element.dataset.docId);
      if (!doc) return [];
      const rect = element.getBoundingClientRect();
      return [{ id: doc.id, kind: doc.kind, top: rect.top, bottom: rect.bottom }];
    });
  }

  function endDrag(): void {
    press.current = null;
    setDragId(null);
    setDrop(null);
    setRefused(null);
  }

  function onRowPointerDown(event: PointerEvent<HTMLLIElement>, doc: DocumentSummary): void {
    // The menu of a row is rendered in a portal, and its events still reach the row through React
    if (!event.currentTarget.contains(event.target as Node)) return;
    if (event.button !== 0 || (event.target as HTMLElement).closest("[data-no-drag]")) return;
    press.current = { id: doc.id, startY: event.clientY, active: false, list: event.currentTarget.parentElement, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onRowPointerMove(event: PointerEvent<HTMLLIElement>): void {
    const current = press.current;
    if (!current) return;
    current.y = event.clientY;
    if (!current.active) {
      if (Math.abs(event.clientY - current.startY) < DRAG_THRESHOLD) return;
      current.active = true;
      setDragId(current.id);
    }
    if (!current.list) return;
    const target = dropTarget(boxes(current.list), current.id, event.clientY);
    setDrop((previous) => (previous?.targetId === target?.targetId && previous?.placement === target?.placement ? previous : target));
    setRefused(target ? null : { x: event.clientX, y: event.clientY });
  }

  function onRowPointerUp(event: PointerEvent<HTMLLIElement>): void {
    const current = press.current;
    if (!current) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (current.active) {
      // The click that follows a drag must not select the row
      suppressClick.current = true;
      setTimeout(() => {
        suppressClick.current = false;
      }, 0);
      if (current.list) {
        const target = dropTarget(boxes(current.list), current.id, event.clientY);
        if (target) onReorder(current.id, target.targetId, target.placement);
      }
    }
    endDrag();
  }

  // The list scrolls while a dragged row is held near its top or bottom edge, and Escape cancels the drag
  useEffect(() => {
    if (!dragId) return;
    const timer = setInterval(() => {
      const current = press.current;
      if (!current?.active || !current.list) return;
      const rect = current.list.getBoundingClientRect();
      current.list.scrollTop += autoScrollStep(current.y, rect.top, rect.bottom);
    }, 16);
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") endDrag();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      clearInterval(timer);
      window.removeEventListener("keydown", onKey);
    };
  }, [dragId]);

  /** Alt with an arrow moves the document and keeps the focus on it. */
  function onRowKeyDown(event: KeyboardEvent<HTMLButtonElement>, doc: DocumentSummary): void {
    if (!event.altKey || (event.key !== "ArrowUp" && event.key !== "ArrowDown")) return;
    event.preventDefault();
    onMove(doc.id, event.key === "ArrowUp" ? -1 : 1);
    setTimeout(() => document.querySelector<HTMLElement>(`li[data-doc-id="${doc.id}"] button`)?.focus(), 80);
  }

  const row = (doc: DocumentSummary, compact: boolean) => {
    const title = documentTitle(t, doc);
    const current = doc.id === selectedId && !bibliographyActive;
    const indicator = drop?.targetId === doc.id ? drop.placement : null;
    return (
      <li
        key={doc.id}
        className={cn(
          "group/item relative",
          indicator === "before" && "before:absolute before:inset-x-1 before:top-0 before:h-0.5 before:rounded before:bg-foreground",
          indicator === "after" && "after:absolute after:inset-x-1 after:bottom-0 after:h-0.5 after:rounded after:bg-foreground",
          dragId === doc.id && "opacity-40",
          dragId && "select-none",
        )}
        data-doc-id={doc.id}
        onPointerDown={(event) => onRowPointerDown(event, doc)}
        onPointerMove={onRowPointerMove}
        onPointerUp={onRowPointerUp}
        onPointerCancel={endDrag}
        onClickCapture={(event) => {
          if (suppressClick.current) {
            event.preventDefault();
            event.stopPropagation();
          }
        }}
      >
        <button
          type="button"
          aria-current={current ? "true" : undefined}
          onClick={() => onSelect(doc.id)}
          onKeyDown={(event) => onRowKeyDown(event, doc)}
          className={cn(
            "flex h-8 w-full items-center truncate rounded-md px-2 text-left text-sm hover:bg-muted",
            !compact && "pr-9",
            current && "bg-muted font-medium",
          )}
        >
          {!compact && <GripVerticalIcon className="-ml-1 mr-0.5 size-3.5 shrink-0 text-muted-foreground/50" aria-hidden="true" />}
          <span className="truncate">{title}</span>
        </button>
        {!compact && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-xs"
                data-no-drag
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
  };

  return (
    <aside
      className={cn("relative flex shrink-0 flex-col border-r transition-[width] duration-150", collapsed ? "w-12" : "w-64")}
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
            <Button variant="ghost" size="icon-sm" aria-label={t("search.open")} title={t("search.open")} onClick={onOpenSearch}>
              <SearchIcon aria-hidden="true" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label={t("workspace.add")}>
                  <PlusIcon aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              {addMenu}
            </DropdownMenu>
          </>
        )}
      </div>

      {collapsed ? (
        // The whole list folds into one icon, and hovering it slides the list out to the right
        <div className="group/fly relative px-2">
          <button
            type="button"
            aria-label={t("workspace.documents")}
            aria-haspopup="menu"
            className="flex h-8 w-full items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:bg-muted"
          >
            <BookOpenIcon className="size-4" aria-hidden="true" />
          </button>
          <div
            role="menu"
            aria-label={t("workspace.documents")}
            className="invisible absolute top-0 left-full z-30 w-60 -translate-x-1 rounded-lg border bg-popover p-1 opacity-0 shadow-md transition duration-100 group-focus-within/fly:visible group-focus-within/fly:translate-x-0 group-focus-within/fly:opacity-100 group-hover/fly:visible group-hover/fly:translate-x-0 group-hover/fly:opacity-100"
          >
            <ul className="max-h-[70vh] overflow-y-auto">{documents.map((doc) => row(doc, true))}</ul>
            <div className="mt-1 border-t pt-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button" className="flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-sm hover:bg-muted">
                    <PlusIcon className="size-4 text-muted-foreground" aria-hidden="true" />
                    {t("workspace.add")}
                  </button>
                </DropdownMenuTrigger>
                {addMenu}
              </DropdownMenu>
            </div>
          </div>
        </div>
      ) : (
        <ul className="flex-1 overflow-y-auto px-2 pb-2">{documents.map((doc) => row(doc, false))}</ul>
      )}
      {collapsed && <div className="flex-1" />}

      <div className="grid gap-1 border-t p-2">
        <button
          type="button"
          aria-current={bibliographyActive ? "true" : undefined}
          aria-label={collapsed ? tBib("open") : undefined}
          title={collapsed ? tBib("open") : undefined}
          onClick={onOpenBibliography}
          className={cn(
            "flex h-8 w-full items-center gap-2 rounded-md text-left text-sm hover:bg-muted",
            collapsed ? "justify-center" : "px-2",
            bibliographyActive && "bg-muted font-medium",
          )}
        >
          <BookMarkedIcon className="size-4 text-muted-foreground" aria-hidden="true" />
          {!collapsed && (
            <>
              {tBib("open")}
              {bibliographyCount > 0 && <span className="ml-auto text-xs text-muted-foreground">{bibliographyCount}</span>}
            </>
          )}
        </button>
        <button
          type="button"
          aria-label={collapsed ? tConfig("open") : undefined}
          title={collapsed ? tConfig("open") : undefined}
          onClick={onOpenSettings}
          className={cn("flex h-8 w-full items-center gap-2 rounded-md text-left text-sm hover:bg-muted", collapsed ? "justify-center" : "px-2")}
        >
          <SettingsIcon className="size-4 text-muted-foreground" aria-hidden="true" />
          {!collapsed && tConfig("open")}
        </button>
      </div>

      {refused && (
        <div
          role="status"
          className="pointer-events-none fixed z-50 rounded-md border bg-popover px-2 py-1 text-xs text-muted-foreground shadow-md"
          style={{ left: refused.x + 14, top: refused.y + 14 }}
        >
          {t("document.dragSameKind")}
        </div>
      )}
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
