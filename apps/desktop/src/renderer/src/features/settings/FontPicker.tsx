import { TypeIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { FontSource } from "../../../../shared/ipc";
import { useFonts } from "../fonts/use-fonts";

const ORDER: FontSource[] = ["project", "template", "system"];

/** A menu of the fonts that can be used, choosing one adds its name to the list of the setting. */
export function FontPicker({ label, onPick }: { label: string; onPick: (name: string) => void }) {
  const { t } = useTranslation("settings");
  const { view } = useFonts();
  const groups = ORDER.map((source) => ({ source, families: view.families.filter((family) => family.source === source) })).filter((group) => group.families.length > 0);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" size="icon-sm" aria-label={`${label} ${t("fonts.pick")}`} title={t("fonts.pick")}>
          <TypeIcon aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-80 overflow-y-auto">
        {groups.length === 0 && <DropdownMenuItem disabled>{t("fonts.pickNone")}</DropdownMenuItem>}
        {groups.map((group, index) => (
          <div key={group.source}>
            {index > 0 && <DropdownMenuSeparator />}
            <DropdownMenuLabel className="text-xs text-muted-foreground">{t(`fonts.sources.${group.source}`)}</DropdownMenuLabel>
            {group.families.map((family) => (
              <DropdownMenuItem key={family.name} onSelect={() => onPick(family.name)}>
                {family.name}
              </DropdownMenuItem>
            ))}
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
