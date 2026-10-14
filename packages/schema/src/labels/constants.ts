import { STATEMENT_PREFIXES } from "../statements/kinds";

/** Prefix of the label, the same naming as both templates, see section 4.3 of the spec. The blocks of a mathematical thesis have a prefix each. */
export const LABEL_KINDS = ["cha", "sec", "fig", "tbl", "eq", "lst", ...STATEMENT_PREFIXES] as readonly string[] as readonly ["cha", "sec", "fig", "tbl", "eq", "lst", ...string[]];

export type LabelKind = string;

export const LABEL_PATTERN = new RegExp(`^(${LABEL_KINDS.join("|")}):[A-Za-z0-9_.:-]+$`);

/** Length of generated label names in hex digits. */
export const GENERATED_ID_LENGTH = 4;
