import { FileTextIcon, LanguagesIcon, SettingsIcon, XIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import logo from "@/assets/logo.png";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SUPPORTED_LOCALES, type Locale } from "../../../shared/enums/locale.enum";

type Props = {
  children: ReactNode;
  /** Name of the open project, null when none is open */
  projectName: string | null;
  onCloseProject: () => void;
  /** Shown only while a project is open */
  onTogglePreview: (() => void) | null;
  previewOpen: boolean;
  onOpenSettings: () => void;
  onLocaleChange: (locale: Locale) => void;
};

/** Top bar with brand, project name and language menu, then the content area. The look follows the AnvilNote monochrome language. All text goes through i18n. */
export function AppShell({
  children,
  projectName,
  onCloseProject,
  onTogglePreview,
  previewOpen,
  onOpenSettings,
  onLocaleChange,
}: Props) {
  const { t, i18n } = useTranslation();

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
        <img src={logo} alt="" className="size-7" />
        <h1 className="text-sm font-semibold tracking-tight">{t("app.name")}</h1>
        {projectName !== null && (
          <>
            <span className="text-muted-foreground" aria-hidden="true">
              /
            </span>
            <span className="max-w-64 truncate text-sm">{projectName}</span>
            <Button variant="ghost" size="sm" onClick={onCloseProject}>
              <XIcon aria-hidden="true" />
              {t("workspace.close", { ns: "project" })}
            </Button>
          </>
        )}
        <div className="ml-auto flex items-center gap-2">
          {onTogglePreview && (
            <Button variant={previewOpen ? "secondary" : "outline"} size="sm" aria-pressed={previewOpen} onClick={onTogglePreview}>
              <FileTextIcon aria-hidden="true" />
              {t("preview", { ns: "build" })}
            </Button>
          )}
          <Button variant="ghost" size="icon-sm" aria-label={t("open", { ns: "config" })} title={t("open", { ns: "config" })} onClick={onOpenSettings}>
            <SettingsIcon aria-hidden="true" />
          </Button>
          <LanguagesIcon className="size-4 text-muted-foreground" aria-hidden="true" />
          <Select value={i18n.language} onValueChange={(value) => onLocaleChange(value as Locale)}>
            <SelectTrigger size="sm" aria-label={t("settings.language")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              {SUPPORTED_LOCALES.map((locale) => (
                <SelectItem key={locale} value={locale}>
                  {t(`settings.locale.${locale}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </header>
      <main className="flex min-h-0 flex-1 flex-col">{children}</main>
    </div>
  );
}
