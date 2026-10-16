import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { DocumentKind } from "../../../../shared/enums/document-kind.enum";
import { IpcChannel } from "../../../../shared/enums/ipc-channel.enum";
import type { OutputEngine, ProjectInfo, RecentProject } from "../../../../shared/ipc";
import { api } from "../../shared/api";
import { errorMessage } from "../../shared/error-message";
import { projectNameFromPath } from "./sidebar/document-title";

/** The open project and every action that changes it, errors become text in the current language. */
export function useProject() {
  const { t } = useTranslation();
  const [project, setProject] = useState<ProjectInfo | null>(null);
  const [recent, setRecent] = useState<RecentProject[]>([]);
  const [loading, setLoading] = useState(true);
  // True right after a project was made, the dialog about the thesis is shown until it is done
  const [justCreated, setJustCreated] = useState(false);
  // True while the engine of a new project is asked, it cannot be changed once the project exists
  const [choosingEngine, setChoosingEngine] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const finishCreation = useCallback(() => setJustCreated(false), []);
  const beginCreate = useCallback(() => setChoosingEngine(true), []);
  const cancelCreate = useCallback(() => setChoosingEngine(false), []);

  const run = useCallback(
    async <T,>(action: () => Promise<T>): Promise<T | undefined> => {
      try {
        setError(null);
        return await action();
      } catch (e) {
        setError(errorMessage(t, e));
        return undefined;
      }
    },
    [t],
  );

  const refresh = useCallback(async () => {
    setProject(await api.invoke(IpcChannel.ProjectCurrent));
  }, []);

  const refreshRecent = useCallback(async () => {
    setRecent(await api.invoke(IpcChannel.RecentList));
  }, []);

  useEffect(() => {
    // Reopen the project of the last session, unless the user closed it on purpose
    void run(async () => {
      await refresh();
      const open = await api.invoke(IpcChannel.ProjectCurrent);
      if (!open) setProject(await api.invoke(IpcChannel.ProjectResume));
      await refreshRecent();
    }).finally(() => setLoading(false));
    // Fetch once on load
  }, []);

  const createProject = (suggestedName: string, engine: OutputEngine) =>
    run(async () => {
      setChoosingEngine(false);
      const path = await api.invoke(IpcChannel.DialogChooseNewProject, { suggestedName });
      if (!path) return;
      setProject(await api.invoke(IpcChannel.ProjectCreate, { path, name: projectNameFromPath(path), engine }));
      setJustCreated(true);
      await refreshRecent();
    });

  const openRecent = (path: string) =>
    run(async () => {
      setProject(await api.invoke(IpcChannel.ProjectOpen, { path }));
    });

  const removeRecent = (path: string) =>
    run(async () => {
      setRecent(await api.invoke(IpcChannel.RecentRemove, { path }));
    });

  const openProject = () =>
    run(async () => {
      const path = await api.invoke(IpcChannel.DialogChooseOpenProject);
      if (!path) return;
      setProject(await api.invoke(IpcChannel.ProjectOpen, { path }));
    });

  const closeProject = () =>
    run(async () => {
      await api.invoke(IpcChannel.ProjectClose);
      setProject(null);
      await refreshRecent();
    });

  /** Makes a document and returns its id, so the editor can open it. */
  const addDocument = (kind: DocumentKind) =>
    run(async () => {
      const created = await api.invoke(IpcChannel.DocumentCreate, { kind });
      await refresh();
      return created.id;
    });

  const removeDocument = (id: string) =>
    run(async () => {
      await api.invoke(IpcChannel.DocumentDelete, { id });
      await refresh();
    });

  const moveDocument = (id: string, delta: -1 | 1) =>
    run(async () => {
      await api.invoke(IpcChannel.DocumentMove, { id, delta });
      await refresh();
    });

  const reorderDocument = (id: string, targetId: string, placement: "before" | "after") =>
    run(async () => {
      await api.invoke(IpcChannel.DocumentReorder, { id, targetId, placement });
      await refresh();
    });

  const renameDocument = (id: string, title: string) =>
    run(async () => {
      await api.invoke(IpcChannel.DocumentRename, { id, title });
      await refresh();
    });

  return {
    project,
    recent,
    openRecent,
    removeRecent,
    loading,
    error,
    justCreated,
    finishCreation,
    choosingEngine,
    beginCreate,
    cancelCreate,
    refresh,
    createProject,
    openProject,
    closeProject,
    addDocument,
    removeDocument,
    moveDocument,
    renameDocument,
    reorderDocument,
  };
}

export type ProjectState = ReturnType<typeof useProject>;
