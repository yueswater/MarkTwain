/** 原生選單送給前端的指令。 */
export const MenuCommand = {
  NewProject: "project:new",
  OpenProject: "project:open",
  CloseProject: "project:close",
} as const;

export type MenuCommand = (typeof MenuCommand)[keyof typeof MenuCommand];

/** main 送給前端的事件頻道（單向，不經過 IpcResult）。 */
export const MENU_COMMAND_CHANNEL = "menu:command";
