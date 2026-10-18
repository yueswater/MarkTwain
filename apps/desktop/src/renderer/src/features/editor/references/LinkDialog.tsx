import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Rich } from "../../../shared/rich";
import { AtomDialogFrame, type Common } from "./AtomDialogFrame";
import { normalizeUrl } from "./link-url";

/** The range of the text that the link covers or will cover, with what it says and where it goes. */
export type LinkTarget = { from: number; to: number; text: string; url: string; editing: boolean };

export function LinkDialog({
  target,
  onSubmit,
  ...common
}: Common & { target: LinkTarget; onSubmit: (text: string, url: string) => void }) {
  const { t } = useTranslation("editor");
  const [text, setText] = useState(target.text);
  const [url, setUrl] = useState(target.url);
  const normalized = normalizeUrl(url);
  const wrong = url.trim() !== "" && normalized === null;
  return (
    <AtomDialogFrame
      title={t(target.editing ? "link.editTitle" : "link.insertTitle")}
      editing={target.editing}
      canSubmit={normalized !== null}
      onSubmit={() => onSubmit(text.trim() || (normalized as string), normalized as string)}
      {...common}
    >
      <div className="grid gap-2">
        <Label htmlFor="link-text">{t("link.text")}</Label>
        <Input id="link-text" value={text} autoComplete="off" autoFocus={target.text === ""} placeholder={t("link.textPlaceholder")} onChange={(event) => setText(event.target.value)} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="link-url">{t("link.url")}</Label>
        <Input id="link-url" value={url} autoComplete="off" autoFocus={target.text !== ""} placeholder="https://example.com" aria-invalid={wrong ? true : undefined} className="font-mono" onChange={(event) => setUrl(event.target.value)} />
        <p className={wrong ? "text-xs text-destructive" : "text-xs text-muted-foreground"} role={wrong ? "alert" : undefined}>
          <Rich text={t(wrong ? "link.invalid" : "link.urlHint")} />
        </p>
      </div>
    </AtomDialogFrame>
  );
}
