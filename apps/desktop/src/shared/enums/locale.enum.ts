/** 介面語言。以 `as const` 物件定義，不用 TypeScript 的 `enum`（規格 3.1 節）。 */
export const Locale = {
  ZhHant: "zh-Hant",
  En: "en",
} as const;

export type Locale = (typeof Locale)[keyof typeof Locale];

export const SUPPORTED_LOCALES: readonly Locale[] = [Locale.ZhHant, Locale.En];
