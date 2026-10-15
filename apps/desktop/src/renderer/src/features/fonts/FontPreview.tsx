import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { IpcChannel } from "../../../../shared/enums/ipc-channel.enum";
import type { FontFamilyEntry } from "../../../../shared/ipc";
import { api } from "../../shared/api";

let counter = 0;

/** A line of Chinese and a line of Latin text set in the font. A font of the template or the project is loaded from its file, one of the computer by its name. */
export function FontPreview({ family }: { family: FontFamilyEntry }) {
  const { t } = useTranslation("settings");
  const [face, setFace] = useState<string | null>(family.source === "system" ? family.name : null);

  useEffect(() => {
    if (family.source === "system") return;
    const file = family.files[0];
    if (!file) return;
    let cancelled = false;
    let loaded: FontFace | null = null;
    void api
      .invoke(IpcChannel.FontBytes, { source: family.source, path: file.path })
      .then(async (bytes) => {
        if (!bytes || cancelled) return;
        counter += 1;
        const name = `mt-preview-${counter}`;
        loaded = new FontFace(name, bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer);
        await loaded.load();
        if (cancelled) return;
        document.fonts.add(loaded);
        setFace(name);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      if (loaded) document.fonts.delete(loaded);
    };
  }, [family]);

  return (
    <div className="grid gap-0.5 text-base leading-snug" style={face ? { fontFamily: `"${face}", sans-serif` } : undefined} data-testid="font-preview">
      <span>{t("fonts.sampleCjk")}</span>
      <span>{t("fonts.sampleLatin")}</span>
    </div>
  );
}
