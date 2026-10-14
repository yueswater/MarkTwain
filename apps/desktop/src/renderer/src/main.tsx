import "@fontsource-variable/noto-sans-tc";
import "@fontsource-variable/noto-serif-tc";
import "./app/global.css";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { IpcChannel } from "../../shared/enums/ipc-channel.enum";
import { App } from "./app/App";
import { api } from "./shared/api";
import { initI18n } from "./shared/i18n";
import { theme } from "./theme/theme";

async function bootstrap(): Promise<void> {
  const { effective } = await api.invoke(IpcChannel.SettingsGetLocale);
  await initI18n(effective);
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <App />
      </ThemeProvider>
    </StrictMode>,
  );
}

void bootstrap();
