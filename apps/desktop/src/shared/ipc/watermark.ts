import { IpcChannel } from "../enums/ipc-channel.enum";

export type WatermarkMode = "school" | "none" | "custom";

export type WatermarkPicture = {
  name: string;
  /** A PNG as a data URL, null when the file could not be drawn */
  thumbnail: string | null;
};

export type WatermarkInfo = {
  /** Follow the school, no watermark, or an image of the project */
  mode: WatermarkMode;
  /** What the chosen school brings, null when the school has no watermark in the template */
  school: WatermarkPicture | null;
  /** The image kept in the project, also while it is not in use */
  custom: WatermarkPicture | null;
  /** Share of the page width and opacity that apply, in percent */
  width: number;
  opacity: number;
};

export type WatermarkContract = {
  [IpcChannel.WatermarkGet]: { req: void; res: WatermarkInfo };
  /** Asks for an image or PDF, stores it in the project and sets it as the watermark, null when cancelled */
  [IpcChannel.WatermarkChoose]: { req: void; res: WatermarkInfo | null };
};
