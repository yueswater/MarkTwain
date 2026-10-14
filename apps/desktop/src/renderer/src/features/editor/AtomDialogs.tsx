import { useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { LabelTarget } from "../../../../shared/ipc";
import type { UnlabeledTarget } from "./unlabeled-targets";

/** 腳註、文獻引用、交叉引用這三種行內「原子」節點共用的編輯狀態。 */
export type AtomTarget =
  | { type: "footnote"; pos: number | null; text: string }
  | { type: "citation"; pos: number | null; keys: string[]; form: string }
  | { type: "crossRef"; pos: number | null; label: string };

export type CrossRefChoice =
  | { kind: "existing"; label: string }
  | { kind: "new"; pos: number; labelKind: UnlabeledTarget["kind"] };

type FrameProps = {
  title: string;
  description?: string;
  editing: boolean;
  canSubmit: boolean;
  onSubmit: () => void;
  onRemove: () => void;
  onClose: () => void;
  onRestoreFocus: () => void;
  children: ReactNode;
};

function Frame({
  title,
  description,
  editing,
  canSubmit,
  onSubmit,
  onRemove,
  onClose,
  onRestoreFocus,
  children,
}: FrameProps) {
  const { t } = useTranslation("editor");
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        // 關閉後焦點回到編輯器（預設會回到工具列按鈕，接著打的字就不會進文件）
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          onRestoreFocus();
        }}
      >
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!canSubmit) return;
            onSubmit();
            onClose();
          }}
        >
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          {children}
          <DialogFooter>
            {editing && (
              <Button
                type="button"
                variant="outline"
                className="sm:mr-auto"
                onClick={() => {
                  onRemove();
                  onClose();
                }}
              >
                {t("atom.remove")}
              </Button>
            )}
            <Button type="button" variant="outline" onClick={onClose}>
              {t("action.cancel", { ns: "common" })}
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {t(editing ? "atom.update" : "atom.insert")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type Common = { onRemove: () => void; onClose: () => void; onRestoreFocus: () => void };

export function FootnoteDialog({
  target,
  onSubmit,
  ...common
}: Common & { target: Extract<AtomTarget, { type: "footnote" }>; onSubmit: (text: string) => void }) {
  const { t } = useTranslation("editor");
  const [text, setText] = useState(target.text);
  const editing = target.pos !== null;
  return (
    <Frame
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
    </Frame>
  );
}

const CITATION_FORMS = ["paren", "prose", "year", "author"] as const;

/** 把「wang2020, lee2019」拆成代號清單。 */
export function parseCitationKeys(input: string): string[] {
  return input.split(/[,;，；\s]+/).filter(Boolean);
}

export function CitationDialog({
  target,
  onSubmit,
  ...common
}: Common & {
  target: Extract<AtomTarget, { type: "citation" }>;
  onSubmit: (keys: string[], form: string) => void;
}) {
  const { t } = useTranslation("editor");
  const [keys, setKeys] = useState(target.keys.join(", "));
  const [form, setForm] = useState(target.form);
  const editing = target.pos !== null;
  const parsed = parseCitationKeys(keys);
  return (
    <Frame
      title={t(editing ? "citation.editTitle" : "citation.insertTitle")}
      editing={editing}
      canSubmit={parsed.length > 0}
      onSubmit={() => onSubmit(parsed, form)}
      {...common}
    >
      <div className="grid gap-2">
        <Label htmlFor="citation-keys">{t("citation.keys")}</Label>
        <Input
          id="citation-keys"
          value={keys}
          autoFocus
          spellCheck={false}
          onChange={(event) => setKeys(event.target.value)}
        />
        <p className="text-xs text-muted-foreground">{t("citation.keysHint")}</p>
      </div>
      <div className="grid gap-2">
        <Label>{t("citation.form")}</Label>
        <Select value={form} onValueChange={setForm}>
          <SelectTrigger aria-label={t("citation.form")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CITATION_FORMS.map((value) => (
              <SelectItem key={value} value={value}>
                {t(`citation.forms.${value}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </Frame>
  );
}

export function CrossRefDialog({
  target,
  labeled,
  unlabeled,
  onSubmit,
  ...common
}: Common & {
  target: Extract<AtomTarget, { type: "crossRef" }>;
  labeled: LabelTarget[];
  unlabeled: UnlabeledTarget[];
  onSubmit: (choice: CrossRefChoice) => void;
}) {
  const { t } = useTranslation("editor");
  const editing = target.pos !== null;
  const [value, setValue] = useState(target.label ? `l:${target.label}` : "");

  const options = useMemo(
    () => [
      ...labeled.map((item) => ({
        value: `l:${item.label}`,
        text: `${t(`crossRef.kind.${item.kind}`)} ${item.display}`,
        group: "labeled" as const,
      })),
      ...unlabeled.map((item) => ({
        value: `u:${item.pos}:${item.kind}`,
        text: `${t(`crossRef.kind.${item.kind}`)} · ${item.text || "…"}`,
        group: "unlabeled" as const,
      })),
    ],
    [labeled, unlabeled, t],
  );
  // 編輯時目標可能已失效（不在清單裡）；仍保留原值，讓使用者看得到
  const known = options.some((option) => option.value === value);

  function submit(): void {
    if (value.startsWith("l:")) onSubmit({ kind: "existing", label: value.slice(2) });
    else {
      const [, pos, labelKind] = value.split(":");
      onSubmit({ kind: "new", pos: Number(pos), labelKind: labelKind as UnlabeledTarget["kind"] });
    }
  }

  return (
    <Frame
      title={t(editing ? "crossRef.editTitle" : "crossRef.insertTitle")}
      description={options.length === 0 ? undefined : t("crossRef.chooseHint")}
      editing={editing}
      canSubmit={value !== ""}
      onSubmit={submit}
      {...common}
    >
      {options.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("crossRef.none")}</p>
      ) : (
        <div className="grid gap-2">
          <Label>{t("crossRef.target")}</Label>
          <Select value={value} onValueChange={setValue}>
            <SelectTrigger aria-label={t("crossRef.target")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {!known && value !== "" && (
                <SelectItem value={value}>
                  {t("crossRef.broken")} {value.slice(2)}
                </SelectItem>
              )}
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.text}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </Frame>
  );
}
