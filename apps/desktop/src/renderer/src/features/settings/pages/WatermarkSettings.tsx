import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AdvancedValue } from "@marktwain/schema";
import { IpcChannel } from "../../../../../shared/enums/ipc-channel.enum";
import type { AdvancedState, WatermarkInfo, WatermarkMode } from "../../../../../shared/ipc/index";
import { api } from "../../../shared/api";
import { errorMessage } from "../../../shared/error-message";
import { NumberField, SettingsHeading, SettingsRow } from "../controls/fields";
import { Rich } from "../../../shared/rich";

type Props = {
  state: AdvancedState | null;
  onSave: (path: string, value: AdvancedValue | null) => Promise<void>;
};

/** The watermark of the thesis, next to the school it comes from: follow the school, none, or an image of your own. */
export function WatermarkSettings({ state, onSave }: Props) {
  const { t } = useTranslation("settings");
  const { t: tRoot } = useTranslation();
  const [info, setInfo] = useState<WatermarkInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Loaded again after every change of the settings, the school decides what is shown
  useEffect(() => {
    let cancelled = false;
    api
      .invoke(IpcChannel.WatermarkGet)
      .then((next) => !cancelled && setInfo(next))
      .catch((e: unknown) => !cancelled && setError(errorMessage(tRoot, e)));
    return () => {
      cancelled = true;
    };
  }, [state, tRoot]);

  if (!info) return error ? <p role="alert" className="text-sm text-destructive"><Rich text={error} /></p> : null;
  const overridden = (path: string) => state?.values[path] !== undefined;

  async function choose(): Promise<void> {
    try {
      setError(null);
      const next = await api.invoke(IpcChannel.WatermarkChoose);
      if (!next) return;
      setInfo(next);
      // The service already wrote config.yml, saving the same value makes the page read the settings again
      await onSave("watermark.image", `/assets/watermarks/${next.custom?.name ?? ""}`);
    } catch (e) {
      setError(errorMessage(tRoot, e));
    }
  }

  async function pick(mode: WatermarkMode): Promise<void> {
    if (mode === "school") await onSave("watermark.image", null);
    else if (mode === "none") await onSave("watermark.image", "none");
    else if (info?.custom) await onSave("watermark.image", `/assets/watermarks/${info.custom.name}`);
    else await choose();
  }

  const picture = (thumb: string | null | undefined) =>
    thumb ? <img src={thumb} alt="" className="h-12 w-12 shrink-0 rounded border bg-white object-contain p-0.5" /> : <span className="size-12 shrink-0 rounded border border-dashed" aria-hidden="true" />;

  const option = (mode: WatermarkMode, title: string, body: React.ReactNode, thumb: string | null | undefined, action?: React.ReactNode) => (
    <div key={mode} className="flex items-stretch gap-2">
      <button
        type="button"
        role="radio"
        aria-checked={info.mode === mode}
        onClick={() => void pick(mode)}
        className={cn("flex min-w-0 flex-1 items-center gap-3 rounded-md border p-3 text-left text-sm", info.mode === mode ? "border-foreground ring-1 ring-foreground" : "hover:bg-muted")}
      >
        {picture(thumb)}
        <span className="min-w-0 flex-1">
          <span className="block font-medium">{title}</span>
          <span className="block truncate text-xs text-muted-foreground">{body}</span>
        </span>
      </button>
      {action}
    </div>
  );

  const shown = info.mode === "school" ? info.school : info.mode === "custom" ? info.custom : null;

  return (
    <div data-testid="watermark-settings">
      <SettingsHeading>{t("watermark.title")}</SettingsHeading>
      <p className="mb-2 text-xs text-muted-foreground">{t("watermark.hint")}</p>
      {error && (
        <p role="alert" className="mb-2 text-sm text-destructive select-text">
          <Rich text={error} />
        </p>
      )}
      <div role="radiogroup" aria-label={t("watermark.title")} className="grid gap-2">
        {option("school", t("watermark.school"), info.school ? t("watermark.schoolHas", { name: info.school.name }) : t("watermark.schoolNone"), info.school?.thumbnail)}
        {option("none", t("watermark.none"), t("watermark.noneBody"), null)}
        {option(
          "custom",
          t("watermark.custom"),
          info.custom ? info.custom.name : t("watermark.customBody"),
          info.custom?.thumbnail,
          <Button type="button" variant="outline" className="h-auto" onClick={() => void choose()}>
            {info.custom ? t("watermark.replace") : t("watermark.choose")}
          </Button>,
        )}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{t("watermark.rule")}</p>
      <div className="mt-4 grid grid-cols-[7rem_minmax(0,1fr)] items-start gap-6">
        <div className="flex h-40 w-28 items-center justify-center overflow-hidden rounded-sm border bg-white shadow-sm" data-testid="watermark-preview" aria-label={t("watermark.preview")}>
          {shown?.thumbnail ? (
            <img src={shown.thumbnail} alt="" style={{ width: `${info.width}%`, opacity: info.opacity / 100 }} className="object-contain" />
          ) : (
            <span className="px-2 text-center text-xs text-muted-foreground">{info.mode === "none" ? t("watermark.none") : t("watermark.noPicture")}</span>
          )}
        </div>
        <div>
      <SettingsRow
        id="setting-watermark.width"
        label={t("field.watermark.width")}
        unit="%"
        control={
          <NumberField label={t("field.watermark.width")} value={overridden("watermark.width") ? info.width : null} placeholder={String(info.width)} min={10} max={100} onCommit={(v) => void onSave("watermark.width", v)} />
        }
      />
      <SettingsRow
        id="setting-watermark.opacity"
        label={t("field.watermark.opacity")}
        unit="%"
        control={
          <NumberField label={t("field.watermark.opacity")} value={overridden("watermark.opacity") ? info.opacity : null} placeholder={String(info.opacity)} min={5} max={100} onCommit={(v) => void onSave("watermark.opacity", v)} />
        }
      />
        </div>
      </div>
    </div>
  );
}
