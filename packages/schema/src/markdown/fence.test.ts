import { describe, expect, it } from "@jest/globals";
import { fenceMarker, isFenceClose } from "./fence";
import { splitBlocks } from "./blocks";
import { parseMarkdown } from "./parse";

describe("fenceMarker", () => {
  it("三個以上的反引號或波浪線開頭是圍欄", () => {
    expect(fenceMarker("```")).toBe("```");
    expect(fenceMarker("````python {#lst:a}")).toBe("````");
    expect(fenceMarker("~~~ text")).toBe("~~~");
  });

  it("反引號圍欄的資訊字串含反引號時不是圍欄（那是行內程式碼）", () => {
    expect(fenceMarker("``` ``a ```")).toBeNull();
    expect(fenceMarker("```a`b")).toBeNull();
  });

  it("波浪線圍欄的資訊字串可以含反引號", () => {
    expect(fenceMarker("~~~ a`b")).toBe("~~~");
  });

  it("少於三個、或不在行首，都不是圍欄", () => {
    expect(fenceMarker("``a")).toBeNull();
    expect(fenceMarker("x```")).toBeNull();
  });
});

describe("isFenceClose", () => {
  it("同一個字元、至少一樣長、而且沒有其他內容", () => {
    expect(isFenceClose("```", "```")).toBe(true);
    expect(isFenceClose("`````", "```")).toBe(true);
    expect(isFenceClose("``", "```")).toBe(false);
    expect(isFenceClose("~~~", "```")).toBe(false);
    expect(isFenceClose("``` x", "```")).toBe(false);
  });
});

describe("行首的行內程式碼不會被當成圍欄", () => {
  it("splitBlocks：不吞掉後面的空行", () => {
    expect(splitBlocks("``` ``a ```\n\n後面")).toEqual(["``` ``a ```", "後面"]);
  });

  it("在 div 裡也一樣", () => {
    const markdown = "::: {.a}\n``` ``a ```\n:::\n\n# 標題";
    expect(splitBlocks(markdown)).toEqual(["::: {.a}\n``` ``a ```\n:::", "# 標題"]);
    expect((parseMarkdown(markdown).content[0] as { type: string }).type).toBe("div");
  });
});
