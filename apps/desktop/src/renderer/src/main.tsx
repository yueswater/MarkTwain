import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { IpcChannel } from "../../shared/enums/ipc-channel.enum";
import { App } from "./app/App";
import { api } from "./shared/api";
import { initI18n } from "./shared/i18n";

async function bootstrap(): Promise<void> {
  const { effective } = await api.invoke(IpcChannel.SettingsGetLocale);
  await initI18n(effective);
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void bootstrap();
