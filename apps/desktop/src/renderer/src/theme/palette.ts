/**
 * 整個應用程式唯一定義色值的地方（規格 3.6 節）。
 * 主色與 TW-Thesis 模板相同；容器色由主色的色相以 Google 的
 * material-color-utilities 推導；薄荷綠與粉米色取自參考海報。
 * 元件一律從主題取用，不直接寫色值。
 */
export const palette = {
  primary: "#5820F0",
  onPrimary: "#FFFFFF",
  primaryContainer: "#E6DEFF",
  onPrimaryContainer: "#1C0062",

  secondary: "#605C71",
  onSecondary: "#FFFFFF",
  secondaryContainer: "#E6DFF9",
  onSecondaryContainer: "#1C192B",

  tertiary: "#006D41",
  onTertiary: "#FFFFFF",
  tertiaryContainer: "#80F3B1",
  onTertiaryContainer: "#002110",

  error: "#BA1A1A",
  onError: "#FFFFFF",
  errorContainer: "#FFDAD6",
  onErrorContainer: "#410002",

  background: "#F4E2E2",
  onBackground: "#0A0C10",
  surface: "#FBFAF5",
  onSurface: "#0A0C10",
  surfaceVariant: "#E6E0EC",
  onSurfaceVariant: "#48454E",

  outline: "#79757F",
  outlineVariant: "#C9C4D0",
} as const;

export type Palette = typeof palette;
