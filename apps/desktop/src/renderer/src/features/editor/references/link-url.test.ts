import { describe, expect, it } from "@jest/globals";
import { normalizeUrl } from "./link-url";

describe("normalizeUrl", () => {
  it("keeps a web address and a mail address as they are", () => {
    expect(normalizeUrl("https://example.com/a?b=1#c")).toBe("https://example.com/a?b=1#c");
    expect(normalizeUrl("http://example.com")).toBe("http://example.com");
    expect(normalizeUrl("mailto:me@example.com")).toBe("mailto:me@example.com");
  });

  it("puts https in front of an address that has no protocol, and trims it", () => {
    expect(normalizeUrl("  example.com  ")).toBe("https://example.com");
    expect(normalizeUrl("www.example.com/path")).toBe("https://www.example.com/path");
    expect(normalizeUrl("example.com:8080/x")).toBe("https://example.com:8080/x");
    expect(normalizeUrl("localhost:3000")).toBe("https://localhost:3000");
  });

  it("refuses what is not an address or has a protocol that could run something", () => {
    for (const bad of ["", "   ", "hello", "two words.com", "javascript:alert(1)", "data:text/html,x", "file:///etc/passwd", "ftp://example.com", "https://"]) {
      expect(normalizeUrl(bad)).toBeNull();
    }
  });
});
