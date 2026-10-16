import type { ConfigFields } from "@marktwain/schema";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Props = {
  missing: (keyof ConfigFields)[];
  /** Whether the copy is the final one with the watermark, which is the one that is handed in */
  final: boolean;
  onFill: () => void;
  onExport: () => void;
  onClose: () => void;
};

/** Asked before a PDF is exported while parts of the cover are empty, since they print as ○○○ or as nothing. */
export function ExportCheckDialog({ missing, final, onFill, onExport, onClose }: Props) {
  const { t } = useTranslation("build");
  const { t: tConfig } = useTranslation("config");
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent data-testid="export-check">
        <DialogHeader>
          <DialogTitle>{t(final ? "check.titleFinal" : "check.title")}</DialogTitle>
          <DialogDescription>{t("check.description")}</DialogDescription>
        </DialogHeader>
        <ul className="grid max-h-56 gap-1 overflow-y-auto text-sm">
          {missing.map((name) => (
            <li key={name} className="flex items-center gap-2">
              <span aria-hidden="true">•</span>
              {tConfig(`field.${name}`)}
            </li>
          ))}
        </ul>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onExport}>
            {t("check.exportAnyway")}
          </Button>
          <Button type="button" onClick={onFill}>
            {t("check.fill")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
