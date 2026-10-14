/** Targets numbered in sequence, figures, tables, equations and listings. */
export type CountedTarget = { kind: "fig" | "tbl" | "eq" | "lst"; label: string };

/** Targets whose title is shown when referenced, chapters and sections. */
export type HeadingTarget = { kind: "cha" | "sec"; label: string; text: string };

export type Target = CountedTarget | HeadingTarget;

export type NumberingOptions = {
  /** Whether equations are numbered, matches layout.equation-numbering of config.yml */
  equationNumbering: "all" | "none";
  /** Whether numbers restart per chapter, matches settings such as layout.equation-per-chapter */
  numberPerChapter: boolean;
};

export type NumberingResult = {
  /** Display text of a label, a number or a title */
  numbers: Map<string, string>;
  /** Labels that are referenced but do not exist */
  broken: string[];
  /** Labels defined more than once */
  duplicates: string[];
};
