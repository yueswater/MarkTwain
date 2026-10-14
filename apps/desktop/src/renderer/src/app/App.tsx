import { useTranslation } from "react-i18next";
import { MenuCommand } from "../../../shared/ipc/menu";
import { IpcChannel } from "../../../shared/enums/ipc-channel.enum";
import type { Locale } from "../../../shared/enums/locale.enum";
import { useBuild } from "../features/build/use-build";
import { useProject } from "../features/project/use-project";
import { WelcomeScreen } from "../features/project/WelcomeScreen";
import { Workspace } from "../features/project/Workspace";
import { api } from "../shared/api";
import { errorMessage } from "../shared/error-message";
import { useEffect, useRef, useState } from "react";
import { AppShell } from "./AppShell";

export function App() {
  const { t, i18n } = useTranslation();
  const state = useProject();
  const build = useBuild();
  const [previewOpen, setPreviewOpen] = useState(false);
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
      }),
    [t],
  );

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
      onLocaleChange={(locale) => void changeLocale(locale)}
    >
      {error && (
        <p role="alert" className="border-b bg-destructive/5 px-4 py-2 text-sm text-destructive select-text">
          {error}
        </p>
      )}
      <div className="min-h-0 flex-1">
        {state.loading ? null : state.project ? (
          <Workspace state={state} build={build} previewOpen={previewOpen} onClosePreview={() => setPreviewOpen(false)} />
        ) : (
          <WelcomeScreen
            onCreate={(name) => void state.createProject(name)}
            onOpen={() => void state.openProject()}
          />
        )}
      </div>
    </AppShell>
  );
}
