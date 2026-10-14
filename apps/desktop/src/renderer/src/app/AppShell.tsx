import MenuBookRounded from "@mui/icons-material/MenuBookRounded";
import TranslateRounded from "@mui/icons-material/TranslateRounded";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { SUPPORTED_LOCALES, type Locale } from "../../../shared/enums/locale.enum";
import { SERIF } from "../theme/typography";

type Props = {
  children: ReactNode;
  onLocaleChange: (locale: Locale) => void;
};

/** 頂部應用列（品牌與語言選單）加內容區。所有文字都走 i18n。 */
export function AppShell({ children, onLocaleChange }: Props) {
  const { t, i18n } = useTranslation();

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <AppBar position="static">
        <Toolbar sx={{ gap: 1.5 }}>
          <MenuBookRounded color="primary" fontSize="large" />
          <Typography component="h1" variant="h5" sx={{ fontFamily: SERIF, fontWeight: 700, flexGrow: 1 }}>
            {t("app.name")}
          </Typography>
          <TranslateRounded color="action" />
          <Select
            size="small"
            value={i18n.language}
            onChange={(event) => onLocaleChange(event.target.value as Locale)}
            slotProps={{ input: { "aria-label": t("settings.language") } }}
          >
            {SUPPORTED_LOCALES.map((locale) => (
              <MenuItem key={locale} value={locale}>
                {t(`settings.locale.${locale}`)}
              </MenuItem>
            ))}
          </Select>
        </Toolbar>
      </AppBar>
      <Box component="main" sx={{ p: 4, maxWidth: 960, mx: "auto" }}>
        {children}
      </Box>
    </Box>
  );
}
