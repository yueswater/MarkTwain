/** Targets numbered in sequence, figures, tables, equations, listings and the blocks of a mathematical thesis, each kind counted on its own. */
export type CountedTarget = { kind: string; label: string };

/** Targets whose title is shown when referenced, chapters and sections. */
export type HeadingTarget = { kind: "cha" | "sec"; label: string; text: string };

export type Target = CountedTarget | HeadingTarget;

export type NumberingOptions = {
  /** Whether equations are numbered, matches layout.equation-numbering of config.yml */
  equationNumbering: "all" | "none";
  /** Whether equation numbers restart in each chapter, matches layout.equation-per-chapter. Other numbers run through the thesis. */
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
