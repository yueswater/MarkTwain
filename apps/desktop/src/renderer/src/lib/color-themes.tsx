import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { IpcChannel } from "../../../shared/enums/ipc-channel.enum";
import type { ColorThemeView } from "../../../shared/ipc";
import { DEFAULT_COLOR_THEME } from "../../../shared/prefs";
import { api } from "../shared/api";
import { applyColorTheme } from "./color-theme";
import { usePrefs } from "./prefs";

type ColorThemesValue = {
  themes: ColorThemeView[];
  /** Asks for a theme file and adds it, the new theme is returned, null when cancelled */
  importTheme: () => Promise<ColorThemeView | null>;
  removeTheme: (id: string) => Promise<void>;
};

const ColorThemesContext = createContext<ColorThemesValue>({ themes: [], importTheme: async () => null, removeTheme: async () => undefined });

/** Loads the themes and keeps the one that is chosen on the page. A theme that is gone is the look of the app. */
export function ColorThemeProvider({ children }: { children: ReactNode }) {
  const { prefs, setPrefs } = usePrefs();
  const [themes, setThemes] = useState<ColorThemeView[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api
      .invoke(IpcChannel.ColorThemeList)
      .then(setThemes)
      .catch(() => undefined)
      .finally(() => setLoaded(true));
  }, []);

  const chosen = prefs.colorTheme === DEFAULT_COLOR_THEME ? null : (themes.find((theme) => theme.id === prefs.colorTheme) ?? null);
  useEffect(() => {
    // Before the list is there the choice is not known to be a gone one
    if (loaded || chosen) applyColorTheme(chosen);
  }, [chosen, loaded]);

  const importTheme = useCallback(async () => {
    const imported = await api.invoke(IpcChannel.ColorThemeImport);
    if (imported) setThemes((current) => [...current, imported]);
    return imported;
  }, []);

  const removeTheme = useCallback(
    async (id: string) => {
      await api.invoke(IpcChannel.ColorThemeRemove, { id });
      setThemes((current) => current.filter((theme) => theme.id !== id));
      if (prefs.colorTheme === id) setPrefs({ colorTheme: DEFAULT_COLOR_THEME });
    },
    [prefs.colorTheme, setPrefs],
  );

  const value = useMemo(() => ({ themes, importTheme, removeTheme }), [themes, importTheme, removeTheme]);
  return <ColorThemesContext.Provider value={value}>{children}</ColorThemesContext.Provider>;
}

export function useColorThemes(): ColorThemesValue {
  return useContext(ColorThemesContext);
}
