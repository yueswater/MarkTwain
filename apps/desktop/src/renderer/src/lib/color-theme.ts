import { themeVariables, type ColorTheme } from "@marktwain/schema";

/** The variables that a theme has set on the page, kept so that the next theme can take them away first. */
let applied: string[] = [];

/** Puts a theme on the page, or the look of the app from the start when there is none. */
export function applyColorTheme(theme: ColorTheme | null, root: HTMLElement = document.documentElement): void {
  for (const name of applied) root.style.removeProperty(name);
  applied = [];
  root.classList.toggle("dark", theme?.mode === "dark");
  root.style.colorScheme = theme?.mode ?? "";
  if (!theme) {
    root.removeAttribute("data-color-theme");
    return;
  }
  root.setAttribute("data-color-theme", theme.id);
  for (const [name, value] of Object.entries(themeVariables(theme))) {
    root.style.setProperty(name, value);
    applied.push(name);
  }
}
