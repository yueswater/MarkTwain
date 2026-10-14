import { createTheme } from "@mui/material/styles";
import { palette as p } from "./palette";
import { shape } from "./shape";
import { typography } from "./typography";

export const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: p.primary,
      contrastText: p.onPrimary,
      container: p.primaryContainer,
      onContainer: p.onPrimaryContainer,
    },
    secondary: {
      main: p.secondary,
      contrastText: p.onSecondary,
      container: p.secondaryContainer,
      onContainer: p.onSecondaryContainer,
    },
    tertiary: {
      main: p.tertiary,
      contrastText: p.onTertiary,
      container: p.tertiaryContainer,
      onContainer: p.onTertiaryContainer,
    },
    error: {
      main: p.error,
      contrastText: p.onError,
      container: p.errorContainer,
      onContainer: p.onErrorContainer,
    },
    background: { default: p.background, paper: p.surface },
    text: { primary: p.onSurface, secondary: p.onSurfaceVariant },
    divider: p.outlineVariant,
  },
  shape: { borderRadius: shape.borderRadius },
  typography,
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        // 清楚可見的焦點環（規格 3.6 節規則 4）
        ":focus-visible": { outline: `3px solid ${p.primary}`, outlineOffset: "2px" },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { borderRadius: shape.pill, paddingInline: 24 } },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: { root: { borderRadius: shape.card } },
    },
    MuiAppBar: {
      defaultProps: { elevation: 0, color: "default" },
      styleOverrides: {
        root: { backgroundColor: p.surface, color: p.onSurface, borderBottom: `1px solid ${p.outlineVariant}` },
      },
    },
    MuiChip: {
      styleOverrides: { root: { borderRadius: 8, fontWeight: 500 } },
    },
    MuiOutlinedInput: {
      styleOverrides: { notchedOutline: { borderColor: p.outline } },
    },
    MuiAlert: {
      styleOverrides: { root: { borderRadius: shape.borderRadius } },
    },
  },
});
