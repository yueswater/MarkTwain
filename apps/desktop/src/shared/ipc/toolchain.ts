import { IpcChannel } from "../enums/ipc-channel.enum";

/** Whether LaTeX output can be used on this machine, and what is missing when it cannot. */
export type LatexStatus = {
  available: boolean;
  /** tex when no TeX Live is found, citation-style-language when that package is missing, template when the LaTeX template is not there */
  missing: ("tex" | "citation-style-language" | "template")[];
};

export type ToolchainContract = {
  [IpcChannel.ToolchainStatus]: { req: void; res: { latex: LatexStatus } };
};
