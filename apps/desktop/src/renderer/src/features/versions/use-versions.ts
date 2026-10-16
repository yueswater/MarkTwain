import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { IpcChannel } from "../../../../shared/enums/ipc-channel.enum";
import type { VersionEntry, VersionStatus } from "../../../../shared/ipc";
import { api } from "../../shared/api";
import { errorMessage } from "../../shared/error-message";

type Options = {
  /** Changes with the project that is open, the versions are read again for another one */
  projectKey: string | null;
  /** Grows whenever a document was saved, the dot for unsaved changes follows it */
  saveTick: number;
  /** Saves what is being typed at once, before something reads or replaces the documents */
  flush: () => Promise<void>;
  /** Called after the documents were replaced by a version or a branch, so that the editor shows them */
  onReplaced: () => Promise<void>;
};

/** The versions of the open project: the branch that is open, whether it has changes, and the operations. */
export function useVersions({ projectKey, saveTick, flush, onReplaced }: Options) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<VersionStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const flushRef = useRef(flush);
  flushRef.current = flush;
  const replacedRef = useRef(onReplaced);
  replacedRef.current = onReplaced;

  const refresh = useCallback(async () => {
    try {
      setStatus(await api.invoke(IpcChannel.VersionStatus));
    } catch {
      // The dot is a help, a failure is not worth a message
    }
  }, []);

  // A project that opens, and a document that was saved a moment ago
  useEffect(() => {
    if (projectKey === null) {
      setStatus(null);
      return;
    }
    const timer = setTimeout(() => void refresh(), 400);
    return () => clearTimeout(timer);
  }, [projectKey, saveTick, refresh]);

  /** Runs an operation: what is typed is saved first, an error is kept for the dialog, and the editor is told when the documents were replaced. */
  const run = useCallback(
    async <T,>(operation: () => Promise<T>, replaces: boolean): Promise<T | undefined> => {
      setBusy(true);
      setError(null);
      try {
        await flushRef.current();
        const result = await operation();
        if (replaces) await replacedRef.current();
        return result;
      } catch (e) {
        setError(errorMessage(t, e));
        return undefined;
      } finally {
        setBusy(false);
      }
    },
    [t],
  );

  const save = useCallback(async (message: string) => run(async () => setStatus(await api.invoke(IpcChannel.VersionSave, { message })), false), [run]);
  const start = useCallback(async (name: string) => run(async () => setStatus(await api.invoke(IpcChannel.VersionBranchStart, { name })), false), [run]);
  const switchTo = useCallback(async (name: string) => run(async () => setStatus(await api.invoke(IpcChannel.VersionBranchSwitch, { name })), true), [run]);
  const discard = useCallback(async (name: string) => run(async () => setStatus(await api.invoke(IpcChannel.VersionBranchDiscard, { name })), true), [run]);
  const restore = useCallback(async (snapshotId: string, message: string) => run(async () => setStatus(await api.invoke(IpcChannel.VersionRestore, { snapshotId, message })), true), [run]);
  const history = useCallback(async (): Promise<VersionEntry[]> => (await run(() => api.invoke(IpcChannel.VersionHistory), false)) ?? [], [run]);

  return { status, error, busy, clearError: () => setError(null), refresh, run, save, start, switchTo, discard, restore, history };
}

export type Versions = ReturnType<typeof useVersions>;
