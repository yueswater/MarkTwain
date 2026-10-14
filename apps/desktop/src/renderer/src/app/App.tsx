import Alert from "@mui/material/Alert";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { IpcChannel } from "../../../shared/enums/ipc-channel.enum";
import type { Locale } from "../../../shared/enums/locale.enum";
import type { AppInfo } from "../../../shared/ipc";
import { api } from "../shared/api";
import { errorMessage } from "../shared/error-message";
import { AppShell } from "./AppShell";

export function App() {
  const { t, i18n } = useTranslation();
  const [info, setInfo] = useState<AppInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .invoke(IpcChannel.AppInfo)
      .then(setInfo)
      .catch((e: unknown) => setError(errorMessage(t, e)));
    // 只在載入時取得一次
  }, []);

  async function changeLocale(locale: Locale): Promise<void> {
    try {
      const { effective } = await api.invoke(IpcChannel.SettingsSetLocale, { setting: locale });
      await i18n.changeLanguage(effective);
      setError(null);
    } catch (e) {
      setError(errorMessage(t, e));
    }
  }

  return (
    <AppShell onLocaleChange={(locale) => void changeLocale(locale)}>
      <Card variant="outlined">
        <CardContent sx={{ display: "grid", gap: 2 }}>
          <Typography variant="h2" component="h2">
            {t("app.tagline")}
          </Typography>
          {info && (
            <div>
              <Chip
                label={t("app.version", { version: info.version, platform: info.platform })}
                sx={{ bgcolor: "tertiary.container", color: "tertiary.onContainer" }}
              />
            </div>
          )}
          {error && <Alert severity="error">{error}</Alert>}
        </CardContent>
      </Card>
    </AppShell>
  );
}
