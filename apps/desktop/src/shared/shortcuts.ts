/** The keyboard shortcuts of the app in one list, the toolbar, the menus, the cheat sheet and the key handlers read it. */
export type ShortcutGroup = "text" | "blocks" | "insert" | "edit" | "app";

/** Where the key press is handled: the editor, the window, or the native menu of the app. */
export type ShortcutScope = "editor" | "window" | "menu";

export type ShortcutCommand = {
  id: string;
  group: ShortcutGroup;
  /** Mod is Cmd on macOS and Ctrl elsewhere, then Alt and Shift, then one key, null when the action has no shortcut */
  chord: string | null;
  scope: ShortcutScope;
};

export const SHORTCUTS: readonly ShortcutCommand[] = [
  { id: "paragraph", group: "text", chord: "Mod+Alt+0", scope: "editor" },
  { id: "heading2", group: "text", chord: "Mod+Alt+2", scope: "editor" },
  { id: "heading3", group: "text", chord: "Mod+Alt+3", scope: "editor" },
  { id: "heading4", group: "text", chord: "Mod+Alt+4", scope: "editor" },
  { id: "bold", group: "text", chord: "Mod+B", scope: "editor" },
  { id: "italic", group: "text", chord: "Mod+I", scope: "editor" },
  { id: "strike", group: "text", chord: "Mod+Shift+S", scope: "editor" },
  { id: "code", group: "text", chord: "Mod+E", scope: "editor" },

  { id: "bulletList", group: "blocks", chord: "Mod+Shift+8", scope: "editor" },
  { id: "orderedList", group: "blocks", chord: "Mod+Shift+7", scope: "editor" },
  { id: "blockquote", group: "blocks", chord: "Mod+Shift+B", scope: "editor" },
  { id: "codeBlock", group: "blocks", chord: "Mod+Alt+C", scope: "editor" },
  { id: "table", group: "blocks", chord: "Mod+Alt+T", scope: "editor" },
  { id: "landscape", group: "blocks", chord: "Mod+Alt+W", scope: "editor" },
  { id: "displayMath", group: "blocks", chord: "Mod+Alt+E", scope: "editor" },
  { id: "image", group: "blocks", chord: "Mod+Shift+G", scope: "editor" },

  { id: "inlineMath", group: "insert", chord: "Mod+Shift+M", scope: "editor" },
  { id: "footnote", group: "insert", chord: "Mod+Alt+F", scope: "editor" },
  { id: "citation", group: "insert", chord: "Mod+Shift+K", scope: "editor" },
  { id: "crossRef", group: "insert", chord: "Mod+Alt+R", scope: "editor" },
  { id: "link", group: "insert", chord: "Mod+K", scope: "editor" },
  { id: "equationName", group: "insert", chord: "Mod+Alt+N", scope: "editor" },
  { id: "peekReference", group: "insert", chord: "Mod+Alt+P", scope: "editor" },

  { id: "undo", group: "edit", chord: "Mod+Z", scope: "editor" },
  { id: "redo", group: "edit", chord: "Mod+Shift+Z", scope: "editor" },
  { id: "find", group: "edit", chord: "Mod+F", scope: "window" },
  { id: "searchProject", group: "edit", chord: "Mod+Shift+F", scope: "window" },
  { id: "save", group: "edit", chord: "Mod+S", scope: "window" },

  { id: "newProject", group: "app", chord: "Mod+N", scope: "menu" },
  { id: "openProject", group: "app", chord: "Mod+O", scope: "menu" },
  { id: "closeProject", group: "app", chord: "Mod+W", scope: "menu" },
  { id: "settings", group: "app", chord: "Mod+,", scope: "window" },
  { id: "toggleSidebar", group: "app", chord: "Mod+\\", scope: "window" },
  { id: "togglePreview", group: "app", chord: "Mod+Shift+P", scope: "window" },
  { id: "shortcuts", group: "app", chord: "Mod+/", scope: "menu" },
];

export type Platform = "mac" | "win" | "linux";

/** The platform from the name that the browser gives, the cheat sheet shows this one first. */
export function platformOf(name: string): Platform {
  if (/mac|iphone|ipad/i.test(name)) return "mac";
  if (/win/i.test(name)) return "win";
  return "linux";
}

const MAC_GLYPHS: Record<string, string> = { Alt: "⌥", Shift: "⇧", Mod: "⌘" };
const MAC_ORDER = ["Alt", "Shift", "Mod"];
const PLAIN_ORDER = ["Mod", "Alt", "Shift"];

/** A chord as the keys are named on a platform, ⌥⇧⌘C on macOS and Ctrl+Alt+Shift+C elsewhere. */
export function formatChord(chord: string, platform: Platform): string {
  const parts = chord === "+" ? ["+"] : chord.split("+");
  const key = parts.at(-1) as string;
  const modifiers = parts.slice(0, -1);
  if (platform === "mac") {
    return MAC_ORDER.filter((m) => modifiers.includes(m)).map((m) => MAC_GLYPHS[m]).join("") + key.toUpperCase();
  }
  const names = PLAIN_ORDER.filter((m) => modifiers.includes(m)).map((m) => (m === "Mod" ? "Ctrl" : m));
  return [...names, key.length === 1 ? key.toUpperCase() : key].join("+");
}

/** The name of a chord for the keymap of TipTap, Mod-Alt-c. */
export function tiptapKey(chord: string): string {
  const parts = chord.split("+");
  const key = parts.at(-1) as string;
  return [...parts.slice(0, -1), key.length === 1 ? key.toLowerCase() : key].join("-");
}

/** Chords that the system, Electron or the input methods already use, a command must not take one of them. */
export const RESERVED_CHORDS: readonly string[] = ["Mod+Q", "Mod+H", "Mod+M", "Mod+Tab", "Mod+Space", "Mod+Alt+Space", "Mod+Shift+Space", "Mod+C", "Mod+V", "Mod+X", "Mod+A"];

/** Chords that two or more commands share, each listed once. */
export function clashes(commands: readonly ShortcutCommand[] = SHORTCUTS): string[] {
  const seen = new Map<string, number>();
  for (const command of commands) if (command.chord) seen.set(command.chord, (seen.get(command.chord) ?? 0) + 1);
  return [...seen.entries()].filter(([, count]) => count > 1).map(([chord]) => chord);
}

export function chordOf(id: string): string | null {
  return SHORTCUTS.find((command) => command.id === id)?.chord ?? null;
}
