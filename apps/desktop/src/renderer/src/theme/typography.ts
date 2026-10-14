import type { TypographyVariantsOptions } from "@mui/material/styles";

/** 介面字型（9.1 規則 12）；大標題用襯線粗體，呼應參考海報的宋體大標。 */
export const SANS = '"Noto Sans TC Variable", sans-serif';
export const SERIF = '"Noto Serif TC Variable", serif';

/** Material 3 的字級，對應到 MUI 的變體。 */
export const typography: TypographyVariantsOptions = {
  fontFamily: SANS,
  h1: { fontFamily: SERIF, fontWeight: 700, fontSize: "2.5rem", lineHeight: 1.2 },
  h2: { fontFamily: SERIF, fontWeight: 700, fontSize: "2rem", lineHeight: 1.25 },
  h3: { fontFamily: SERIF, fontWeight: 700, fontSize: "1.75rem", lineHeight: 1.3 },
  h4: { fontWeight: 600, fontSize: "1.5rem", lineHeight: 1.33 },
  h5: { fontWeight: 600, fontSize: "1.375rem", lineHeight: 1.4 },
  h6: { fontWeight: 600, fontSize: "1.25rem", lineHeight: 1.4 },
  subtitle1: { fontWeight: 500, fontSize: "1rem", lineHeight: 1.5 },
  subtitle2: { fontWeight: 500, fontSize: "0.875rem", lineHeight: 1.43 },
  body1: { fontSize: "1rem", lineHeight: 1.6 },
  body2: { fontSize: "0.875rem", lineHeight: 1.5 },
  button: { fontWeight: 500, fontSize: "0.875rem", textTransform: "none" },
  caption: { fontSize: "0.75rem", lineHeight: 1.33 },
};
