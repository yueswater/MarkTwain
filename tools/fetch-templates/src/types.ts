export type TemplateName = "typ" | "tex";

export type TemplateEntry = {
  repo: string;
  tag: string;
  commit: string;
};

export type TemplateLock = {
  templates: Record<TemplateName, TemplateEntry>;
};

/** 寫在抓取結果根目錄的標記檔內容，記錄這份內容對應鎖定檔的哪個版本。 */
export type Marker = { tag: string; commit: string };
