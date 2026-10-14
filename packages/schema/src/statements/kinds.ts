/** Blocks of a mathematical thesis that are numbered by kind: definitions, lemmas, theorems and the like. */
export type StatementKind = {
  id: string;
  /** Prefix of the label that refers to a block of this kind, such as lem for lem:ss */
  prefix: string;
  /** Whether the blocks of this kind are counted and can be referred to */
  numbered: boolean;
  /** Names in the languages of the thesis */
  name: { zh: string; en: string };
  /** Default color of the colored style of the editor, written as #RRGGBB */
  accent: string;
};

export const STATEMENT_KINDS: readonly StatementKind[] = [
  { id: "definition", prefix: "def", numbered: true, name: { zh: "定義", en: "Definition" }, accent: "#448AFF" },
  { id: "lemma", prefix: "lem", numbered: true, name: { zh: "引理", en: "Lemma" }, accent: "#00B8D4" },
  { id: "auxlemma", prefix: "alm", numbered: true, name: { zh: "輔助引理", en: "Auxiliary lemma" }, accent: "#00BFA5" },
  { id: "theorem", prefix: "thm", numbered: true, name: { zh: "定理", en: "Theorem" }, accent: "#7C4DFF" },
  { id: "proposition", prefix: "prp", numbered: true, name: { zh: "命題", en: "Proposition" }, accent: "#01C853" },
  { id: "corollary", prefix: "cor", numbered: true, name: { zh: "推論", en: "Corollary" }, accent: "#FF9100" },
  { id: "case", prefix: "cas", numbered: true, name: { zh: "情況", en: "Case" }, accent: "#9E9E9E" },
  { id: "example", prefix: "exa", numbered: true, name: { zh: "範例", en: "Example" }, accent: "#64DD17" },
  { id: "remark", prefix: "rem", numbered: true, name: { zh: "註記", en: "Remark" }, accent: "#00B0FF" },
  // A proof has no number and is not referred to, it ends with a mark
  { id: "proof", prefix: "prf", numbered: false, name: { zh: "證明", en: "Proof" }, accent: "#616161" },
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
  /** Name of every kind in the thesis, the one the author wrote or the default of the language */
  names: Record<string, string>;
};

/** The names of the blocks from the settings of a thesis, an empty name is left out. The colors belong to the editor only. */
export function resolveStatementStyle(statements: unknown, language: "zh" | "en"): StatementStyle {
  const section = (statements !== null && typeof statements === "object" ? statements : {}) as Record<string, unknown>;
  const given = (section.name !== null && typeof section.name === "object" ? section.name : {}) as Record<string, unknown>;
  const names: StatementStyle["names"] = {};
  for (const kind of STATEMENT_KINDS) {
    const name = given[kind.id];
    names[kind.id] = typeof name === "string" && name.trim() !== "" ? name.trim() : kind.name[language];
  }
  return { names };
}
