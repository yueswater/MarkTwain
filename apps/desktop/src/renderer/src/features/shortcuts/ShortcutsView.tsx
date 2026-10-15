import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { currentPlatform } from "@/lib/shortcut-label";
import { cn } from "@/lib/utils";
import { SHORTCUTS, formatChord, type Platform, type ShortcutGroup } from "../../../../shared/shortcuts";

const PLATFORMS: readonly Platform[] = ["mac", "win", "linux"];
const GROUPS: readonly ShortcutGroup[] = ["text", "blocks", "insert", "edit", "app"];

/** Every shortcut of the app by area, with a search and a choice of the platform, the platform that runs the app first. */
export function ShortcutsView() {
  const { t } = useTranslation("settings");
  const [platform, setPlatform] = useState<Platform>(currentPlatform);
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const needle = query.replace(/\s+/g, "").toLowerCase();
    return GROUPS.map((group) => ({
      group,
      commands: SHORTCUTS.filter((command) => command.group === group).filter((command) => {
        if (needle === "") return true;
        const name = t(`shortcuts.commands.${command.id}`).replace(/\s+/g, "").toLowerCase();
        const keys = command.chord ? formatChord(command.chord, platform).replace(/\s+/g, "").toLowerCase() : "";
        return name.includes(needle) || keys.includes(needle);
      }),
    })).filter((entry) => entry.commands.length > 0);
  }, [query, platform, t]);

  return (
    <div className="grid gap-3" data-testid="shortcuts-view">
      <div className="flex items-center gap-2">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("shortcuts.search")}
          aria-label={t("shortcuts.search")}
          className="h-8 flex-1"
        />
        <div role="tablist" aria-label={t("shortcuts.platform")} className="flex rounded-lg border p-0.5">
          {PLATFORMS.map((name) => (
            <button
              key={name}
              type="button"
              role="tab"
              aria-selected={platform === name}
              onClick={() => setPlatform(name)}
              className={cn("rounded-md px-2.5 py-1 text-xs", platform === name ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}
            >
              {t(`shortcuts.platforms.${name}`)}
            </button>
          ))}
        </div>
      </div>
      {rows.length === 0 && <p className="text-sm text-muted-foreground">{t("shortcuts.none")}</p>}
      {rows.map(({ group, commands }) => (
        <section key={group} aria-label={t(`shortcuts.groups.${group}`)}>
          <h3 className="mb-1 text-xs font-medium text-muted-foreground">{t(`shortcuts.groups.${group}`)}</h3>
          <ul className="divide-y rounded-md border">
            {commands.map((command) => (
              <li key={command.id} className="flex items-center justify-between gap-4 px-3 py-1.5 text-sm" data-command={command.id}>
                <span>{t(`shortcuts.commands.${command.id}`)}</span>
                {command.chord ? (
                  <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-xs">{formatChord(command.chord, platform)}</kbd>
                ) : (
                  <span className="text-xs text-muted-foreground">{t("shortcuts.noKey")}</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
