export type BuildDocument = {
  id: string;
  kind: "abstract" | "acknowledgement" | "denotation" | "chapter" | "appendix";
  text: string;
};

export type BuildFile = { path: string; data: Uint8Array };

export type BuildInput = {
  /** Directory of the fetched TW-Thesis Typst template */
  templateDir: string;
  /** Directory under which a temporary build directory is created */
  workDir: string;
  /** Path of the typst executable */
  typst: string;
  /** Content of config.yml */
  config: string;
  /** Documents in output order */
  documents: BuildDocument[];
  /** Project files such as images, keyed by project path */
  files: BuildFile[];
  /** Bibliography files written next to the references */
  bibliography: BuildFile[];
  /** Kill typst after this many milliseconds */
  timeoutMs?: number;
  /** pdf for the final file, png for page images used by the preview, pdf when omitted */
  format?: "pdf" | "png";
  /** Resolution of the page images */
  ppi?: number;
  /** Keep the build directory, useful for debugging */
  keep?: boolean;
};

export type SourceRef = { documentId: string; block: number };

export type Diagnostic = {
  severity: "error" | "warning";
  /** Set for diagnostics that MarkTwain raises itself */
  code?: "config-missing" | "citation-no-bibliography";
  message: string;
  /** Path inside the build directory */
  file: string | null;
  line: number | null;
  column: number | null;
  /** The block of the source document that produced the line */
  source: SourceRef | null;
};

export type BuildResult =
  | { ok: true; pdf: Uint8Array; pages: Uint8Array[]; diagnostics: Diagnostic[]; mathFailures: string[] }
  | { ok: false; diagnostics: Diagnostic[]; mathFailures: string[] };
