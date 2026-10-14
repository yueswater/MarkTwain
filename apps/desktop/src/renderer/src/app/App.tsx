import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
      <Card>
        <CardHeader>
          <h2 className="text-2xl font-semibold tracking-tight">{t("app.tagline")}</h2>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {info && (
            <div>
              <Badge variant="secondary">
                {t("app.version", { version: info.version, platform: info.platform })}
              </Badge>
            </div>
          )}
          {error && (
            <p role="alert" className="text-sm text-destructive select-text">
              {error}
            </p>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
