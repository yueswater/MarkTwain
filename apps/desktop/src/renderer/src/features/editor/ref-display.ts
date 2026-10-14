import { labelKind } from "@marktwain/schema";

export type RefDisplay = { text: string; broken: boolean };

/**
 * 交叉引用在編輯器裡顯示的文字：章節顯示標題，其他顯示「圖 1.1」。
 * `kindName` 把標籤前綴（fig、tbl…）轉成目前語言的名稱。
 */
export function describeRef(
  label: string,
  numbers: Readonly<Record<string, string>>,
  kindName: (kind: string) => string,
  brokenText: string,
): RefDisplay {
  const value = numbers[label];
  const kind = labelKind(label);
  if (value === undefined || kind === null) return { text: `${brokenText} ${label}`.trim(), broken: true };
  if (kind === "cha" || kind === "sec") return { text: value, broken: false };
  return { text: `${kindName(kind)} ${value}`, broken: false };
}

export function citationText(keys: readonly string[], form: string): string {
  const joined = keys.join("; ");
  switch (form) {
    case "prose":
    case "author":
    case "year":
      return joined;
    default:
      return `(${joined})`;
  }
}
