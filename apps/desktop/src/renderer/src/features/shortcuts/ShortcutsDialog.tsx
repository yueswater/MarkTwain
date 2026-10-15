import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ShortcutsView } from "./ShortcutsView";

type Props = { open: boolean; onOpenChange: (open: boolean) => void };

/** The cheat sheet, opened from the Help menu and with Mod and a slash. */
export function ShortcutsDialog({ open, onOpenChange }: Props) {
  const { t } = useTranslation("settings");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t("shortcuts.title")}</DialogTitle>
          <DialogDescription>{t("shortcuts.description")}</DialogDescription>
        </DialogHeader>
        <ShortcutsView />
      </DialogContent>
    </Dialog>
  );
}
