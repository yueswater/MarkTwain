import { DEGREES, LANGUAGES, SCHOOLS, collegesOf, departmentsOf, type ConfigFields } from "@marktwain/schema";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field } from "./ConfigForm";
import { OptionPicker } from "./OptionPicker";

const NONE = "none";

/** The part of the thesis settings that is a fact of the author, shared by the new project dialog and the profile. */
export type AuthorValues = Pick<ConfigFields, "school" | "college" | "collegeEn" | "institute" | "instituteEn" | "degree" | "degreeEn" | "author" | "authorEn" | "id" | "language">;

type Props = {
  idPrefix: string;
  values: AuthorValues;
  onChange: (patch: Partial<AuthorValues>) => void;
  /** Which fields to show, the dialog shows some of them under a button */
  show: ReadonlyArray<"school" | "department" | "degree" | "language" | "author" | "authorEn" | "id">;
};

/** Fields for what is true of the author in every thesis. */
export function AuthorFields({ idPrefix, values, onChange, show }: Props) {
  const { t, i18n } = useTranslation("config");
  const english = i18n.language === "en";
  const has = (name: Props["show"][number]) => show.includes(name);
  const text = (name: "author" | "authorEn" | "id") => (
    <Field key={name} id={`${idPrefix}-${name}`} label={t(`field.${name}`)}>
      <Input id={`${idPrefix}-${name}`} value={values[name]} autoComplete="off" onChange={(event) => onChange({ [name]: event.target.value })} />
    </Field>
  );

  return (
    <>
      {has("school") && (
        <Field id={`${idPrefix}-school`} label={t("field.school")}>
          <Select value={values.school === "" ? NONE : values.school} onValueChange={(value) => onChange({ school: value === NONE ? "" : value })}>
            <SelectTrigger id={`${idPrefix}-school`} aria-label={t("field.school")} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>{t("noSchool")}</SelectItem>
              {SCHOOLS.map((school) => (
                <SelectItem key={school.code} value={school.code}>
                  {english ? school.nameEn : school.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}
      {has("author") && text("author")}
      {has("authorEn") && text("authorEn")}
      {has("id") && text("id")}
      {has("department") && (
        <>
          <OptionPicker
            id={`${idPrefix}-college`}
            label={t("field.collegePick")}
            placeholder={t("chooseCollege")}
            options={collegesOf(values.school)}
            zh={values.college}
            en={values.collegeEn}
            english={english}
            onChange={(value) => onChange({ college: value.zh, collegeEn: value.en })}
          />
          <OptionPicker
            id={`${idPrefix}-institute`}
            label={t("field.institutePick")}
            placeholder={t("chooseDepartment")}
            options={departmentsOf(values.school, values.college)}
            zh={values.institute}
            en={values.instituteEn}
            english={english}
            onChange={(value) => onChange({ institute: value.zh, instituteEn: value.en })}
          />
        </>
      )}
      {has("degree") && (
        <OptionPicker
          id={`${idPrefix}-degree`}
          label={t("field.degree")}
          placeholder={t("field.degree")}
          options={[...DEGREES]}
          zh={values.degree}
          en={values.degreeEn}
          english={english}
          onChange={(value) => onChange({ degree: value.zh, degreeEn: value.en })}
        />
      )}
      {has("language") && (
        <Field id={`${idPrefix}-language`} label={t("field.language")}>
          <Select value={values.language === "" ? NONE : values.language} onValueChange={(value) => onChange({ language: value === NONE ? "" : value })}>
            <SelectTrigger id={`${idPrefix}-language`} aria-label={t("field.language")} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>{t("followPreset")}</SelectItem>
              {LANGUAGES.map((value) => (
                <SelectItem key={value} value={value}>
                  {t(`lang.${value}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}
    </>
  );
}
