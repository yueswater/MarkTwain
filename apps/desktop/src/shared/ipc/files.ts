import { IpcChannel } from "../enums/ipc-channel.enum";

/** A place that the picker offers at its side, the name of a drive is its path. */
export type FilePlace = { id: "home" | "desktop" | "documents" | "downloads" | "drive"; path: string };

export type FileEntry = { name: string; kind: "dir" | "file" };

export type FileListing = {
  /** The folder that is listed */
  path: string;
  /** The folder above, null at the top */
  parent: string | null;
  entries: FileEntry[];
  places: FilePlace[];
  /** False when the folder cannot be read, the list is then empty */
  readable: boolean;
};

export type FilesContract = {
  /** Lists a folder: the folders in it, and the files that end with the extension. Null starts at the place that the picker opens on. */
  [IpcChannel.FilesList]: { req: { path: string | null; extension: string | null }; res: FileListing };
  /** Makes a folder in another folder and returns its path */
  [IpcChannel.FilesMakeFolder]: { req: { parent: string; name: string }; res: string };
};
