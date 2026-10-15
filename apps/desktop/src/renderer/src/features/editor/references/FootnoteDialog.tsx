import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AtomDialogFrame, type Common } from "./AtomDialogFrame";
import type { AtomTarget } from "./atom-target";

export function FootnoteDialog({
  target,
  onSubmit,
  ...common
}: Common & { target: Extract<AtomTarget, { type: "footnote" }>; onSubmit: (text: string) => void }) {
  const { t } = useTranslation("editor");
  const [text, setText] = useState(target.text);
  const editing = target.pos !== null;
  return (
    <AtomDialogFrame
      title={t(editing ? "footnote.editTitle" : "footnote.insertTitle")}
      description={t("footnote.hint")}
      editing={editing}
      canSubmit={text.trim() !== ""}
      onSubmit={() => onSubmit(text.trim())}
      {...common}
    >
      <div className="grid gap-2">
        <Label htmlFor="footnote-text">{t("footnote.text")}</Label>
        <Textarea
          id="footnote-text"
          value={text}
          autoFocus
          rows={4}
          onChange={(event) => setText(event.target.value)}
        />
      </div>
    </AtomDialogFrame>
  );
}
