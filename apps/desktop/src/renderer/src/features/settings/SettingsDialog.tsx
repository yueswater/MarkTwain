import { PenLineIcon, SlidersHorizontalIcon, FileTextIcon, GraduationCapIcon, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { ConfigForm } from "../project/ConfigForm";
import { AdvancedForm } from "./AdvancedForm";
import { EditorAdvancedSettings, EditorBasicSettings } from "./EditorSettings";

export type SettingsSection = "editor" | "editorAdvanced" | "thesis" | "thesisAdvanced";

const SECTIONS: { id: SettingsSection; icon: LucideIcon; needsProject: boolean }[] = [
  { id: "editor", icon: PenLineIcon, needsProject: false },
  { id: "editorAdvanced", icon: SlidersHorizontalIcon, needsProject: false },
  { id: "thesis", icon: GraduationCapIcon, needsProject: true },
  { id: "thesisAdvanced", icon: FileTextIcon, needsProject: true },
];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Whether a project is open, the thesis sections need one */
  hasProject: boolean;
  initialSection?: SettingsSection;
  /** Called when something of the thesis was saved, the preview watches it */
  onThesisSaved: () => void;
};

/** The settings as a window over the app, like the settings of AnvilNote: sections on the left, the section on the right. */
export function SettingsDialog({ open, onOpenChange, hasProject, initialSection = "editor", onThesisSaved }: Props) {
  const { t } = useTranslation("settings");
  const [section, setSection] = useState<SettingsSection>(initialSection);
  const current = SECTIONS.find((s) => s.id === section) ?? SECTIONS[0]!;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton className="flex h-[min(80vh,720px)] w-[min(92vw,56rem)] max-w-none gap-0 overflow-hidden p-0 sm:max-w-none">
        <DialogTitle className="sr-only">{t("title")}</DialogTitle>
        <DialogDescription className="sr-only">{t("description")}</DialogDescription>
        <nav aria-label={t("title")} className="flex w-52 shrink-0 flex-col gap-1 border-r bg-muted/30 p-3">
          <p className="px-2 py-1.5 text-sm font-semibold">{t("title")}</p>
          {SECTIONS.map(({ id, icon: Icon }) => (
            <button
              key={id}
              type="button"
              aria-current={id === section ? "page" : undefined}
              onClick={() => setSection(id)}
              className={cn("flex h-8 items-center gap-2 rounded-md px-2 text-left text-sm hover:bg-muted", id === section && "bg-muted font-medium")}
            >
              <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
              {t(`nav.${id}`)}
            </button>
          ))}
        </nav>
        <section className="min-w-0 flex-1 overflow-y-auto p-6" aria-label={t(`nav.${current.id}`)}>
          <h2 className="mb-4 text-lg font-semibold tracking-tight">{t(`nav.${current.id}`)}</h2>
          {current.needsProject && !hasProject ? (
            <p className="text-sm text-muted-foreground">{t("noProject")}</p>
          ) : section === "editor" ? (
            <EditorBasicSettings />
          ) : section === "editorAdvanced" ? (
            <EditorAdvancedSettings />
          ) : section === "thesis" ? (
            <ConfigForm embedded onSaved={onThesisSaved} />
          ) : (
            <AdvancedForm onSaved={onThesisSaved} />
          )}
        </section>
      </DialogContent>
    </Dialog>
  );
}
