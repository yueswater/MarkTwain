/**
 * 程式碼圍欄的開頭與結尾判斷，`splitBlocks` 與 div 規則共用，兩邊才不會看法不一致。
 *
 * CommonMark：反引號圍欄的資訊字串不能含反引號，所以 `` ``` ``a ``` `` 是行內程式碼，
 * 不是圍欄；波浪線圍欄沒有這個限制。
 */
export function fenceMarker(line: string): string | null {
  const backticks = /^(`{3,})([^`]*)$/.exec(line);
  if (backticks) return backticks[1] ?? null;
  const tildes = /^(~{3,})/.exec(line);
  return tildes ? (tildes[1] ?? null) : null;
}

/** 結尾的圍欄：同一個字元、至少一樣長、行上沒有其他內容。 */
export function isFenceClose(line: string, marker: string): boolean {
  const bare = line.trim();
  return bare.length >= marker.length && bare === marker.charAt(0).repeat(bare.length);
}
