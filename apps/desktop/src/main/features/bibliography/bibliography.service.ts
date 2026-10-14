import {
  appendEntry,
  collectCitations,
  detectFormat,
  duplicateKeys,
  entryAuthor,
  entryLabel,
  entryYear,
  formatEntry,
  importEntries,
  isValidBibKey,
  missingFields,
  parseBibtex,
  parseMarkdown,
  removeEntry,
  replaceEntry,
} from "@marktwain/schema";
import { ErrorCode } from "../../../shared/enums/error-code.enum";
import type { BibEntryInput, BibImportOutcome, BibItem, BibliographyView } from "../../../shared/ipc";
import type { DatabaseSession } from "../../core/database-session";
import { AppError } from "../../core/errors";
import type { DocumentService } from "../document/document.service";
import { BIBLIOGRAPHY_PATH, BibliographyRepository } from "./bibliography.repository";

const FIELD_NAME = /^[a-z][a-z0-9_-]*$/;
const TYPE_NAME = /^[a-z]+$/;

/** Cleans what the form sends, names in lower case and no empty or malformed fields. */
function normalize(entry: BibEntryInput): BibEntryInput {
  const fields: Record<string, string> = {};
  for (const [name, value] of Object.entries(entry.fields)) {
    const clean = name.trim().toLowerCase();
    const text = value.trim();
    if (FIELD_NAME.test(clean) && text !== "") fields[clean] = text;
  }
  const type = entry.type.trim().toLowerCase();
  return { type: TYPE_NAME.test(type) ? type : "misc", key: entry.key.trim(), fields };
}

/** Adds a block of text after the existing source with a blank line between. */
function appendText(text: string, block: string): string {
  const base = text.replace(/\s+$/, "");
  return `${base}${base === "" ? "" : "\n\n"}${block}\n`;
}

/** The bibliography of the project, kept as BibTeX source so comments and order of the user stay. */
export class BibliographyService {
  constructor(
    private readonly session: DatabaseSession,
    private readonly documents: DocumentService,
    private readonly now: () => Date = () => new Date(),
  ) {}

  private repository(): BibliographyRepository {
    return new BibliographyRepository(this.session.db);
  }

  /** Files for the build, empty when the project has no entry so citations stay plain text. */
  buildFiles(): { path: string; data: Uint8Array }[] {
    const text = this.repository().read();
    if (parseBibtex(text).entries.length === 0) return [];
    return [{ path: BIBLIOGRAPHY_PATH, data: Buffer.from(text, "utf8") }];
  }

  view(): BibliographyView {
    return this.describe(this.repository().read());
  }

  setText(text: string): BibliographyView {
    this.repository().write(text, this.now().getTime());
    return this.describe(text);
  }

  upsert(input: BibEntryInput, originalKey: string | null): BibliographyView {
    const entry = normalize(input);
    if (!isValidBibKey(entry.key)) throw new AppError(ErrorCode.BibliographyInvalidKey, { key: entry.key });

    const text = this.repository().read();
    const { entries } = parseBibtex(text);
    if (entry.key !== originalKey && entries.some((e) => e.key === entry.key)) {
      throw new AppError(ErrorCode.BibliographyDuplicateKey, { key: entry.key });
    }
    if (originalKey === null) return this.setText(appendEntry(text, entry));

    const target = entries.find((e) => e.key === originalKey);
    if (!target) throw new AppError(ErrorCode.BibliographyNotFound, { key: originalKey });
    return this.setText(replaceEntry(text, target, formatEntry(entry)));
  }

  remove(key: string): BibliographyView {
    const text = this.repository().read();
    const target = parseBibtex(text).entries.find((e) => e.key === key);
    if (!target) throw new AppError(ErrorCode.BibliographyNotFound, { key });
    return this.setText(removeEntry(text, target));
  }

  /** Adds the entries of a file, keys that exist stay as they are. BibTeX entries keep their own text. */
  import(name: string, source: string): BibImportOutcome {
    const format = detectFormat(name, source);
    const result = importEntries(format, source);
    const verbatim = format === "bibtex" ? new Map(parseBibtex(source).entries.map((e) => [e.key, source.slice(e.start, e.end)])) : null;

    let text = this.repository().read();
    const known = new Set(parseBibtex(text).entries.map((e) => e.key));
    const errors = [...result.errors];
    const skipped: string[] = [];
    let added = 0;
    for (const raw of result.entries) {
      const entry = normalize(raw);
      if (!isValidBibKey(entry.key)) {
        errors.push(entry.key);
        continue;
      }
      if (known.has(entry.key)) {
        skipped.push(entry.key);
        continue;
      }
      known.add(entry.key);
      const original = verbatim?.get(raw.key);
      text = original ? appendText(text, original) : appendEntry(text, entry);
      added += 1;
    }
    if (added > 0) this.repository().write(text, this.now().getTime());
    return { view: this.describe(text), added, skipped, errors };
  }

  private describe(text: string): BibliographyView {
    const { entries, errors } = parseBibtex(text);

    // Count the citations of every key per document
    const cited = new Map<string, Map<string, number>>();
    for (const summary of this.documents.list()) {
      const keys = collectCitations(parseMarkdown(this.documents.get(summary.id).text));
      for (const key of keys) {
        const perDocument = cited.get(key) ?? new Map<string, number>();
        perDocument.set(summary.id, (perDocument.get(summary.id) ?? 0) + 1);
        cited.set(key, perDocument);
      }
    }

    const items: BibItem[] = entries.map((entry) => ({
      key: entry.key,
      type: entry.type,
      fields: entry.fields,
      label: entryLabel(entry),
      author: entryAuthor(entry),
      year: entryYear(entry),
      missing: missingFields(entry),
      citedBy: [...(cited.get(entry.key) ?? [])].map(([documentId, count]) => ({ documentId, count })),
    }));
    const known = new Set(entries.map((e) => e.key));
    return {
      text,
      items,
      errors,
      duplicates: duplicateKeys(entries),
      unknown: [...cited.keys()].filter((key) => !known.has(key)),
    };
  }
}
