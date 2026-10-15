import { useEffect, useState } from "react";
import { resolveListLevels } from "@marktwain/schema";
import { IpcChannel } from "../../../../../shared/enums/ipc-channel.enum";
import { api } from "../../../shared/api";
import { LABELS_CHANGED } from "../references/use-label-index";

export type ListLevelsState = { ordered: string[] | null; bullet: string[] | null };

/** The markers that the thesis settings give to the levels of lists, read again when a setting is saved. */
export function useListLevels(): ListLevelsState {
  const [levels, setLevels] = useState<ListLevelsState>({ ordered: null, bullet: null });
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const bump = () => setVersion((value) => value + 1);
    window.addEventListener(LABELS_CHANGED, bump);
    return () => window.removeEventListener(LABELS_CHANGED, bump);
  }, []);
  useEffect(() => {
    let cancelled = false;
    api
      .invoke(IpcChannel.ConfigGetAdvanced)
      .then((state) => {
        if (cancelled) return;
        setLevels(resolveListLevels({ ordered: state.values["lists.ordered"], bullet: state.values["lists.bullet"] }));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [version]);
  return levels;
}
