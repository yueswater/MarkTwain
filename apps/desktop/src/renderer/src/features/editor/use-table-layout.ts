import { useEffect, useState } from "react";
import { IpcChannel } from "../../../../shared/enums/ipc-channel.enum";
import { api } from "../../shared/api";
import { LABELS_CHANGED } from "./use-label-index";

export type TableLayoutSettings = {
  position: "top" | "bottom";
  /** The word before the number of a table, the language of the thesis decides */
  prefix: string;
};

const DEFAULT: TableLayoutSettings = { position: "bottom", prefix: "表" };

/** Where the caption of a table goes and what it starts with, from the settings of the thesis. */
export function useTableLayout(): TableLayoutSettings {
  const [settings, setSettings] = useState(DEFAULT);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const bump = () => setVersion((value) => value + 1);
    window.addEventListener(LABELS_CHANGED, bump);
    return () => window.removeEventListener(LABELS_CHANGED, bump);
  }, []);
  useEffect(() => {
    let cancelled = false;
    Promise.all([api.invoke(IpcChannel.ConfigGetAdvanced), api.invoke(IpcChannel.ConfigGet)])
      .then(([advanced, config]) => {
        if (cancelled) return;
        const position = advanced.values["layout.caption-position.table"] ?? advanced.inherited["layout.caption-position.table"];
        setSettings({ position: position === "top" ? "top" : "bottom", prefix: config.fields.language === "english" ? "Table" : "表" });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [version]);
  return settings;
}
