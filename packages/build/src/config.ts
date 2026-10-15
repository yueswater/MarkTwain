import { parseDocument } from "yaml";

const TEXT_FIELDS = [
  "title", "title-en", "author", "author-en", "id", "advisor", "advisor-en",
  "college", "college-en", "institute", "institute-en", "degree", "degree-en", "type", "type-en",
];
const DATE_FIELDS = ["date", "oral-date"];
const LIST_FIELDS = ["keywords", "keywords-en"];

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export type CompletedConfig = {
  text: string;
  missing: string[];
  /** The statements section, which the template does not know and rejects, so it is taken out of text */
  statements: unknown;
  /** The placement section, taken out for the same reason */
  placement: unknown;
  /** The lists section, taken out for the same reason */
  lists: unknown;
  language: "chinese" | "english" | null;
};

/**
 * The template reads every metadata field and fails when one is absent.
 * Fills the gaps so a half-written project still builds, and lists what was filled.
 */
export function completeConfig(text: string, today: string): CompletedConfig {
  const doc = parseDocument(text);
  const missing: string[] = [];
  for (const key of TEXT_FIELDS) {
    const value = doc.get(key);
    if (value === undefined || value === null || String(value).trim() === "") {
      missing.push(key);
      doc.set(key, "");
    }
  }
  for (const key of DATE_FIELDS) {
    const value = String(doc.get(key) ?? "");
    if (!ISO_DATE.test(value)) {
      missing.push(key);
      doc.set(key, today);
    }
  }
  for (const key of LIST_FIELDS) {
    const value = doc.get(key, true) as { items?: unknown[] } | undefined;
    if (!value || !Array.isArray(value.items) || value.items.length === 0) {
      missing.push(key);
      doc.set(key, []);
    }
  }
  // The settings keep "none" for a thesis without a watermark, the template reads a null for that
  if (doc.getIn(["watermark", "image"]) === "none") doc.setIn(["watermark", "image"], null);
  const statements = doc.has("statements") ? (doc.get("statements", true) as { toJSON?: () => unknown } | null)?.toJSON?.() : undefined;
  const placement = doc.has("placement") ? (doc.get("placement", true) as { toJSON?: () => unknown } | null)?.toJSON?.() : undefined;
  const lists = doc.has("lists") ? (doc.get("lists", true) as { toJSON?: () => unknown } | null)?.toJSON?.() : undefined;
  doc.delete("statements");
  doc.delete("lists");
  doc.delete("placement");
  const language = doc.getIn(["layout", "language"]);
  return {
    text: doc.toString({ lineWidth: 0 }),
    missing,
    statements,
    placement,
    lists,
    language: language === "english" || language === "chinese" ? language : null,
  };
}
