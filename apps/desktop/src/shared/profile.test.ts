import { describe, expect, it } from "@jest/globals";
import { defaultFields } from "@marktwain/schema";
import { DEFAULT_PROFILE, applyProfile, isEmptyProfile, profileFromFields, sanitizeProfile } from "./profile";

describe("profile", () => {
  it("keeps text fields and the switch, and ignores everything else", () => {
    const profile = sanitizeProfile({ author: "  王小明 ", id: 123, ask: false, unknown: "x", school: "ntu" });
    expect(profile).toMatchObject({ author: "王小明", id: "", ask: false, school: "ntu" });
    expect(sanitizeProfile(null)).toEqual(DEFAULT_PROFILE);
    expect(sanitizeProfile("text")).toEqual(DEFAULT_PROFILE);
  });

  it("cuts a very long value", () => {
    expect(sanitizeProfile({ author: "a".repeat(500) }).author).toHaveLength(200);
  });

  it("merges with the earlier profile", () => {
    const base = sanitizeProfile({ author: "甲", school: "ntu" });
    expect(sanitizeProfile({ author: "乙" }, base)).toMatchObject({ author: "乙", school: "ntu" });
  });

  it("knows an empty profile", () => {
    expect(isEmptyProfile(DEFAULT_PROFILE)).toBe(true);
    expect(isEmptyProfile(sanitizeProfile({ author: "甲" }))).toBe(false);
    expect(isEmptyProfile(sanitizeProfile({ ask: false }))).toBe(true);
  });

  it("fills only what the thesis has not got yet", () => {
    const profile = sanitizeProfile({ author: "甲", id: "123", school: "ntu" });
    const fields = { ...defaultFields(), title: "題", author: "已經有的", school: "" };
    const merged = applyProfile(fields, profile);
    expect(merged).toMatchObject({ author: "已經有的", id: "123", school: "ntu", title: "題" });
  });

  it("keeps the facts of an author and not the facts of a thesis", () => {
    const profile = profileFromFields({ ...defaultFields(), title: "題", advisor: "老師", author: "甲", school: "ntu" }, false);
    expect(profile).toMatchObject({ author: "甲", school: "ntu", ask: false });
    expect(Object.keys(profile)).not.toContain("title");
    expect(Object.keys(profile)).not.toContain("advisor");
  });
});
