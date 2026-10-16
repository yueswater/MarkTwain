import type { AssetService } from "../asset/asset.service";
import type { DocumentService } from "../document/document.service";

export type WorkingDocument = { id: string; kind: string; title: string; position: number; text: string };
/** `stamp` changes when the file is written, so a file that did not change need not be read and hashed again. */
export type WorkingFile = { path: string; data: Uint8Array; stamp: number };
export type Working = { documents: WorkingDocument[]; files: WorkingFile[] };

/** What the person is working on: the documents and the files of the project. The versions keep it and put it back. */
export interface WorkingCopy {
  read(): Working;
  /** Makes the project exactly this. It runs inside the transaction of the caller. */
  write(content: { documents: WorkingDocument[]; files: { path: string; data: Uint8Array }[] }): void;
}

/** The working copy of the open project, made of the documents and the files that the other features keep. */
export function projectWorkingCopy(documents: DocumentService, assets: AssetService): WorkingCopy {
  return {
    read: () => ({
      documents: documents.readAll().map(({ updatedAt: _updatedAt, ...document }) => document),
      files: assets.readAllFiles().map((file) => ({ path: file.path, data: file.data, stamp: file.updatedAt })),
    }),
    write: (content) => {
      documents.replaceAll(content.documents);
      assets.replaceAllFiles(content.files);
    },
  };
}
