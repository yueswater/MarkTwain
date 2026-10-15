/** Commands that the native menu sends to the renderer. */
export const MenuCommand = {
  NewProject: "project:new",
  OpenProject: "project:open",
  CloseProject: "project:close",
  Shortcuts: "help:shortcuts",
} as const;

export type MenuCommand = (typeof MenuCommand)[keyof typeof MenuCommand];

/** Event channel from main to the renderer, one way and not through IpcResult. */
export const MENU_COMMAND_CHANNEL = "menu:command";
