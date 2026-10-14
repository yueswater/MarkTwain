import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { IpcChannel } from "../../../shared/enums/ipc-channel.enum";
import type { EditorPrefs } from "../../../shared/ipc";
import { DEFAULT_PREFS } from "../../../shared/prefs";
import { api } from "../shared/api";

type PrefsContextValue = {
  prefs: EditorPrefs;
  /** Applies a change at once and saves it, the saved result replaces the guess */
  setPrefs: (patch: Partial<EditorPrefs>) => void;
};

const PrefsContext = createContext<PrefsContextValue>({ prefs: DEFAULT_PREFS, setPrefs: () => undefined });

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [prefs, setState] = useState<EditorPrefs>(DEFAULT_PREFS);

  useEffect(() => {
    api.invoke(IpcChannel.PrefsGet).then(setState).catch(() => undefined);
  }, []);

  const setPrefs = useCallback((patch: Partial<EditorPrefs>) => {
    setState((current) => ({ ...current, ...patch }));
    api.invoke(IpcChannel.PrefsSet, { patch }).then(setState).catch(() => undefined);
  }, []);

  const value = useMemo(() => ({ prefs, setPrefs }), [prefs, setPrefs]);
  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}

export function usePrefs(): PrefsContextValue {
  return useContext(PrefsContext);
}
