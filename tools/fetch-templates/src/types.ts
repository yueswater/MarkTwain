export type TemplateName = "typ" | "tex";

export type TemplateEntry = {
  repo: string;
  tag: string;
  commit: string;
};

export type TemplateLock = {
  templates: Record<TemplateName, TemplateEntry>;
};

/** Content of the marker file in the root of a fetched template, it records which version of the lock file this content matches. */
export type Marker = { tag: string; commit: string };
