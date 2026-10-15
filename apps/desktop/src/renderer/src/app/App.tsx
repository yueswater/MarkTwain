import { useTranslation } from "react-i18next";
import { MenuCommand } from "../../../shared/ipc/menu";
import { IpcChannel } from "../../../shared/enums/ipc-channel.enum";
import type { Locale } from "../../../shared/enums/locale.enum";
import { useBuild } from "../features/build/use-build";
import { useProject } from "../features/project/use-project";
import { NewProjectDialog } from "../features/project/NewProjectDialog";
import { WelcomeScreen } from "../features/project/WelcomeScreen";
import { Workspace } from "../features/project/Workspace";
import { api } from "../shared/api";
import { errorMessage } from "../shared/error-message";
import { useEffect, useRef, useState } from "react";
import { SettingsDialog } from "../features/settings/SettingsDialog";
import { ShortcutsDialog } from "../features/shortcuts/ShortcutsDialog";
import { AppShell } from "./AppShell";

export function App() {
  const { t, i18n } = useTranslation();
  const state = useProject();
  const build = useBuild();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  // Grows whenever a document or the thesis settings were saved, the preview watches it
  const [saveTick, setSaveTick] = useState(0);
  const bumpSaved = () => setSaveTick((n) => n + 1);
  const [localeError, setLocaleError] = useState<string | null>(null);

  async function changeLocale(locale: Locale): Promise<void> {
    try {
      const { effective } = await api.invoke(IpcChannel.SettingsSetLocale, { setting: locale });
      await i18n.changeLanguage(effective);
      setLocaleError(null);
    } catch (e) {
      setLocaleError(errorMessage(t, e));
    }
  }

  // Native menu File commands, a ref keeps the latest state so the subscription is not repeated on every render
  const stateRef = useRef(state);
  stateRef.current = state;
  useEffect(
    () =>
      window.marktwain.onMenuCommand((command) => {
        const current = stateRef.current;
        if (command === MenuCommand.NewProject) void current.createProject(t("welcome.defaultName", { ns: "project" }));
        else if (command === MenuCommand.OpenProject) void current.openProject();
        else if (command === MenuCommand.CloseProject) void current.closeProject();
        else if (command === MenuCommand.Shortcuts) setShortcutsOpen(true);
      }),
    [t],
  );

  // Ctrl or Cmd plus comma opens the settings, as in most apps, and plus Shift and P shows or hides the preview
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.isComposing) return;
      if ((event.ctrlKey || event.metaKey) && event.key === ",") {
        event.preventDefault();
        setSettingsOpen(true);
      } else if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "p" && stateRef.current.project) {
        event.preventDefault();
        setPreviewOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const error = state.error ?? localeError;

  return (
    <AppShell
      projectName={state.project?.name ?? null}
      onCloseProject={() => {
        setPreviewOpen(false);
        build.reset();
        void state.closeProject();
      }}
      onTogglePreview={state.project ? () => setPreviewOpen((open) => !open) : null}
      previewOpen={previewOpen}
      onOpenSettings={() => setSettingsOpen(true)}
      onLocaleChange={(locale) => void changeLocale(locale)}
    >
      {error && (
        <p role="alert" className="border-b bg-destructive/5 px-4 py-2 text-sm text-destructive select-text">
          {error}
        </p>
      )}
      {/* The page never scrolls, each panel scrolls inside this frame */}
      <div className="relative min-h-0 flex-1">
        <div className="absolute inset-0 overflow-hidden">
        {state.loading ? null : state.project ? (
          <Workspace
            state={state}
            build={build}
            previewOpen={previewOpen}
            onClosePreview={() => setPreviewOpen(false)}
            onOpenSettings={() => setSettingsOpen(true)}
            saveTick={saveTick}
            onSaved={bumpSaved}
          />
        ) : (
          <WelcomeScreen
            recent={state.recent}
            onOpenRecent={(path) => void state.openRecent(path)}
            onRemoveRecent={(path) => void state.removeRecent(path)}
            onCreate={(name) => void state.createProject(name)}
            onOpen={() => void state.openProject()}
          />
        )}
        </div>
      </div>
      {state.project && state.justCreated && <NewProjectDialog onClose={state.finishCreation} />}
      <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        hasProject={state.project !== null}
        onThesisSaved={bumpSaved}
      />
    </AppShell>
  );
}
