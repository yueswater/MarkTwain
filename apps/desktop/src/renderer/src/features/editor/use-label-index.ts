import { useEffect, useState } from "react";
import { IpcChannel } from "../../../../shared/enums/ipc-channel.enum";
import type { LabelIndex } from "../../../../shared/ipc";
import { api } from "../../shared/api";
import type { SaveStatus } from "./autosaver";

const EMPTY: LabelIndex = { numbers: {}, broken: [], duplicates: [], targets: [] };

/** 專案的標籤與編號；載入時與每次儲存完成後更新（後端掃描的是已儲存的文件）。 */
export function useLabelIndex(status: SaveStatus): LabelIndex {
  const [index, setIndex] = useState<LabelIndex>(EMPTY);

  useEffect(() => {
    if (status !== "idle" && status !== "saved") return;
    let cancelled = false;
    api
      .invoke(IpcChannel.LabelResolve)
      .then((next) => !cancelled && setIndex(next))
      .catch(() => undefined); // 預覽用的資料；失敗時沿用舊的，不打斷編輯
    return () => {
      cancelled = true;
    };
  }, [status]);

  return index;
}
