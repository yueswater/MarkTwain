import { PlusIcon, TriangleAlertIcon, Trash2Icon } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { FontAddResult, FontSource } from "../../../../shared/ipc";
import { FontPreview } from "./FontPreview";
import { useFonts } from "./use-fonts";

const SOURCES: readonly (FontSource | "all")[] = ["all", "project", "template", "system"];
const SIZE_WARNING = 100 * 1024 * 1024;

function megabytes(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0);
}

/** The fonts that the thesis can use, with a way to add the fonts that the project needs. */
export function FontsPage() {
  const { t } = useTranslation("settings");
  const { view, loaded, add, remove } = useFonts();
  const [query, setQuery] = useState("");
  const [source, setSource] = useState<FontSource | "all">("all");
  const [outcome, setOutcome] = useState<FontAddResult | null>(null);
  const [blocked, setBlocked] = useState<{ family: string; usedIn: string[] } | null>(null);
  const [dragging, setDragging] = useState(false);
  const picker = useRef<HTMLInputElement>(null);

  async function take(files: FileList | File[]): Promise<void> {
    const list = [...files];
    if (list.length === 0) return;
    setOutcome(await add(list));
  }

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return view.families.filter(
      (entry) =>
        (source === "all" || entry.source === source) &&
        (needle === "" || entry.name.toLowerCase().includes(needle) || entry.aliases.some((alias) => alias.toLowerCase().includes(needle))),
    );
  }, [view.families, query, source]);

  return (
    <div
      className={cn("relative h-full overflow-y-auto", dragging && "bg-muted/40")}
      data-testid="fonts-page"
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        void take(event.dataTransfer.files);
      }}
    >
      <div className="mx-auto grid max-w-3xl gap-4 p-8">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold">{t("fonts.title")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t("fonts.description")}</p>
          </div>
          <Button type="button" onClick={() => picker.current?.click()}>
            <PlusIcon aria-hidden="true" />
            {t("fonts.add")}
          </Button>
          <input
            ref={picker}
            type="file"
            multiple
            hidden
            accept=".ttf,.otf,.ttc,.otc"
            aria-label={t("fonts.add")}
            data-testid="font-input"
            onChange={(event) => {
              void take(event.target.files ?? []);
              event.target.value = "";
            }}
          />
        </header>

        <p className="rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">{t("fonts.license")}</p>

        {outcome && (outcome.added.length > 0 || outcome.skipped.length > 0) && (
          <div role="status" className="grid gap-1 rounded-md border px-3 py-2 text-sm" data-testid="font-outcome">
            {outcome.added.length > 0 && <p>{t("fonts.added", { names: outcome.added.join(", ") })}</p>}
            {outcome.skipped.map((skip) => (
              <p key={skip.name} className="text-muted-foreground">
                {t(`fonts.skipped.${skip.reason}`, { name: skip.name })}
              </p>
            ))}
          </div>
        )}

        {view.missing.length > 0 && (
          <section aria-label={t("fonts.missing")} className="grid gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3" data-testid="fonts-missing">
            <h2 className="flex items-center gap-1.5 text-sm font-medium text-destructive">
              <TriangleAlertIcon className="size-4" aria-hidden="true" />
              {t("fonts.missing")}
            </h2>
            <p className="text-xs text-muted-foreground">{t("fonts.missingHint")}</p>
            <ul className="grid gap-1">
              {view.missing.map((entry) => (
                <li key={entry.name} className="flex items-center justify-between gap-3 text-sm">
                  <span>
                    <span className="font-medium">{entry.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{entry.usedIn.map((path) => t(`field.${path}`)).join("、")}</span>
                  </span>
                  <Button type="button" size="sm" variant="outline" onClick={() => picker.current?.click()}>
                    {t("fonts.addFile")}
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="flex items-center gap-2">
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("fonts.search")} aria-label={t("fonts.search")} className="h-8 flex-1" />
          <div role="tablist" aria-label={t("fonts.filter")} className="flex rounded-lg border p-0.5">
            {SOURCES.map((name) => (
              <button
                key={name}
                type="button"
                role="tab"
                aria-selected={source === name}
                onClick={() => setSource(name)}
                className={cn("rounded-md px-2.5 py-1 text-xs", source === name ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}
              >
                {t(`fonts.sources.${name}`)}
              </button>
            ))}
          </div>
        </div>

        {view.projectBytes > 0 && (
          <p className={cn("text-xs", view.projectBytes > SIZE_WARNING ? "text-destructive" : "text-muted-foreground")}>
            {t("fonts.size", { size: megabytes(view.projectBytes) })}
            {view.projectBytes > SIZE_WARNING ? ` ${t("fonts.sizeWarning")}` : ""}
          </p>
        )}

        {blocked && (
          <div role="alert" className="grid gap-2 rounded-md border px-3 py-2 text-sm">
            <p>{t("fonts.inUse", { name: blocked.family, where: blocked.usedIn.map((path) => t(`field.${path}`)).join("、") })}</p>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="destructive"
                onClick={() => {
                  const target = blocked;
                  setBlocked(null);
                  void remove(target.family, true);
                }}
              >
                {t("fonts.removeAnyway")}
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => setBlocked(null)}>
                {t("fonts.keep")}
              </Button>
            </div>
          </div>
        )}

        {!loaded ? null : shown.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("fonts.none")}</p>
        ) : (
          <ul className="grid gap-2">
            {shown.map((entry) => (
              <li key={`${entry.source}:${entry.name}`} className="grid gap-1.5 rounded-lg border p-3" data-font={entry.name} data-source={entry.source}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                      {entry.name}
                      <span className="rounded border px-1.5 py-0.5 text-[11px] font-normal text-muted-foreground">{t(`fonts.sources.${entry.source}`)}</span>
                      {entry.used && <span className="rounded bg-foreground px-1.5 py-0.5 text-[11px] font-normal text-background">{t("fonts.used")}</span>}
                    </p>
                    {entry.aliases.length > 0 && <p className="text-xs text-muted-foreground">{entry.aliases.join("、")}</p>}
                    {entry.styles.length > 0 && <p className="text-xs text-muted-foreground">{entry.styles.join(" · ")}</p>}
                  </div>
                  {entry.source === "project" && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t("fonts.remove", { name: entry.name })}
                      onClick={async () => {
                        const result = await remove(entry.name, false);
                        setBlocked(result.removed ? null : { family: entry.name, usedIn: result.usedIn });
                      }}
                    >
                      <Trash2Icon aria-hidden="true" />
                    </Button>
                  )}
                </div>
                <FontPreview family={entry} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
