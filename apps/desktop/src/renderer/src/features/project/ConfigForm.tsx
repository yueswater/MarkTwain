import {
  CITATION_STYLES,
  DEGREES,
  LANGUAGES,
  SCHOOLS,
  collegesOf,
  departmentsOf,
  type ConfigFields,
  type ConfigIssue,
} from "@marktwain/schema";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { IpcChannel } from "../../../../shared/enums/ipc-channel.enum";
import type { ConfigState } from "../../../../shared/ipc";
import { api } from "../../shared/api";
import { errorMessage } from "../../shared/error-message";
import { Autosaver, type SaveStatus } from "../editor/autosaver";
import { OptionPicker } from "./OptionPicker";

const NO_SCHOOL = "none";

type TextField = Exclude<keyof ConfigFields, "keywords" | "keywordsEn" | "school">;

/** Project settings form that saves while typing, fields of config.yml. */
export function ConfigForm({ onSaved, embedded = false }: { onSaved?: () => void; embedded?: boolean }) {
  const { t, i18n } = useTranslation("config");
  const [state, setState] = useState<ConfigState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const fieldsRef = useRef<ConfigFields | null>(null);
  const savedRef = useRef(onSaved);
  savedRef.current = onSaved;
  useEffect(() => {
    if (status === "saved") savedRef.current?.();
  }, [status]);

  const autosaver = useMemo(
    () =>
      new Autosaver(
        async (json) => {
          const next = await api.invoke(IpcChannel.ConfigSet, { fields: JSON.parse(json) as ConfigFields });
          // Only the validation result is updated, field values follow what the user is typing
          setState((current) => (current ? { ...current, issues: next.issues } : current));
        },
        setStatus,
        600,
      ),
    [],
  );

  useEffect(() => {
    let cancelled = false;
    api
      .invoke(IpcChannel.ConfigGet)
      .then((loaded) => {
        if (cancelled) return;
        fieldsRef.current = loaded.fields;
        setState(loaded);
      })
      .catch((e: unknown) => !cancelled && setError(errorMessage(i18n.t.bind(i18n), e)));
    return () => {
      cancelled = true;
      void autosaver.flush(); // Save the last changes before leaving the settings page
    };
  }, [autosaver, i18n]);

  if (error) {
    return (
      <p role="alert" className="p-8 text-sm text-destructive select-text">
        {error}
      </p>
    );
  }
  if (!state) return null;
  const fields = state.fields;

  function update(patch: Partial<ConfigFields>): void {
    const next = { ...(fieldsRef.current as ConfigFields), ...patch };
    fieldsRef.current = next;
    setState((current) => (current ? { ...current, fields: next } : current));
    autosaver.schedule(() => JSON.stringify(next));
  }

  const issueFor = (field: keyof ConfigFields): ConfigIssue | undefined =>
    state.issues.find((issue) => issue.field === field);

  const text = (field: TextField, extra?: { hint?: string; placeholder?: string }) => {
    const issue = issueFor(field);
    // Do not show errors on required fields before the user filled them, to avoid a page of red text on open
    const showIssue = issue && !(issue.code === "required" && fields[field] === "" && status === "idle");
    return (
      <Field
        key={field}
        id={`config-${field}`}
        label={t(`field.${field}`)}
        hint={extra?.hint}
        error={showIssue ? t(`issue.${issue.code}`) : undefined}
      >
        <Input
          id={`config-${field}`}
          value={fields[field]}
          placeholder={extra?.placeholder}
          aria-invalid={showIssue ? true : undefined}
          onChange={(event) => update({ [field]: event.target.value })}
        />
      </Field>
    );
  };

  const keywords = (field: "keywords" | "keywordsEn") => (
    <Field key={field} id={`config-${field}`} label={t(`field.${field}`)} hint={t("hint.keywords")}>
      <Input
        id={`config-${field}`}
        defaultValue={fields[field].join(", ")}
        onChange={(event) =>
          update({ [field]: event.target.value.split(/[,，、]+/).map((item) => item.trim()).filter(Boolean) })
        }
      />
    </Field>
  );

  const english = i18n.language === "en";

  return (
    <div className={embedded ? undefined : "h-full overflow-y-auto"}>
      <form className={embedded ? "flex flex-col gap-8" : "mx-auto flex max-w-2xl flex-col gap-8 p-8"} onSubmit={(event) => event.preventDefault()}>
        <header className="flex flex-col gap-1">
          {!embedded && <h2 className="text-2xl font-semibold tracking-tight">{t("title")}</h2>}
          <p className="text-sm text-muted-foreground">{t("description")}</p>
          <p role="status" className="h-4 text-xs text-muted-foreground" data-status={status}>
            {status === "idle" ? "" : t(`save.${status}`)}
          </p>
        </header>

        <Section title={t("section.school")}>
          <Field id="config-school" label={t("field.school")} hint={t("hint.school")}>
            <Select
              value={fields.school === "" ? NO_SCHOOL : fields.school}
              onValueChange={(value) => update({ school: value === NO_SCHOOL ? "" : value })}
            >
              <SelectTrigger id="config-school" aria-label={t("field.school")} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_SCHOOL}>{t("noSchool")}</SelectItem>
                {SCHOOLS.map((school) => (
                  <SelectItem key={school.code} value={school.code}>
                    {english ? school.nameEn : school.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </Section>

        <Section title={t("section.thesis")}>
          {text("title")}
          {text("titleEn")}
        </Section>
        <Section title={t("section.author")}>
          {text("author")}
          {text("authorEn")}
          {text("id")}
        </Section>
        <Section title={t("section.advisor")}>
          {text("advisor")}
          {text("advisorEn")}
        </Section>
        <Section title={t("section.department")}>
          {fields.school === "" && <p className="text-xs text-muted-foreground">{t("chooseSchoolFirst")}</p>}
          <OptionPicker
            id="config-college"
            label={t("field.collegePick")}
            placeholder={t("chooseCollege")}
            options={collegesOf(fields.school)}
            zh={fields.college}
            en={fields.collegeEn}
            english={english}
            onChange={(value) => update({ college: value.zh, collegeEn: value.en })}
          />
          <OptionPicker
            id="config-institute"
            label={t("field.institutePick")}
            placeholder={t("chooseDepartment")}
            options={departmentsOf(fields.school, fields.college)}
            zh={fields.institute}
            en={fields.instituteEn}
            english={english}
            onChange={(value) => update({ institute: value.zh, instituteEn: value.en })}
          />
        </Section>
        <Section title={t("section.degree")}>
          <OptionPicker
            id="config-degree"
            label={t("field.degree")}
            placeholder={t("field.degree")}
            options={[...DEGREES]}
            zh={fields.degree}
            en={fields.degreeEn}
            english={english}
            onChange={(value) => update({ degree: value.zh, degreeEn: value.en })}
          />
        </Section>
        <Section title={t("section.language")}>
          <Field id="config-language" label={t("field.language")}>
            <Select
              value={fields.language === "" ? NO_SCHOOL : fields.language}
              onValueChange={(value) => update({ language: value === NO_SCHOOL ? "" : value })}
            >
              <SelectTrigger id="config-language" aria-label={t("field.language")} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_SCHOOL}>{t("followPreset")}</SelectItem>
                {LANGUAGES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {t(`lang.${value}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field id="config-citation" label={t("field.citationStyle")}>
            <Select
              value={fields.citationStyle === "" ? NO_SCHOOL : fields.citationStyle}
              onValueChange={(value) => update({ citationStyle: value === NO_SCHOOL ? "" : value })}
            >
              <SelectTrigger id="config-citation" aria-label={t("field.citationStyle")} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_SCHOOL}>{t("followPreset")}</SelectItem>
                {CITATION_STYLES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {t(`style.${value}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </Section>
        <Section title={t("section.dates")}>
          {text("date", { hint: t("hint.date"), placeholder: "2026-06-30" })}
          {text("oralDate", { hint: t("hint.date"), placeholder: "2026-06-15" })}
        </Section>
        <Section title={t("section.keywords")}>
          {keywords("keywords")}
          {keywords("keywordsEn")}
        </Section>
      </form>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h3 className="text-sm font-medium">{title}</h3>
      {children}
    </section>
  );
}

function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
