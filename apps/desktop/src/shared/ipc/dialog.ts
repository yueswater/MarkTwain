import { IpcChannel } from "../enums/ipc-channel.enum";

export type DialogContract = {
  /** The path that the test hook gives for a project, null in real use. The person chooses it in the picker of the app. */
  [IpcChannel.DialogForcedProjectPath]: { req: void; res: string | null };
};
