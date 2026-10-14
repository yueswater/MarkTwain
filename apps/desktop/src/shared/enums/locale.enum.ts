/** Interface language. Defined as an as const object and not a TypeScript enum, see section 3.1 of the spec. */
export const Locale = {
  ZhHant: "zh-Hant",
  En: "en",
} as const;

export type Locale = (typeof Locale)[keyof typeof Locale];

export const SUPPORTED_LOCALES: readonly Locale[] = [Locale.ZhHant, Locale.En];
