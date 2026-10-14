import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { IpcChannel } from "../../../shared/enums/ipc-channel.enum";
import { Locale, SUPPORTED_LOCALES } from "../../../shared/enums/locale.enum";
import type { AppInfo } from "../../../shared/ipc";
import { api } from "../shared/api";
import { errorMessage } from "../shared/error-message";

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
    <main style={{ padding: 32 }}>
      <h1>{t("app.name")}</h1>
      <p>{t("app.tagline")}</p>
      {info && <p>{t("app.version", { version: info.version, platform: info.platform })}</p>}
      <label>
        {t("settings.language")}{" "}
        <select
          value={i18n.language}
          onChange={(event) => void changeLocale(event.target.value as Locale)}
        >
          {SUPPORTED_LOCALES.map((locale) => (
            <option key={locale} value={locale}>
              {t(`settings.locale.${locale}`)}
            </option>
          ))}
        </select>
      </label>
      {error && <p role="alert">{error}</p>}
    </main>
  );
}
