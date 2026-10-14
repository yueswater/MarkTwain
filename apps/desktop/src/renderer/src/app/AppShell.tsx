import { LanguagesIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import logo from "@/assets/logo.png";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SUPPORTED_LOCALES, type Locale } from "../../../shared/enums/locale.enum";

type Props = {
  children: ReactNode;
  onLocaleChange: (locale: Locale) => void;
};

/** 頂部列（品牌與語言選單）加內容區。視覺沿用 anvilnote 的黑白灰設計語言。所有文字都走 i18n。 */
export function AppShell({ children, onLocaleChange }: Props) {
  const { t, i18n } = useTranslation();

  return (
    <div className="min-h-screen bg-background">
      <header className="flex h-12 items-center gap-2 border-b px-4">
        <img src={logo} alt="" className="size-7" />
        <h1 className="text-sm font-semibold tracking-tight">{t("app.name")}</h1>
        <div className="ml-auto flex items-center gap-2">
          <LanguagesIcon className="size-4 text-muted-foreground" aria-hidden="true" />
          <Select value={i18n.language} onValueChange={(value) => onLocaleChange(value as Locale)}>
            <SelectTrigger size="sm" aria-label={t("settings.language")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              {SUPPORTED_LOCALES.map((locale) => (
                <SelectItem key={locale} value={locale}>
                  {t(`settings.locale.${locale}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </header>
      <main className="mx-auto max-w-3xl p-8">{children}</main>
    </div>
  );
}
