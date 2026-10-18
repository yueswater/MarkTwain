import { themeVariables, type ColorTheme } from "@marktwain/schema";
import type { CSSProperties } from "react";

/** A small picture of the editor in a theme, for a theme that has no screenshot. It is built from the same colors as the real thing. */
export function ThemeMock({ theme }: { theme: ColorTheme }) {
  const vars = themeVariables(theme) as CSSProperties;
  return (
    <div
      aria-hidden="true"
      className="flex h-full w-full overflow-hidden text-[7px] leading-tight"
      style={{ ...vars, background: "var(--background)", color: "var(--foreground)" }}
    >
      <div className="w-1/4 space-y-1 p-2" style={{ background: "var(--sidebar)", borderRight: "1px solid var(--border)" }}>
        <div className="h-1.5 w-3/4 rounded-sm" style={{ background: "var(--muted-foreground)", opacity: 0.6 }} />
        <div className="h-1.5 w-full rounded-sm" style={{ background: "var(--accent)" }} />
        <div className="h-1.5 w-2/3 rounded-sm" style={{ background: "var(--muted-foreground)", opacity: 0.4 }} />
      </div>
      <div className="flex-1 space-y-1.5 p-3">
        <div className="h-2 w-1/2 rounded-sm" style={{ background: "var(--editor-heading)" }} />
        <div className="h-1 w-full rounded-sm" style={{ background: "var(--foreground)", opacity: 0.7 }} />
        <div className="h-1 w-5/6 rounded-sm" style={{ background: "var(--foreground)", opacity: 0.7 }} />
        <div className="h-1 w-2/5 rounded-sm" style={{ background: "var(--editor-link)" }} />
        <div className="mt-2 h-4 w-1/3 rounded-sm" style={{ background: "var(--primary)" }} />
      </div>
    </div>
  );
}
