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
import { useBibliography } from "../bibliography/bibliography-context";
import type { UnlabeledTarget } from "./unlabeled-targets";

/** Editing state shared by the three inline atom nodes, footnote, citation and cross-reference. */
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
        // Focus returns to the editor after closing, by default it goes to the toolbar button and typed text would miss the document
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

/** Splits "wang2020, lee2019" into a list of keys. */
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
  const { view } = useBibliography();
  const [keys, setKeys] = useState<string[]>(target.keys);
  const [form, setForm] = useState(target.form);
  const [filter, setFilter] = useState("");
  const editing = target.pos !== null;

  const known = new Set(view.items.map((item) => item.key));
  const typed = keys.filter((key) => !known.has(key)).join(", ");
  const needle = filter.trim().toLowerCase();
  const shown = view.items.filter(
    (item) => needle === "" || `${item.key} ${item.label} ${item.fields.title ?? ""}`.toLowerCase().includes(needle),
  );
  const toggle = (key: string) => setKeys((current) => (current.includes(key) ? current.filter((k) => k !== key) : [...current, key]));

  return (
    <Frame
      title={t(editing ? "citation.editTitle" : "citation.insertTitle")}
      editing={editing}
      canSubmit={keys.length > 0}
      onSubmit={() => onSubmit(keys, form)}
      {...common}
    >
      <div className="grid gap-2">
        <Label htmlFor="citation-filter">{t("citation.pick")}</Label>
        {view.items.length === 0 ? (
          <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">{t("citation.noBibliography")}</p>
        ) : (
          <>
            <Input
              id="citation-filter"
              value={filter}
              autoFocus
              placeholder={t("citation.filter")}
              spellCheck={false}
              onChange={(event) => setFilter(event.target.value)}
            />
            <ul className="max-h-48 overflow-y-auto rounded-md border" aria-label={t("citation.pick")}>
              {shown.length === 0 && <li className="p-3 text-sm text-muted-foreground">{t("citation.noMatch")}</li>}
              {shown.map((item) => (
                <li key={item.key}>
                  <label className="flex cursor-pointer items-start gap-2 px-3 py-1.5 text-sm hover:bg-muted">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={keys.includes(item.key)}
                      onChange={() => toggle(item.key)}
                    />
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{item.label}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {item.key}
                        {item.fields.title ? ` · ${item.fields.title}` : ""}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="citation-keys">{t("citation.keys")}</Label>
        <Input
          id="citation-keys"
          value={typed}
          autoFocus={view.items.length === 0}
          spellCheck={false}
          onChange={(event) => setKeys([...keys.filter((key) => known.has(key)), ...parseCitationKeys(event.target.value)])}
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
  // When editing, the target may be gone and missing from the list, keep the old value so the user can see it
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
              <SelectValue placeholder={t("crossRef.placeholder")} />
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
