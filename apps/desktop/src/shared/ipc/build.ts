import { IpcChannel } from "../enums/ipc-channel.enum";

export type BuildDiagnostic = {
  severity: "error" | "warning";
  /** Set for diagnostics that MarkTwain raises itself */
  code: "config-missing" | "citation-no-bibliography" | null;
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
  /** Number of page images of the preview, 0 when the build failed */
  pageCount: number;
  /** Grows with every successful build, part of the page image URLs so they are never cached */
  revision: number;
};

export type BuildContract = {
  /** Builds the thesis PDF with the Typst template */
  [IpcChannel.BuildTypst]: { req: void; res: BuildOutcome };
};
