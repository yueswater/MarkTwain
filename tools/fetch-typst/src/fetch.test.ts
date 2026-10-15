import { describe, expect, it } from "@jest/globals";
import { archiveStem, assetUrl, binaryName, hostKey, isUpToDate, packageUrl, sha256Of, verifySha256 } from "./fetch";

const HASH = "a".repeat(64);

describe("hostKey", () => {
  it("把 Node 的平台與架構對應到鎖定檔的鍵", () => {
    expect(hostKey("darwin", "arm64")).toBe("mac-arm64");
    expect(hostKey("darwin", "x64")).toBe("mac-x64");
    expect(hostKey("win32", "x64")).toBe("win-x64");
    expect(hostKey("linux", "x64")).toBe("linux-x64");
  });

  it("沒有釘選的組合回傳 null", () => {
    expect(hostKey("linux", "arm64")).toBeNull();
    expect(hostKey("win32", "arm64")).toBeNull();
    expect(hostKey("freebsd", "x64")).toBeNull();
  });
});

describe("binaryName", () => {
  it("Windows 用 typst.exe，其他用 typst", () => {
    expect(binaryName("win-x64")).toBe("typst.exe");
    expect(binaryName("mac-arm64")).toBe("typst");
    expect(binaryName("linux-x64")).toBe("typst");
  });
});

describe("urls", () => {
  it("組出 release 與套件的下載網址", () => {
    expect(assetUrl("0.15.1", { asset: "typst-x86_64-pc-windows-msvc.zip", sha256: HASH })).toBe(
      "https://github.com/typst/typst/releases/download/v0.15.1/typst-x86_64-pc-windows-msvc.zip",
    );
    expect(packageUrl({ name: "kouhu", version: "0.2.0", sha256: HASH })).toBe("https://packages.typst.org/preview/kouhu-0.2.0.tar.gz");
  });

  it("壓縮檔內的資料夾名稱是去掉副檔名的資產名稱", () => {
    expect(archiveStem("typst-aarch64-apple-darwin.tar.xz")).toBe("typst-aarch64-apple-darwin");
    expect(archiveStem("typst-x86_64-pc-windows-msvc.zip")).toBe("typst-x86_64-pc-windows-msvc");
  });
});

describe("verifySha256", () => {
  const data = new TextEncoder().encode("hello");
  const expected = "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824";

  it("雜湊值一致時通過", () => {
    expect(sha256Of(data)).toBe(expected);
    expect(() => verifySha256(data, expected, "x")).not.toThrow();
  });

  it("雜湊值不符時拒絕並說明兩個值", () => {
    expect(() => verifySha256(data, HASH, "typst.zip")).toThrow(`typst.zip: sha256 不符，鎖定檔為 ${HASH}，下載的內容為 ${expected}`);
  });
});

describe("isUpToDate", () => {
  it("版本與雜湊都一致時為 true", () => {
    expect(isUpToDate({ version: "0.15.1", sha256: HASH }, "0.15.1", HASH)).toBe(true);
  });

  it("版本或雜湊不同時為 false", () => {
    expect(isUpToDate({ version: "0.15.0", sha256: HASH }, "0.15.1", HASH)).toBe(false);
    expect(isUpToDate({ version: "0.15.1", sha256: "b".repeat(64) }, "0.15.1", HASH)).toBe(false);
  });

  it("標記檔不是物件時為 false", () => {
    expect(isUpToDate(null, "0.15.1", HASH)).toBe(false);
    expect(isUpToDate("x", "0.15.1", HASH)).toBe(false);
  });
});
