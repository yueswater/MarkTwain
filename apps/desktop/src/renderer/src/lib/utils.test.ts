import { describe, expect, it } from "@jest/globals";
import { cn } from "@/lib/utils";

describe("cn", () => {
  it("合併 class 並略過假值", () => {
    expect(cn("a", false && "b", undefined, "c")).toBe("a c");
  });

  it("後面的 Tailwind class 覆蓋前面衝突的", () => {
    expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4");
  });
});
