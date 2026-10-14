/** Prefix of the label, the same naming as both templates, see section 4.3 of the spec. */
export const LABEL_KINDS = ["cha", "sec", "fig", "tbl", "eq", "lst"] as const;

export type LabelKind = (typeof LABEL_KINDS)[number];

export const LABEL_PATTERN = /^(cha|sec|fig|tbl|eq|lst):[A-Za-z0-9_.:-]+$/;

/** Length of generated label names in hex digits. */
export const GENERATED_ID_LENGTH = 4;
