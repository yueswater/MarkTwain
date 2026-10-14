import { describe, expect, it } from "@jest/globals";
import { contrastRatio } from "./contrast";
import { palette } from "./palette";

// WCAG AA：一般文字 4.5:1，元件邊框與圖示 3:1（規格 3.6 節規則 2）
const TEXT_PAIRS: Array<[string, string, string]> = [
  ["onPrimary", palette.onPrimary, palette.primary],
  ["onPrimaryContainer", palette.onPrimaryContainer, palette.primaryContainer],
  ["onSecondary", palette.onSecondary, palette.secondary],
  ["onSecondaryContainer", palette.onSecondaryContainer, palette.secondaryContainer],
  ["onTertiary", palette.onTertiary, palette.tertiary],
  ["onTertiaryContainer", palette.onTertiaryContainer, palette.tertiaryContainer],
  ["onError", palette.onError, palette.error],
  ["onErrorContainer", palette.onErrorContainer, palette.errorContainer],
  ["onSurface on surface", palette.onSurface, palette.surface],
  ["onSurface on background", palette.onBackground, palette.background],
  ["onSurfaceVariant on surfaceVariant", palette.onSurfaceVariant, palette.surfaceVariant],
  ["onSurfaceVariant on surface", palette.onSurfaceVariant, palette.surface],
  ["primary text on surface", palette.primary, palette.surface],
  ["primary text on background", palette.primary, palette.background],
];

const COMPONENT_PAIRS: Array<[string, string, string]> = [
  ["outline on surface", palette.outline, palette.surface],
  ["outline on background", palette.outline, palette.background],
  ["primary on surface", palette.primary, palette.surface],
  ["tertiary on surface", palette.tertiary, palette.surface],
];

describe("palette contrast", () => {
  it.each(TEXT_PAIRS)("文字 %s 至少 4.5:1", (_name, foreground, background) => {
    expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(COMPONENT_PAIRS)("元件 %s 至少 3:1", (_name, foreground, background) => {
    expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(3);
  });

  it("主色是 TW-Thesis 模板的 #5820F0", () => {
    expect(palette.primary).toBe("#5820F0");
  });
});
