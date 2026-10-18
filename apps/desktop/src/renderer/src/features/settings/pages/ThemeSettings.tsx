import { CheckIcon, FileUpIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useColorThemes } from "@/lib/color-themes";
import { usePrefs } from "@/lib/prefs";
import { cn } from "@/lib/utils";
import { DEFAULT_COLOR_THEME } from "../../../../../shared/prefs";
import { errorMessage } from "../../../shared/error-message";
import { Rich } from "../../../shared/rich";
import { ThemeMock } from "../controls/ThemeMock";

/** The screenshots of the themes that come with the app, made by the tool of the repository, one picture for each id, a jpg. */
const SHOTS = import.meta.glob<string>("../../../assets/color-themes/*.jpg", { eager: true, query: "?url", import: "default" });

function shotOf(id: string): string | null {
  const entry = Object.entries(SHOTS).find(([path]) => path.endsWith(`/${id}.jpg`));
  return entry ? entry[1] : null;
}

/** The file of a theme, as it is shown to the person who wants to write one. */
const EXAMPLE = `name: "My theme"
author: "Me"
mode: dark          # light or dark
colors:
  background: "#1e1e2e"
  foreground: "#cdd6f4"
  primary: "#cba6f7"
  # The rest is worked out, and each can be set:
  # surface, muted, muted-foreground, border,
  # destructive, heading, link`;

type Card = {
  id: string;
  name: string;
  author: string;
  mode: "light" | "dark";
  removable: boolean;
  mock: Parameters<typeof ThemeMock>[0]["theme"] | null;
};

/** The color themes of the app: a picture of each, the one that is used, and a file that the person can add. */
export function ThemeSettings() {
  const { t } = useTranslation("settings");
  const { t: tRoot } = useTranslation();
  const { prefs, setPrefs } = usePrefs();
  const { themes, importTheme, removeTheme } = useColorThemes();
  const [error, setError] = useState<string | null>(null);

  const cards: Card[] = [
    { id: DEFAULT_COLOR_THEME, name: t("theme.default"), author: "MarkTwain", mode: "light", removable: false, mock: null },
    ...themes.map((theme): Card => ({ id: theme.id, name: theme.name, author: theme.author, mode: theme.mode, removable: !theme.builtin, mock: theme })),
  ];
  const own = cards.filter((card) => card.removable);
  const given = cards.filter((card) => !card.removable);

  async function add(): Promise<void> {
    setError(null);
    try {
      const imported = await importTheme();
      if (imported) setPrefs({ colorTheme: imported.id });
    } catch (e) {
      setError(errorMessage(tRoot, e));
    }
  }

  const grid = (list: Card[]) => (
    <div role="radiogroup" aria-label={t("page.editorTheme.title")} className="grid grid-cols-[repeat(auto-fill,minmax(13rem,1fr))] gap-3">
      {list.map((card) => {
        const selected = prefs.colorTheme === card.id;
        const shot = shotOf(card.id);
        return (
          <div key={card.id} className="relative">
            <button
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={card.name}
              data-theme-id={card.id}
              onClick={() => setPrefs({ colorTheme: card.id })}
              className={cn(
                "flex w-full flex-col overflow-hidden rounded-lg border bg-card text-left transition-colors outline-none hover:border-foreground/40 focus-visible:border-foreground",
                selected && "border-foreground"
              )}
            >
              <span className="relative block aspect-[16/10] w-full overflow-hidden border-b bg-muted">
                {shot ? <img src={shot} alt="" className="size-full object-cover object-top-left" draggable={false} /> : card.mock ? <ThemeMock theme={card.mock} /> : null}
                {selected && (
                  <span className="absolute top-1.5 right-1.5 inline-flex size-5 items-center justify-center rounded-full bg-foreground text-background">
                    <CheckIcon className="size-3" aria-hidden="true" />
                  </span>
                )}
              </span>
              <span className="flex items-baseline justify-between gap-2 px-2.5 py-2">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{card.name}</span>
                  {card.author && <span className="block truncate text-xs text-muted-foreground">{card.author}</span>}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">{t(`theme.${card.mode}`)}</span>
              </span>
            </button>
            {card.removable && (
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="absolute top-1.5 left-1.5 bg-background/80"
                aria-label={t("theme.remove", { name: card.name })}
                onClick={() => void removeTheme(card.id).catch((e: unknown) => setError(errorMessage(tRoot, e)))}
              >
                <Trash2Icon aria-hidden="true" />
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-6" id="setting-editor-colorTheme">
      {grid(given)}
      <section aria-label={t("theme.mine")} className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-medium">{t("theme.mine")}</h3>
            <p className="text-xs text-muted-foreground">
              <Rich text={t("theme.importHint")} />
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => void add()}>
            <FileUpIcon aria-hidden="true" />
            {t("theme.import")}
          </Button>
        </div>
        {error && (
          <p role="alert" className="text-xs text-destructive select-text">
            <Rich text={error} />
          </p>
        )}
        {own.length > 0 && grid(own)}
        <details className="rounded-lg border px-3 py-2 text-sm">
          <summary className="cursor-pointer select-none">{t("theme.formatTitle")}</summary>
          <p className="mt-2 text-xs text-muted-foreground">
            <Rich text={t("theme.formatHint")} />
          </p>
          <pre className="mt-2 overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs leading-5 select-text">{EXAMPLE}</pre>
        </details>
      </section>
    </div>
  );
}
