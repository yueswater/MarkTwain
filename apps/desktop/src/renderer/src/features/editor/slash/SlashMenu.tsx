import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { SlashPreview } from "./SlashPreview";
import { SLASH_GROUPS, type SlashItem } from "./slash-items";

export type SlashMenuHandle = { onKeyDown: (event: KeyboardEvent) => boolean };

type Props = {
  items: SlashItem[];
  query: string;
  rect: DOMRect | null;
  onPick: (item: SlashItem) => void;
  /** The name of an item, the author may have renamed the heading levels */
  nameOf: (item: SlashItem) => string;
};

const ESCAPE_KEY = "esc";
const LIST_WIDTH = 288;
const PANEL_WIDTH = 248;

/** The list of blocks under the cursor, and at its side a description or a drawing of the one that is chosen. */
export const SlashMenu = forwardRef<SlashMenuHandle, Props>(function SlashMenu({ items, query, rect, onPick, nameOf }, ref) {
  const { t } = useTranslation("editor");
  const [index, setIndex] = useState(0);
  const list = useRef<HTMLDivElement>(null);
  const [place, setPlace] = useState<{ top: number; left: number; panelLeft: boolean } | null>(null);

  // A new search starts at the first item
  useEffect(() => setIndex(0), [query, items.length]);

  useImperativeHandle(ref, () => ({
    onKeyDown(event) {
      if (items.length === 0) return false;
      if (event.key === "ArrowDown") {
        setIndex((value) => (value + 1) % items.length);
        return true;
      }
      if (event.key === "ArrowUp") {
        setIndex((value) => (value - 1 + items.length) % items.length);
        return true;
      }
      if (event.key === "Enter") {
        onPick(items[index]!);
        return true;
      }
      return false;
    },
  }));

  useLayoutEffect(() => {
    if (!rect) return;
    const height = list.current?.offsetHeight ?? 360;
    const below = rect.bottom + 6;
    const top = below + height <= window.innerHeight - 8 ? below : Math.max(8, rect.top - 6 - height);
    const left = Math.min(Math.max(rect.left, 8), Math.max(8, window.innerWidth - LIST_WIDTH - 8));
    // The panel goes to the left of the list when there is no room at its right
    setPlace({ top, left, panelLeft: left + LIST_WIDTH + PANEL_WIDTH + 12 > window.innerWidth });
  }, [rect, items.length]);

  // The chosen item stays in view while moving with the arrows
  useEffect(() => {
    list.current?.querySelector<HTMLElement>(`[data-index="${index}"]`)?.scrollIntoView({ block: "nearest" });
  }, [index]);

  const current = items[index];
  const level = current?.id.startsWith("heading") ? Number(current.id.slice(-1)) : undefined;
  // With nothing typed the items sit under their group, a search lists them together
  const groups = query.trim() === "" ? SLASH_GROUPS : [null];

  return (
    <div
      role="presentation"
      className="fixed z-50 flex items-start gap-3"
      style={{ top: place?.top ?? -9999, left: place?.left ?? -9999, flexDirection: place?.panelLeft ? "row-reverse" : "row" }}
      onMouseDown={(event) => event.preventDefault()}
    >
      <div ref={list} role="listbox" aria-label={t("slash.title")} data-testid="slash-menu" className="flex max-h-[min(24rem,60vh)] flex-col overflow-hidden rounded-xl border bg-popover shadow-lg" style={{ width: LIST_WIDTH }}>
        <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
          {items.length === 0 && <p className="px-3 py-4 text-sm text-muted-foreground">{t("slash.none")}</p>}
          {groups.map((group) => {
            const shown = items.map((item, itemIndex) => ({ item, itemIndex })).filter(({ item }) => group === null || item.group === group);
            if (shown.length === 0) return null;
            return (
              <div key={group ?? "all"} className="mb-1">
                {group && <p className="px-2 pt-1.5 pb-1 text-xs font-medium text-muted-foreground">{t(`slash.groups.${group}`)}</p>}
                {shown.map(({ item, itemIndex }) => (
                  <button
                    key={item.id}
                    type="button"
                    role="option"
                    data-index={itemIndex}
                    aria-selected={itemIndex === index}
                    onMouseEnter={() => setIndex(itemIndex)}
                    onClick={() => onPick(item)}
                    className={cn("flex h-9 w-full items-center gap-2.5 rounded-md px-2 text-left text-sm", itemIndex === index && "bg-muted")}
                  >
                    <item.icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate">{nameOf(item)}</span>
                    {item.markdown && <kbd className="font-mono text-xs text-muted-foreground">{item.markdown}</kbd>}
                  </button>
                ))}
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-between border-t px-3 py-2 text-xs text-muted-foreground">
          <span>{t("slash.close")}</span>
          <kbd className="font-mono">{ESCAPE_KEY}</kbd>
        </div>
      </div>
      {current && (
        <aside aria-label={t("slash.preview")} data-testid="slash-preview" className="hidden rounded-xl border bg-popover p-3 shadow-lg md:block" style={{ width: PANEL_WIDTH }}>
          <div className="mb-2 min-h-16 rounded-md bg-background p-3">
            <SlashPreview item={current} level={level} />
          </div>
          <p className="text-sm font-medium">{nameOf(current)}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{t(`slash.items.${current.id}.description`)}</p>
        </aside>
      )}
    </div>
  );
});
