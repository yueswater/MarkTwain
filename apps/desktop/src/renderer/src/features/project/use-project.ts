import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { DocumentKind } from "../../../../shared/enums/document-kind.enum";
import { IpcChannel } from "../../../../shared/enums/ipc-channel.enum";
import type { ProjectInfo } from "../../../../shared/ipc";
import { api } from "../../shared/api";
import { errorMessage } from "../../shared/error-message";
import { projectNameFromPath } from "./document-title";

/** 目前開啟的專案與所有會改變它的動作；錯誤統一轉成目前語言的文字。 */
export function useProject() {
  const { t } = useTranslation();
  const [project, setProject] = useState<ProjectInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (action: () => Promise<void>): Promise<void> => {
      try {
        setError(null);
        await action();
      } catch (e) {
        setError(errorMessage(t, e));
      }
    },
    [t],
  );

  const refresh = useCallback(async () => {
    setProject(await api.invoke(IpcChannel.ProjectCurrent));
  }, []);

  useEffect(() => {
    void run(refresh).finally(() => setLoading(false));
    // 只在載入時取得一次
  }, []);

  const createProject = (suggestedName: string) =>
    run(async () => {
      const path = await api.invoke(IpcChannel.DialogChooseNewProject, { suggestedName });
      if (!path) return;
      setProject(await api.invoke(IpcChannel.ProjectCreate, { path, name: projectNameFromPath(path) }));
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
    });

  const addDocument = (kind: DocumentKind) =>
    run(async () => {
      await api.invoke(IpcChannel.DocumentCreate, { kind });
      await refresh();
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

  const renameDocument = (id: string, title: string) =>
    run(async () => {
      await api.invoke(IpcChannel.DocumentRename, { id, title });
      await refresh();
    });

  return {
    project,
    loading,
    error,
    createProject,
    openProject,
    closeProject,
    addDocument,
    removeDocument,
    moveDocument,
    renameDocument,
  };
}

export type ProjectState = ReturnType<typeof useProject>;
