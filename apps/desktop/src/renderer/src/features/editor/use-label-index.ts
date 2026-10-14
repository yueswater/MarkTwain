import { useEffect, useState } from "react";
import { IpcChannel } from "../../../../shared/enums/ipc-channel.enum";
import type { LabelIndex } from "../../../../shared/ipc";
import { api } from "../../shared/api";
import type { SaveStatus } from "./autosaver";

const EMPTY: LabelIndex = { numbers: {}, broken: [], duplicates: [], targets: [], used: [] };

/** Labels and numbers of the project, updated on load and after every save. The back end scans saved documents. */
export function useLabelIndex(status: SaveStatus): LabelIndex {
  const [index, setIndex] = useState<LabelIndex>(EMPTY);

  useEffect(() => {
    if (status !== "idle" && status !== "saved") return;
    let cancelled = false;
    api
      .invoke(IpcChannel.LabelResolve)
      .then((next) => !cancelled && setIndex(next))
      .catch(() => undefined); // Preview data, on failure keep the old one and do not interrupt editing
    return () => {
      cancelled = true;
    };
  }, [status]);

  return index;
}
