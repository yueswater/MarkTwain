import { IpcChannel } from "../enums/ipc-channel.enum";

export type SearchHit = {
  documentId: string;
  /** Index of the top level block that holds the match */
  block: number;
  /** The text around the match, split so the match can be marked */
  before: string;
  match: string;
  after: string;
};

export type SearchContract = {
  /** Finds text in every document of the project, in document order */
  [IpcChannel.SearchQuery]: { req: { text: string; caseSensitive: boolean }; res: { hits: SearchHit[]; truncated: boolean } };
};
