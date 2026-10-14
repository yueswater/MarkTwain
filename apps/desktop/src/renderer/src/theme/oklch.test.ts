import { describe, expect, it } from "@jest/globals";
import { oklchToHex, readColorTokens } from "./oklch";

function channels(hex: string): [number, number, number] {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
}

describe("oklchToHex", () => {
  it("白與黑", () => {
    expect(oklchToHex(1, 0, 0)).toBe("#ffffff");
    expect(oklchToHex(0, 0, 0)).toBe("#000000");
  });

  it("灰階：oklch(0.18 0 0) 約是 #121212", () => {
    for (const channel of channels(oklchToHex(0.18, 0, 0))) {
      expect(channel).toBeGreaterThanOrEqual(17);
      expect(channel).toBeLessThanOrEqual(19);
    }
  });

  it("灰階的三個通道相同", () => {
    const [r, g, b] = channels(oklchToHex(0.53, 0, 0));
    expect(r).toBe(g);
    expect(g).toBe(b);
  });

  it("有彩度時三個通道不同，且超出色域時會被限制在 0 到 255", () => {
    const [r, g, b] = channels(oklchToHex(0.7, 0.4, 30));
    expect(r).not.toBe(b);
    for (const channel of [r, g, b]) {
      expect(channel).toBeGreaterThanOrEqual(0);
      expect(channel).toBeLessThanOrEqual(255);
    }
  });
});

describe("readColorTokens", () => {
  const css = `
    :root {
      --radius: 0.625rem;
      --background: oklch(0.995 0 0);
      --destructive: #DB2D43;
      --border: oklch(0.92 0 0);
    }
    .dark {
      --background: oklch(0.16 0 0);
    }
  `;

  it("讀出指定選擇器區塊裡的顏色，忽略不是顏色的值", () => {
    const tokens = readColorTokens(css, ":root");
    expect(Object.keys(tokens).sort()).toEqual(["background", "border", "destructive"]);
    expect(tokens.destructive).toBe("#db2d43");
  });

  it("不同區塊互不影響", () => {
    expect(readColorTokens(css, ".dark")).toEqual({ background: oklchToHex(0.16, 0, 0) });
  });

  it("找不到區塊時丟出錯誤", () => {
    expect(() => readColorTokens(css, ".missing")).toThrow(".missing");
  });
});
