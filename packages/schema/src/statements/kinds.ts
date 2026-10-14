/** Blocks of a mathematical thesis that are numbered by kind: definitions, lemmas, theorems and the like. */
export type StatementKind = {
  id: string;
  /** Prefix of the label that refers to a block of this kind, such as lem for lem:ss */
  prefix: string;
  /** Whether the blocks of this kind are counted and can be referred to */
  numbered: boolean;
  /** Names in the languages of the thesis */
  name: { zh: string; en: string };
  /** Default colors, the accent of the bar and the tint of the box */
  accent: string;
  background: string;
};

export const STATEMENT_KINDS: readonly StatementKind[] = [
  { id: "definition", prefix: "def", numbered: true, name: { zh: "定義", en: "Definition" }, accent: "#448AFF", background: "#E5ECF8" },
  { id: "lemma", prefix: "lem", numbered: true, name: { zh: "引理", en: "Lemma" }, accent: "#00B8D4", background: "#DEF1F4" },
  { id: "auxlemma", prefix: "alm", numbered: true, name: { zh: "輔助引理", en: "Auxiliary lemma" }, accent: "#00BFA5", background: "#DEF1EF" },
  { id: "theorem", prefix: "thm", numbered: true, name: { zh: "定理", en: "Theorem" }, accent: "#7C4DFF", background: "#EBE6F8" },
  { id: "proposition", prefix: "prp", numbered: true, name: { zh: "命題", en: "Proposition" }, accent: "#01C853", background: "#DEF2E6" },
  { id: "corollary", prefix: "cor", numbered: true, name: { zh: "推論", en: "Corollary" }, accent: "#FF9100", background: "#F8EDDE" },
  { id: "case", prefix: "cas", numbered: true, name: { zh: "情況", en: "Case" }, accent: "#9E9E9E", background: "#EEEEEE" },
  { id: "example", prefix: "exa", numbered: true, name: { zh: "範例", en: "Example" }, accent: "#64DD17", background: "#E8F5E0" },
  { id: "remark", prefix: "rem", numbered: true, name: { zh: "註記", en: "Remark" }, accent: "#00B0FF", background: "#DEF0F8" },
  // A proof has no number and is not referred to, it ends with a mark
  { id: "proof", prefix: "prf", numbered: false, name: { zh: "證明", en: "Proof" }, accent: "#616161", background: "#F2F2F2" },
];

export const STATEMENT_PREFIXES = STATEMENT_KINDS.filter((kind) => kind.numbered).map((kind) => kind.prefix);

const BY_ID = new Map(STATEMENT_KINDS.map((kind) => [kind.id, kind]));
const BY_PREFIX = new Map(STATEMENT_KINDS.map((kind) => [kind.prefix, kind]));

export function statementKind(id: string): StatementKind | undefined {
  return BY_ID.get(id);
}

export function statementKindOfPrefix(prefix: string): StatementKind | undefined {
  return BY_PREFIX.get(prefix);
}

/** The kind of a fenced div from its classes, null when it is not one of these blocks. */
export function statementOfClasses(classes: readonly string[]): StatementKind | null {
  for (const name of classes) {
    const kind = BY_ID.get(name);
    if (kind) return kind;
  }
  return null;
}

const HEX = /^#[0-9a-fA-F]{6}$/;

export function isHexColor(value: string): boolean {
  return HEX.test(value);
}

export type StatementStyle = {
  /** plain draws a bold heading and a thin rule, boxed draws the colored box of the editor */
  look: "plain" | "boxed";
  colors: Record<string, { accent: string; background: string }>;
  names: Record<string, string>;
};

/** A light tint of a color, for a background that follows an accent the author chose. */
export function tintOf(accent: string, mix = 0.12): string {
  const n = parseInt(accent.slice(1), 16);
  const channel = (shift: number) => Math.round(255 - (255 - ((n >> shift) & 255)) * mix);
  return `#${[16, 8, 0].map((shift) => channel(shift).toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}

/**
 * The look of the blocks from the settings of a thesis. A color that is not a hex value is left out, and a background
 * that is not set follows the accent.
 */
export function resolveStatementStyle(statements: unknown, language: "zh" | "en"): StatementStyle {
  const section = (statements !== null && typeof statements === "object" ? statements : {}) as Record<string, unknown>;
  const group = (key: string) => (section[key] !== null && typeof section[key] === "object" ? section[key] : {}) as Record<string, unknown>;
  const accents = group("accent");
  const given = group("name");
  const look = section.look === "boxed" ? "boxed" : "plain";
  const colors: StatementStyle["colors"] = {};
  const names: StatementStyle["names"] = {};
  for (const kind of STATEMENT_KINDS) {
    const accent = accents[kind.id];
    const set = typeof accent === "string" && isHexColor(accent);
    colors[kind.id] = set ? { accent: accent as string, background: tintOf(accent as string) } : { accent: kind.accent, background: kind.background };
    const name = given[kind.id];
    names[kind.id] = typeof name === "string" && name.trim() !== "" ? name.trim() : kind.name[language];
  }
  return { look, colors, names };
}
