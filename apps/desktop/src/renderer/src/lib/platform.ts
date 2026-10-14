/** The modifier key as people read it on this computer, the command key on a Mac and Ctrl elsewhere. */
export function modKeyLabel(): string {
  const platform = typeof navigator === "undefined" ? "" : navigator.platform;
  return /Mac|iPhone|iPad/i.test(platform) ? "⌘" : "Ctrl+";
}
