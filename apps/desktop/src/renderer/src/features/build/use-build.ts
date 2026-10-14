import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { IpcChannel } from "../../../../shared/enums/ipc-channel.enum";
import type { BuildOutcome } from "../../../../shared/ipc";
import { api } from "../../shared/api";
import { errorMessage } from "../../shared/error-message";

export type BuildState = {
  building: boolean;
  outcome: BuildOutcome | null;
  error: string | null;
  run: () => Promise<void>;
  reset: () => void;
};

/** Runs the Typst build and keeps the latest outcome for the preview. */
export function useBuild(): BuildState {
  const { t } = useTranslation();
  const [building, setBuilding] = useState(false);
  const [outcome, setOutcome] = useState<BuildOutcome | null>(null);
  const [error, setError] = useState<string | null>(null);

  const running = useRef(false);
  const again = useRef(false);

  /** Builds now. A request that arrives during a build runs once more afterwards, so the last edit always shows. */
  const run = useCallback(async () => {
    if (running.current) {
      again.current = true;
      return;
    }
    running.current = true;
    setBuilding(true);
    try {
      do {
        again.current = false;
        setError(null);
        try {
          setOutcome(await api.invoke(IpcChannel.BuildTypst));
        } catch (e) {
          setError(errorMessage(t, e));
        }
      } while (again.current);
    } finally {
      running.current = false;
      setBuilding(false);
    }
  }, [t]);

  const reset = useCallback(() => {
    setOutcome(null);
    setError(null);
  }, []);

  return { building, outcome, error, run, reset };
}
