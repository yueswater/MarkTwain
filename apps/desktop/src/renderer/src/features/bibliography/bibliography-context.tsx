import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { IpcChannel } from "../../../../shared/enums/ipc-channel.enum";
import type { BibEntryInput, BibImportOutcome, BibliographyView } from "../../../../shared/ipc";
import { api } from "../../shared/api";
import { errorMessage } from "../../shared/error-message";

const EMPTY: BibliographyView = { text: "", items: [], errors: [], duplicates: [], unknown: [] };

export type BibliographyState = {
  view: BibliographyView;
  /** Message of the last failed action, null when it went well */
  error: string | null;
  refresh: () => Promise<void>;
  setText: (text: string) => Promise<boolean>;
  upsert: (entry: BibEntryInput, originalKey: string | null) => Promise<boolean>;
  remove: (key: string) => Promise<boolean>;
  importFile: (name: string, text: string) => Promise<BibImportOutcome | null>;
};

const Context = createContext<BibliographyState | null>(null);

type ProviderProps = {
  /** Grows whenever a document was saved, the places where entries are cited change with it */
  saveTick: number;
  children: ReactNode;
};

/** Keeps the bibliography of the open project for the manager and the editor. */
export function BibliographyProvider({ saveTick, children }: ProviderProps) {
  const { t } = useTranslation();
  const [view, setView] = useState<BibliographyView>(EMPTY);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setView(await api.invoke(IpcChannel.BibliographyGet));
    } catch {
      // The editor still works without it, citations just stay unchecked
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh, saveTick]);

  const act = useCallback(
    async <T,>(action: () => Promise<T>): Promise<T | null> => {
      try {
        const result = await action();
        setError(null);
        return result;
      } catch (e) {
        setError(errorMessage(t, e));
        return null;
      }
    },
    [t],
  );

  const state = useMemo<BibliographyState>(
    () => ({
      view,
      error,
      refresh,
      setText: async (text) => {
        const next = await act(() => api.invoke(IpcChannel.BibliographySetText, { text }));
        if (next) setView(next);
        return next !== null;
      },
      upsert: async (entry, originalKey) => {
        const next = await act(() => api.invoke(IpcChannel.BibliographyUpsert, { entry, originalKey }));
        if (next) setView(next);
        return next !== null;
      },
      remove: async (key) => {
        const next = await act(() => api.invoke(IpcChannel.BibliographyRemove, { key }));
        if (next) setView(next);
        return next !== null;
      },
      importFile: async (name, text) => {
        const outcome = await act(() => api.invoke(IpcChannel.BibliographyImport, { name, text }));
        if (outcome) setView(outcome.view);
        return outcome;
      },
    }),
    [view, error, refresh, act],
  );

  return <Context.Provider value={state}>{children}</Context.Provider>;
}

/** The bibliography of the project, an empty one when no provider is above. */
export function useBibliography(): BibliographyState {
  const state = useContext(Context);
  if (state) return state;
  const noop = async () => false;
  return { view: EMPTY, error: null, refresh: async () => undefined, setText: noop, upsert: noop, remove: noop, importFile: async () => null };
}
