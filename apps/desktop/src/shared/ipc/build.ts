import { IpcChannel } from "../enums/ipc-channel.enum";

export type BuildDiagnostic = {
  severity: "error" | "warning";
  /** Set for diagnostics that MarkTwain raises itself */
  code: "config-missing" | "citation-no-bibliography" | "citation-unknown" | "image-missing" | "image-unreadable" | "glyph-missing" | "reference-broken" | "label-duplicate" | "latex-approximate" | null;
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
  /** Number of pages of the preview, 0 when the build failed */
  pageCount: number;
  /** Grows with every successful build, part of the URL of the PDF so it is never cached */
  revision: number;
  /** Where every top level block landed, the id is the document and the index of the block, so the preview can follow the editor and the other way round */
  anchors: BuildAnchor[];
};

/** The page counted from 1 and the distance from the top of the page in points. */
export type BuildAnchor = { id: string; page: number; y: number };

export type BuildContract = {
  /** Turns the watermark of the thesis on or off for the builds of the preview, off by default */
  [IpcChannel.BuildSetWatermark]: { req: { on: boolean }; res: void };
  /** Builds the thesis PDF with the Typst template */
  [IpcChannel.BuildTypst]: { req: void; res: BuildOutcome };
};
