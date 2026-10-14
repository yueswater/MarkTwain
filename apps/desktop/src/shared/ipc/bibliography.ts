import { IpcChannel } from "../enums/ipc-channel.enum";

export type BibItem = {
  key: string;
  /** Entry type in lower case, such as article or book */
  type: string;
  fields: Record<string, string>;
  /** Short name for lists, such as the first author and the year */
  label: string;
  /** Short author text and the year, the editor builds the text of a citation from them */
  author: string;
  year: string;
  /** Required fields that are empty */
  missing: string[];
  /** Documents that cite the entry with the number of citations in each */
  citedBy: { documentId: string; count: number }[];
};

export type BibliographyView = {
  /** The whole BibTeX source of the project */
  text: string;
  items: BibItem[];
  /** Parts of the source that could not be read */
  errors: { message: string; line: number }[];
  /** Keys that are used by more than one entry */
  duplicates: string[];
  /** Keys that documents cite but no entry has */
  unknown: string[];
};

export type BibEntryInput = { type: string; key: string; fields: Record<string, string> };

export type BibImportOutcome = {
  view: BibliographyView;
  added: number;
  /** Keys that were already there and were left as they are */
  skipped: string[];
  errors: string[];
};

export type BibliographyContract = {
  /** Reads the bibliography with its entries, problems and where each entry is cited */
  [IpcChannel.BibliographyGet]: { req: void; res: BibliographyView };
  /** Replaces the whole source, used by the source mode */
  [IpcChannel.BibliographySetText]: { req: { text: string }; res: BibliographyView };
  /** Adds an entry, or changes the entry with originalKey. Citations of an old key are not renamed. */
  [IpcChannel.BibliographyUpsert]: { req: { entry: BibEntryInput; originalKey: string | null }; res: BibliographyView };
  [IpcChannel.BibliographyRemove]: { req: { key: string }; res: BibliographyView };
  /** Adds entries from a BibTeX, CSL JSON or Hayagriva file, the format comes from the name and the content */
  [IpcChannel.BibliographyImport]: { req: { name: string; text: string }; res: BibImportOutcome };
};
