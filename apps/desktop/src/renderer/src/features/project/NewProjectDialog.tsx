import { applyProfile, isEmptyProfile, profileFromFields } from "../../../../shared/profile";
import type { ConfigFields, ConfigIssue } from "@marktwain/schema";
import { ChevronDownIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { IpcChannel } from "../../../../shared/enums/ipc-channel.enum";
import type { AuthorProfile } from "../../../../shared/ipc";
import { api } from "../../shared/api";
import { errorMessage } from "../../shared/error-message";
import { AuthorFields } from "./AuthorFields";
import { Field } from "./ConfigForm";

type Props = {
  /** Called when the dialog is done, whether the author filled it in or skipped it */
  onClose: () => void;
};

/**
 * Asked once when a project is created: the facts that the cover needs. It can be skipped, and what is about
 * the author is kept so the next project starts with it.
 */
export function NewProjectDialog({ onClose }: Props) {
  const { t } = useTranslation("project");
  const { t: tConfig } = useTranslation("config");
  const { t: tRoot } = useTranslation();
  const [fields, setFields] = useState<ConfigFields | null>(null);
  const [profile, setProfile] = useState<AuthorProfile | null>(null);
  const [more, setMore] = useState(false);
  const [dontAsk, setDontAsk] = useState(false);
  const [issues, setIssues] = useState<ConfigIssue[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filled, setFilled] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([api.invoke(IpcChannel.ConfigGet), api.invoke(IpcChannel.ProfileGet)]).then(([config, saved]) => {
      if (cancelled) return;
      // The question is turned off, a project simply starts with what is known
      if (!saved.ask) {
        const merged = applyProfile(config.fields, saved);
        const changed = JSON.stringify(merged) !== JSON.stringify(config.fields);
        void (changed ? api.invoke(IpcChannel.ConfigSet, { fields: merged }) : Promise.resolve()).finally(onClose);
        return;
      }
      setProfile(saved);
      setFilled(!isEmptyProfile(saved));
      setFields(applyProfile(config.fields, saved));
    }).catch((e: unknown) => !cancelled && setError(errorMessage(tRoot, e)));
    return () => {
      cancelled = true;
    };
  }, [tRoot, onClose]);

  if (!fields || !profile) return null;
  const update = (patch: Partial<ConfigFields>) => setFields((current) => (current ? { ...current, ...patch } : current));

  /** Saves the answers, or only the choice not to be asked again when the dialog is skipped. */
  async function finish(save: boolean): Promise<void> {
    try {
      if (save && fields) {
        const result = await api.invoke(IpcChannel.ConfigSet, { fields });
        // A missing field is expected, the cover warns about it later. Something wrong is shown here.
        const wrong = result.issues.filter((issue) => issue.code !== "required");
        if (wrong.length > 0) {
          setIssues(wrong);
          return;
        }
        await api.invoke(IpcChannel.ProfileSet, { patch: profileFromFields(fields, !dontAsk) });
      } else if (dontAsk !== !profile?.ask) {
        await api.invoke(IpcChannel.ProfileSet, { patch: { ask: !dontAsk } });
      }
      onClose();
    } catch (e) {
      setError(errorMessage(tRoot, e));
    }
  }

  const issueFor = (field: keyof ConfigFields) => issues.find((issue) => issue.field === field);

  return (
    <Dialog open onOpenChange={(open) => !open && void finish(false)}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg" data-testid="new-project-dialog">
        <DialogHeader>
          <DialogTitle>{t("newProject.title")}</DialogTitle>
          <DialogDescription>{t("newProject.description")}</DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            void finish(true);
          }}
        >
          {filled && <p className="text-xs text-muted-foreground">{t("newProject.filled")}</p>}
          <AuthorFields idPrefix="new" values={fields} onChange={update} show={["school", "author"]} />
          <Field id="new-title" label={tConfig("field.title")} error={issueFor("title") ? tConfig(`issue.${issueFor("title")!.code}`) : undefined}>
            <Input id="new-title" value={fields.title} autoComplete="off" onChange={(event) => update({ title: event.target.value })} />
          </Field>
          <Field id="new-advisor" label={tConfig("field.advisor")}>
            <Input id="new-advisor" value={fields.advisor} autoComplete="off" onChange={(event) => update({ advisor: event.target.value })} />
          </Field>

          <button
            type="button"
            aria-expanded={more}
            onClick={() => setMore((value) => !value)}
            className="flex items-center gap-1 text-left text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronDownIcon className={more ? "size-4" : "size-4 -rotate-90"} aria-hidden="true" />
            {t("newProject.more")}
          </button>
          {more && (
            <div className="grid gap-4">
              <AuthorFields idPrefix="new" values={fields} onChange={update} show={["department", "degree", "language", "authorEn", "id"]} />
              <Field id="new-titleEn" label={tConfig("field.titleEn")}>
                <Input id="new-titleEn" value={fields.titleEn} autoComplete="off" onChange={(event) => update({ titleEn: event.target.value })} />
              </Field>
              <Field id="new-advisorEn" label={tConfig("field.advisorEn")}>
                <Input id="new-advisorEn" value={fields.advisorEn} autoComplete="off" onChange={(event) => update({ advisorEn: event.target.value })} />
              </Field>
              <Field id="new-oralDate" label={tConfig("field.oralDate")} error={issueFor("oralDate") ? tConfig(`issue.${issueFor("oralDate")!.code}`) : undefined}>
                <Input id="new-oralDate" type="date" value={fields.oralDate} onChange={(event) => update({ oralDate: event.target.value })} />
              </Field>
            </div>
          )}
          {issues.length > 0 && (
            <p role="alert" className="text-sm text-destructive">
              {t("newProject.problem")}
            </p>
          )}
          {error && (
            <p role="alert" className="text-sm text-destructive select-text">
              {error}
            </p>
          )}
          <label className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
            {t("newProject.dontAsk")}
            <Switch checked={dontAsk} onCheckedChange={setDontAsk} aria-label={t("newProject.dontAsk")} />
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => void finish(false)}>
              {t("newProject.skip")}
            </Button>
            <Button type="submit">{t("newProject.confirm")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
