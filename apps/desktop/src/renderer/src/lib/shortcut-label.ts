import { chordOf, formatChord, platformOf, type Platform } from "../../../shared/shortcuts";

/** The platform that the app runs on, read from the browser. */
export function currentPlatform(): Platform {
  return platformOf(typeof navigator === "undefined" ? "" : navigator.platform || navigator.userAgent);
}

/** A name with its shortcut after it, for a tooltip, the name alone when the action has none. */
export function withShortcut(name: string, commandId: string | undefined): string {
  const chord = commandId ? chordOf(commandId) : null;
  return chord ? `${name} (${formatChord(chord, currentPlatform())})` : name;
}
