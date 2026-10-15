import { describe, expect, it } from "@jest/globals";
import { relativeTime } from "./relative-time";

const NOW = Date.UTC(2026, 9, 14, 12, 0, 0);

describe("relativeTime", () => {
  it("picks the largest fitting unit", () => {
    expect(relativeTime(NOW - 3 * 24 * 3600 * 1000, NOW, "en")).toBe("3 days ago");
    expect(relativeTime(NOW - 2 * 3600 * 1000, NOW, "en")).toBe("2 hours ago");
    expect(relativeTime(NOW - 5 * 60 * 1000, NOW, "en")).toBe("5 minutes ago");
  });

  it("says now for the last minute and follows the language", () => {
    expect(relativeTime(NOW - 10_000, NOW, "en")).toBe("now");
    expect(relativeTime(NOW - 24 * 3600 * 1000, NOW, "zh-Hant")).toBe("昨天");
  });
});
