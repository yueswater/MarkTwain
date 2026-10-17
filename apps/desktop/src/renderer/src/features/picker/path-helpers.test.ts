import { describe, expect, it } from "@jest/globals";
import { crumbsOf, isValidName, joinPath, withProjectExtension } from "./path-helpers";

describe("joinPath", () => {
  it("uses the separator of the path", () => {
    expect(joinPath("/Users/a", "論文")).toBe("/Users/a/論文");
    expect(joinPath("/", "tmp")).toBe("/tmp");
    expect(joinPath("C:\\Users\\a", "論文")).toBe("C:\\Users\\a\\論文");
    expect(joinPath("C:\\", "tmp")).toBe("C:\\tmp");
  });
});

describe("crumbsOf", () => {
  it("lists every folder with the path that opens it", () => {
    expect(crumbsOf("/Users/a/Documents")).toEqual([
      { name: "/", path: "/" },
      { name: "Users", path: "/Users" },
      { name: "a", path: "/Users/a" },
      { name: "Documents", path: "/Users/a/Documents" },
    ]);
    expect(crumbsOf("/")).toEqual([{ name: "/", path: "/" }]);
    expect(crumbsOf("C:\\Users\\a")).toEqual([
      { name: "C:", path: "C:\\" },
      { name: "Users", path: "C:\\Users" },
      { name: "a", path: "C:\\Users\\a" },
    ]);
    expect(crumbsOf("C:\\")).toEqual([{ name: "C:", path: "C:\\" }]);
  });
});

describe("names", () => {
  it("refuses an empty name and the characters that a file system refuses", () => {
    expect(isValidName("碩士論文")).toBe(true);
    expect(isValidName("  ")).toBe(false);
    expect(isValidName("a/b")).toBe(false);
    expect(isValidName("a:b")).toBe(false);
    expect(isValidName("..")).toBe(false);
  });

  it("adds the extension only when it is missing", () => {
    expect(withProjectExtension("論文", "marktwain")).toBe("論文.marktwain");
    expect(withProjectExtension("論文.marktwain", "marktwain")).toBe("論文.marktwain");
    expect(withProjectExtension("論文.MARKTWAIN", "marktwain")).toBe("論文.MARKTWAIN");
  });
});
