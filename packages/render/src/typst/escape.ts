/** Typst 標記模式裡有特殊意義的字元，一律加反斜線。 */
const MARKUP_SPECIAL = /[\\#$*_`<@[\]~/]/g;

export function escapeMarkup(text: string): string {
  return text
    .replace(MARKUP_SPECIAL, (ch) => `\\${ch}`)
    .replace(/^(\s*)([=\-+])(?=\s|$)/gm, "$1\\$2") // 行首的標題、清單記號
    .replace(/^(\s*)(\d+)\.(?=\s)/gm, "$1$2\\."); // 行首的編號清單記號
}

/** Typst 字串（雙引號）裡的跳脫。 */
export function escapeString(text: string): string {
  return text.replace(/[\\"]/g, (ch) => `\\${ch}`).replace(/\n/g, "\\n");
}

/** 圍欄用的反引號數量：比內容裡最長的連續反引號多一個，至少三個。 */
export function fenceFor(text: string): string {
  const longest = Math.max(0, ...[...text.matchAll(/`+/g)].map((m) => m[0].length));
  return "`".repeat(Math.max(3, longest + 1));
}

/** 零寬空格：放在函式呼叫的 `]` 與接著的 `(` 之間，避免被當成參數列。 */
export const ZWSP = "​";

/** 圖片寬度只接受「數字加單位」，其餘丟掉（避免把任意文字塞進 Typst 程式碼）。 */
export function safeLength(width: string | null): string | null {
  return width !== null && /^\d+(\.\d+)?(%|pt|cm|mm|in|em)$/.test(width) ? width : null;
}
