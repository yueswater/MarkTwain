import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Switch } from "@/components/ui/switch";
import { IpcChannel } from "../../../../../shared/enums/ipc-channel.enum";
import { PROFILE_TEXT_FIELDS, type AuthorProfile } from "../../../../../shared/profile";
import { api } from "../../../shared/api";
import { AuthorFields, type AuthorValues } from "../../project/config/AuthorFields";
import { SettingsRow } from "../controls/fields";

/** The facts of the author that every new project starts with, and whether a new project asks for them. */
export function ProfileSettings() {
  const { t } = useTranslation("settings");
  const [profile, setProfile] = useState<AuthorProfile | null>(null);

  useEffect(() => {
    void api.invoke(IpcChannel.ProfileGet).then(setProfile);
  }, []);
  if (!profile) return null;

  async function change(patch: Partial<AuthorProfile>): Promise<void> {
    setProfile((current) => (current ? { ...current, ...patch } : current));
    setProfile(await api.invoke(IpcChannel.ProfileSet, { patch }));
  }

  const values = Object.fromEntries(PROFILE_TEXT_FIELDS.map((field) => [field, profile[field]])) as AuthorValues;
  return (
    <div className="flex flex-col gap-6">
      <SettingsRow
        id="setting-profile-ask"
        label={t("profile.ask")}
        hint={t("profile.askHint")}
        control={<Switch aria-label={t("profile.ask")} checked={profile.ask} onCheckedChange={(ask) => void change({ ask })} />}
      />
      <div className="grid gap-4">
        <AuthorFields idPrefix="profile" values={values} onChange={(patch) => void change(patch)} show={["school", "author", "authorEn", "id", "department", "degree", "language"]} />
      </div>
      <p className="text-xs text-muted-foreground">{t("profile.local")}</p>
    </div>
  );
}
