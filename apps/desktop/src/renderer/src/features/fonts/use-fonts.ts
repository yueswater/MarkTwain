import { useCallback, useEffect, useState } from "react";
import { IpcChannel } from "../../../../shared/enums/ipc-channel.enum";
import type { FontAddResult, FontRemoveResult, FontsView } from "../../../../shared/ipc";
import { LABELS_CHANGED } from "../editor/use-label-index";
import { api } from "../../shared/api";

const EMPTY: FontsView = { families: [], missing: [], projectBytes: 0 };

/** The fonts of the template, the project and the computer, with what the thesis settings use. */
export function useFonts() {
  const [view, setView] = useState<FontsView>(EMPTY);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(() => {
    api
      .invoke(IpcChannel.FontList)
      .then((next) => {
        setView(next);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  useEffect(() => {
    reload();
    // The settings can name a font, which changes what is used and what is missing
    window.addEventListener(LABELS_CHANGED, reload);
    return () => window.removeEventListener(LABELS_CHANGED, reload);
  }, [reload]);

  /** Reads the files and stores them in the project. */
  const add = useCallback(async (files: File[]): Promise<FontAddResult> => {
    const input = await Promise.all(files.map(async (file) => ({ name: file.name, data: new Uint8Array(await file.arrayBuffer()) })));
    const result = await api.invoke(IpcChannel.FontAdd, { files: input });
    setView(result.view);
    window.dispatchEvent(new Event(LABELS_CHANGED));
    return result;
  }, []);

  const remove = useCallback(async (family: string, force: boolean): Promise<FontRemoveResult> => {
    const result = await api.invoke(IpcChannel.FontRemove, { family, force });
    setView(result.view);
    window.dispatchEvent(new Event(LABELS_CHANGED));
    return result;
  }, []);

  return { view, loaded, add, remove, reload };
}
