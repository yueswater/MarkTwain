/** 依序編號的目標：圖、表、公式、程式碼。 */
export type CountedTarget = { kind: "fig" | "tbl" | "eq" | "lst"; label: string };

/** 引用時顯示標題文字的目標：章與節。 */
export type HeadingTarget = { kind: "cha" | "sec"; label: string; text: string };

export type Target = CountedTarget | HeadingTarget;

export type NumberingOptions = {
  /** 公式是否編號，對應 config.yml 的 layout.equation-numbering */
  equationNumbering: "all" | "none";
  /** 編號是否逐章重編，對應 layout.equation-per-chapter 一類的設定 */
  numberPerChapter: boolean;
};

export type NumberingResult = {
  /** 標籤對應的顯示文字（編號或標題） */
  numbers: Map<string, string>;
  /** 被引用但不存在的標籤 */
  broken: string[];
  /** 定義了不只一次的標籤 */
  duplicates: string[];
};
