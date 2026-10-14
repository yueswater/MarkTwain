import type { NumberingOptions } from "@marktwain/schema";

/** Default numbering options for the preview, replaced by the settings of the project when one is open. */
export const DEFAULT_NUMBERING: NumberingOptions = {
  equationNumbering: "all",
  numberPerChapter: false,
};
