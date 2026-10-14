import { useEffect, useState } from "react";
import { IpcChannel } from "../../../../shared/enums/ipc-channel.enum";
import type { LabelIndex } from "../../../../shared/ipc";
import { api } from "../../shared/api";
import type { SaveStatus } from "./autosaver";

/** Sent on the window when the numbers have to be read again. */
export const LABELS_CHANGED = "marktwain:labels-changed";

const EMPTY: LabelIndex = { numbers: {}, broken: [], duplicates: [], targets: [], statementBases: {}, used: [] };

/** Labels and numbers of the project, updated on load and after every save. The back end scans saved documents. */
export function useLabelIndex(status: SaveStatus): LabelIndex {
  const [index, setIndex] = useState<LabelIndex>(EMPTY);
  // Something outside the document changed the numbers, for example the numbering setting
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const bump = () => setVersion((value) => value + 1);
    window.addEventListener(LABELS_CHANGED, bump);
    return () => window.removeEventListener(LABELS_CHANGED, bump);
  }, []);

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
  }, [status, version]);

  return index;
}
