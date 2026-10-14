/** 標籤的前綴；與兩個模板的標籤命名一致（規格 4.3 節）。 */
export const LABEL_KINDS = ["cha", "sec", "fig", "tbl", "eq", "lst"] as const;

export type LabelKind = (typeof LABEL_KINDS)[number];

export const LABEL_PATTERN = /^(cha|sec|fig|tbl|eq|lst):[A-Za-z0-9_.:-]+$/;

/** 自動產生的標籤名稱長度（十六進位位數）。 */
export const GENERATED_ID_LENGTH = 4;
