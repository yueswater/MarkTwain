import { describe, expect, it } from "@jest/globals";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseLock } from "./lock";

const HASH = "a".repeat(64);

function lockObject(): Record<string, any> {
  return {
    version: "0.15.1",
    platforms: {
      "mac-arm64": { asset: "typst-aarch64-apple-darwin.tar.xz", sha256: HASH },
      "mac-x64": { asset: "typst-x86_64-apple-darwin.tar.xz", sha256: HASH },
      "win-x64": { asset: "typst-x86_64-pc-windows-msvc.zip", sha256: HASH },
      "linux-x64": { asset: "typst-x86_64-unknown-linux-musl.tar.xz", sha256: HASH },
    },
    packages: [{ name: "kouhu", version: "0.2.0", sha256: HASH }],
  };
}

describe("parseLock", () => {
  it("解析有效的鎖定檔", () => {
    const lock = parseLock(JSON.stringify(lockObject()));
    expect(lock.version).toBe("0.15.1");
    expect(lock.platforms["win-x64"].asset).toBe("typst-x86_64-pc-windows-msvc.zip");
    expect(lock.packages).toEqual([{ name: "kouhu", version: "0.2.0", sha256: HASH }]);
  });

  it("接受專案根目錄的 typst.lock.json", () => {
    const text = readFileSync(resolve(__dirname, "../../../typst.lock.json"), "utf8");
    const lock = parseLock(text);
    expect(lock.version).toBe("0.15.1");
    expect(lock.packages.map((p) => `${p.name}@${p.version}`)).toEqual(["kouhu@0.2.0", "ipsum@0.1.0"]);
  });

  it("不是 JSON 時拋錯", () => {
    expect(() => parseLock("not json")).toThrow("不是有效的 JSON");
  });

  it("版本格式錯誤時拋錯", () => {
    const lock = lockObject();
    lock.version = "latest";
    expect(() => parseLock(JSON.stringify(lock))).toThrow('"version"');
  });

  it("缺少某個平台時拋錯", () => {
    const lock = lockObject();
    delete lock.platforms["linux-x64"];
    expect(() => parseLock(JSON.stringify(lock))).toThrow('缺少 "linux-x64"');
  });

  it("雜湊不是 64 位十六進位時拋錯", () => {
    const lock = lockObject();
    lock.platforms["mac-x64"].sha256 = "abc";
    expect(() => parseLock(JSON.stringify(lock))).toThrow('"mac-x64".sha256');
  });

  it("資產檔名不是壓縮檔時拋錯", () => {
    const lock = lockObject();
    lock.platforms["win-x64"].asset = "../typst.exe";
    expect(() => parseLock(JSON.stringify(lock))).toThrow('"win-x64".asset');
  });

  it("套件名稱或雜湊錯誤時拋錯", () => {
    const badName = lockObject();
    badName.packages[0].name = "../x";
    expect(() => parseLock(JSON.stringify(badName))).toThrow("packages[0].name");

    const badHash = lockObject();
    badHash.packages[0].sha256 = "zz";
    expect(() => parseLock(JSON.stringify(badHash))).toThrow("packages[0].sha256");
  });

  it("缺少 packages 時拋錯", () => {
    const lock = lockObject();
    delete lock.packages;
    expect(() => parseLock(JSON.stringify(lock))).toThrow('缺少 "packages"');
  });
});
