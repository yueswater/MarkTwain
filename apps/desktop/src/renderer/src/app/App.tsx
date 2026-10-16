import { useTranslation } from "react-i18next";
import { MenuCommand } from "../../../shared/ipc/menu";
import { IpcChannel } from "../../../shared/enums/ipc-channel.enum";
import type { Locale } from "../../../shared/enums/locale.enum";
import { useBuild } from "../features/build/use-build";
import { useProject } from "../features/project/use-project";
import { EngineDialog } from "../features/project/welcome/EngineDialog";
import { NewProjectDialog } from "../features/project/welcome/NewProjectDialog";
import { WelcomeScreen } from "../features/project/welcome/WelcomeScreen";
import { Workspace } from "../features/project/Workspace";
import { BranchBar } from "../features/versions/BranchBar";
import { useVersions } from "../features/versions/use-versions";
import { api } from "../shared/api";
import { errorMessage } from "../shared/error-message";
import { useEffect, useRef, useState } from "react";
import { SettingsDialog } from "../features/settings/SettingsDialog";
import type { SettingsPageId } from "../features/settings/settings-pages";
import { ShortcutsDialog } from "../features/shortcuts/ShortcutsDialog";
import { AppShell } from "./AppShell";

export function App() {
  const { t, i18n } = useTranslation();
  const state = useProject();
  const build = useBuild();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  // The page that the settings open at when something sent the person there, null keeps the page that was open last
  const [settingsPage, setSettingsPage] = useState<SettingsPageId | undefined>(undefined);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  // Grows whenever a document or the thesis settings were saved, the preview watches it
  const [saveTick, setSaveTick] = useState(0);
  const bumpSaved = () => setSaveTick((n) => n + 1);
  // Saves what is typed in the editor at once, the editor gives it to the ref
  const flushRef = useRef<(() => Promise<void>) | null>(null);
  // Grows when the documents were replaced by a version or a branch, the editor is made again for them
  const [generation, setGeneration] = useState(0);
  const versions = useVersions({
    projectKey: state.project?.path ?? null,
    saveTick,
    flush: async () => {
      await flushRef.current?.();
    },
    onReplaced: async () => {
      await state.refresh();
      setGeneration((n) => n + 1);
      bumpSaved();
    },
  });
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
        if (command === MenuCommand.NewProject) current.beginCreate();
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
      branchBar={state.project ? <BranchBar versions={versions} /> : null}
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
            onOpenSettings={(page) => {
              setSettingsPage(page);
              setSettingsOpen(true);
            }}
            saveTick={saveTick}
            flushRef={flushRef}
            generation={generation}
            versionKey={versions.status?.headId ?? null}
            onSaved={bumpSaved}
          />
        ) : (
          <WelcomeScreen
            recent={state.recent}
            onOpenRecent={(path) => void state.openRecent(path)}
            onRemoveRecent={(path) => void state.removeRecent(path)}
            onCreate={state.beginCreate}
            onOpen={() => void state.openProject()}
          />
        )}
        </div>
      </div>
      <EngineDialog
        open={state.choosingEngine}
        onCancel={state.cancelCreate}
        onConfirm={(engine) => void state.createProject(t("welcome.defaultName", { ns: "project" }), engine)}
      />
      {state.project && state.justCreated && <NewProjectDialog onClose={state.finishCreation} />}
      <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
      <SettingsDialog
        open={settingsOpen}
        initialPage={settingsPage}
        onOpenChange={(open) => {
          setSettingsOpen(open);
          if (!open) setSettingsPage(undefined);
        }}
        hasProject={state.project !== null}
        onThesisSaved={bumpSaved}
      />
    </AppShell>
  );
}
