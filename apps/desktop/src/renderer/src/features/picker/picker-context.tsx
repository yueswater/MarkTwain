import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { IpcChannel } from "../../../../shared/enums/ipc-channel.enum";
import { api } from "../../shared/api";
import { FilePicker, type PickRequest } from "./FilePicker";

type PickerValue = {
  /** The path that the person chooses in the picker of the app, or the one of the test hook, null when the person cancels */
  choosePath: (request: PickRequest) => Promise<string | null>;
};

const PickerContext = createContext<PickerValue>({ choosePath: async () => null });

/** Holds the picker of the app, so a new project, an open project and an export all ask the same one. */
export function PickerProvider({ children }: { children: ReactNode }) {
  const [picking, setPicking] = useState<(PickRequest & { resolve: (path: string | null) => void }) | null>(null);

  const choosePath = useCallback(async (request: PickRequest): Promise<string | null> => {
    const exporting = request.mode === "save" && request.purpose === "export";
    const forced = await api.invoke(exporting ? IpcChannel.DialogForcedExportPath : IpcChannel.DialogForcedProjectPath);
    if (forced) return forced;
    return new Promise((resolve) => setPicking({ ...request, resolve }));
  }, []);

  const answer = useCallback((path: string | null) => {
    setPicking((current) => {
      current?.resolve(path);
      return null;
    });
  }, []);

  const value = useMemo(() => ({ choosePath }), [choosePath]);
  return (
    <PickerContext.Provider value={value}>
      {children}
      {picking && <FilePicker request={picking} onAnswer={answer} />}
    </PickerContext.Provider>
  );
}

export function usePicker(): PickerValue {
  return useContext(PickerContext);
}
