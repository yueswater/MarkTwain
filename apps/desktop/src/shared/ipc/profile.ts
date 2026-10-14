import { IpcChannel } from "../enums/ipc-channel.enum";
import type { AuthorProfile } from "../profile";

export type ProfileContract = {
  [IpcChannel.ProfileGet]: { req: void; res: AuthorProfile };
  /** Applies a patch and returns the profile that is now in effect */
  [IpcChannel.ProfileSet]: { req: { patch: Partial<AuthorProfile> }; res: AuthorProfile };
};
