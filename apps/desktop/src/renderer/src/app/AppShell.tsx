import { FileTextIcon, LanguagesIcon, SettingsIcon, XIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { withShortcut } from "@/lib/shortcut-label";
import logo from "@/assets/logo.png";
import { Button } from "@/components/ui/button";
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
  /** Next to the name of the project, the branch that is open */
  branchBar?: ReactNode;
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
  branchBar,
  onLocaleChange,
}: Props) {
  const { t, i18n } = useTranslation();
  // The languages are few, so one icon switches to the next one
  const next = SUPPORTED_LOCALES[(SUPPORTED_LOCALES.indexOf(i18n.language as Locale) + 1) % SUPPORTED_LOCALES.length]!;

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
            {branchBar}
            <Button variant="ghost" size="sm" onClick={onCloseProject}>
              <XIcon aria-hidden="true" />
              {t("workspace.close", { ns: "project" })}
            </Button>
          </>
        )}
        <div className="ml-auto flex items-center gap-1">
          {onTogglePreview && (
            <Button variant={previewOpen ? "secondary" : "ghost"} size="sm" aria-pressed={previewOpen} title={withShortcut(t("preview", { ns: "build" }), "togglePreview")} onClick={onTogglePreview}>
              <FileTextIcon aria-hidden="true" />
              {t("preview", { ns: "build" })}
            </Button>
          )}
          {/* With a project open the settings are at the bottom of the sidebar, without one this is the way in */}
          {projectName === null && (
            <Button variant="ghost" size="icon-sm" aria-label={t("open", { ns: "config" })} title={t("open", { ns: "config" })} onClick={onOpenSettings}>
              <SettingsIcon aria-hidden="true" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            data-testid="language-toggle"
            aria-label={t("settings.switchTo", { language: t(`settings.locale.${next}`) })}
            title={t("settings.switchTo", { language: t(`settings.locale.${next}`) })}
            onClick={() => onLocaleChange(next)}
          >
            <LanguagesIcon aria-hidden="true" />
          </Button>
        </div>
      </header>
      <main className="flex min-h-0 flex-1 flex-col">{children}</main>
    </div>
  );
}
