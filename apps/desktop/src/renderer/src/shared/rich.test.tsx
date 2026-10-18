import { describe, expect, it } from "@jest/globals";
import { renderToStaticMarkup } from "react-dom/server";
import { plain, Rich } from "./rich";

describe("rich text", () => {
  it("renders bold and code spans and leaves the rest as text", () => {
    const html = renderToStaticMarkup(<Rich text="將移除 <b>a1</b>，用 <c>{page}</c> 代表頁碼" />);
    expect(html).toContain("<strong");
    expect(html).toContain(">a1</strong>");
    expect(html).toContain(">{page}</code>");
    expect(html.startsWith("將移除 ")).toBe(true);
  });

  it("drops the markup for plain places", () => {
    expect(plain("還原 <b>第一版</b>，鍵 <c>Esc</c>")).toBe("還原 第一版，鍵 Esc");
    expect(plain("no markup")).toBe("no markup");
  });

  it("keeps an unmatched angle bracket as text", () => {
    expect(renderToStaticMarkup(<Rich text="a < b" />)).toBe("a &lt; b");
  });
});
