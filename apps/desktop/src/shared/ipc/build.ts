import { IpcChannel } from "../enums/ipc-channel.enum";

export type BuildDiagnostic = {
  severity: "error" | "warning";
  /** Set for diagnostics that MarkTwain raises itself */
  code: "config-missing" | null;
  message: string;
  file: string | null;
  line: number | null;
  /** Source document and top level block that produced the failing line */
  source: { documentId: string; block: number } | null;
};

export type BuildOutcome = {
  ok: boolean;
  diagnostics: BuildDiagnostic[];
  /** LaTeX formulas that could not be converted and are shown as source text */
  mathFailures: string[];
  /** URL the preview can load, present when ok is true */
  previewUrl: string | null;
};

export type BuildContract = {
  /** Builds the thesis PDF with the Typst template */
  [IpcChannel.BuildTypst]: { req: void; res: BuildOutcome };
};
