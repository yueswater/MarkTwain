import { Menu, shell, type MenuItemConstructorOptions } from "electron";
import type { TFunction } from "i18next";
import { MenuCommand } from "../../shared/ipc/menu";

export type MenuActions = {
  /** Sends a command to the current window */
  send: (command: MenuCommand) => void;
  isDev: boolean;
  websiteUrl: string;
};

/** Builds the application menu for the current language, rebuilt when the language changes. */
export function buildAppMenu(t: TFunction, actions: MenuActions): Menu {
  const isMac = process.platform === "darwin";

  const file: MenuItemConstructorOptions = {
    label: t("file.label"),
    submenu: [
      { label: t("file.newProject"), accelerator: "CmdOrCtrl+N", click: () => actions.send(MenuCommand.NewProject) },
      { label: t("file.openProject"), accelerator: "CmdOrCtrl+O", click: () => actions.send(MenuCommand.OpenProject) },
      { label: t("file.closeProject"), accelerator: "CmdOrCtrl+W", click: () => actions.send(MenuCommand.CloseProject) },
      ...(isMac ? [] : [{ type: "separator" as const }, { label: t("file.quit"), role: "quit" as const }]),
    ],
  };

  const edit: MenuItemConstructorOptions = {
    label: t("edit.label"),
    submenu: [
      { label: t("edit.undo"), role: "undo" },
      { label: t("edit.redo"), role: "redo" },
      { type: "separator" },
      { label: t("edit.cut"), role: "cut" },
      { label: t("edit.copy"), role: "copy" },
      { label: t("edit.paste"), role: "paste" },
      { label: t("edit.selectAll"), role: "selectAll" },
    ],
  };

  const view: MenuItemConstructorOptions = {
    label: t("view.label"),
    submenu: [
      { label: t("view.zoomIn"), role: "zoomIn" },
      { label: t("view.zoomOut"), role: "zoomOut" },
      { label: t("view.resetZoom"), role: "resetZoom" },
      { type: "separator" },
      { label: t("view.fullscreen"), role: "togglefullscreen" },
      ...(actions.isDev ? [{ label: t("view.devTools"), role: "toggleDevTools" as const }] : []),
    ],
  };

  const window: MenuItemConstructorOptions = {
    label: t("window.label"),
    submenu: [
      { label: t("window.minimize"), role: "minimize" },
      { label: t("window.close"), role: "close" },
    ],
  };

  const help: MenuItemConstructorOptions = {
    label: t("help.label"),
    submenu: [
      { label: t("help.shortcuts"), accelerator: "CmdOrCtrl+/", click: () => actions.send(MenuCommand.Shortcuts) },
      { label: t("help.website"), click: () => void shell.openExternal(actions.websiteUrl) },
    ],
  };

  const template: MenuItemConstructorOptions[] = [
    ...(isMac ? [{ role: "appMenu" as const }] : []),
    file,
    edit,
    view,
    window,
    help,
  ];
  return Menu.buildFromTemplate(template);
}
