import { IpcChannel } from "../enums/ipc-channel.enum";

export type FontSource = "template" | "project" | "system";

export type FontFamilyEntry = {
  name: string;
  source: FontSource;
  /** Regular, Bold and so on, one for each file of the family */
  styles: string[];
  /** Names of the family in other languages */
  aliases: string[];
  /** The files of the family, with their sizes, empty for a family installed on the computer */
  files: { path: string; size: number }[];
  /** A font that the settings of the thesis name */
  used: boolean;
};

/** A name that the settings use and that no font has, so the build falls back to another font. */
export type MissingFont = { name: string; usedIn: string[] };

export type FontsView = {
  families: FontFamilyEntry[];
  missing: MissingFont[];
  /** Bytes that the fonts of the project take in the project file */
  projectBytes: number;
};

export type FontFileInput = { name: string; data: Uint8Array };

export type FontSkipReason = "notFont" | "notEmbeddable" | "duplicate" | "tooLarge";

export type FontAddResult = {
  view: FontsView;
  /** The families that were added */
  added: string[];
  skipped: { name: string; reason: FontSkipReason }[];
};

export type FontRemoveResult = {
  view: FontsView;
  removed: boolean;
  /** The settings that use the family, listed when it was not removed because of that */
  usedIn: string[];
};

export type FontContract = {
  [IpcChannel.FontList]: { req: void; res: FontsView };
  /** Stores font files in the project, the page reads the files and sends their bytes */
  [IpcChannel.FontAdd]: { req: { files: FontFileInput[] }; res: FontAddResult };
  /** Takes a family out of the project, one that the settings use stays unless force is true */
  /** The bytes of a font file of the template or of the project, so the page can draw a preview in it. Null for a path that is neither. */
  [IpcChannel.FontBytes]: { req: { source: "template" | "project"; path: string }; res: Uint8Array | null };
  [IpcChannel.FontRemove]: { req: { family: string; force: boolean }; res: FontRemoveResult };
};
