import { describe, expect, it } from "@jest/globals";
import { charDiff } from "./char-diff";

type Runs = ReturnType<typeof charDiff>;
const text = (runs: Runs, type: "same" | "removed" | "added") => runs.filter((run) => run.type === type).map((run) => run.text).join("");
/** The old text and the new text, read back from the runs in order. */
const oldOf = (runs: Runs) => runs.filter((run) => run.type !== "added").map((run) => run.text).join("");
const newOf = (runs: Runs) => runs.filter((run) => run.type !== "removed").map((run) => run.text).join("");

describe("charDiff", () => {
  it("is one run when the texts are the same, and none for two empty texts", () => {
    expect(charDiff("same", "same")).toEqual([{ type: "same", text: "same" }]);
    expect(charDiff("", "")).toEqual([]);
  });

  it("shows what was added in the middle and at the ends", () => {
    expect(charDiff("ac", "abc")).toEqual([{ type: "same", text: "a" }, { type: "added", text: "b" }, { type: "same", text: "c" }]);
    expect(charDiff("abc", "abcd")).toEqual([{ type: "same", text: "abc" }, { type: "added", text: "d" }]);
  });

  it("shows what was removed and what was replaced", () => {
    expect(charDiff("abc", "ac")).toEqual([{ type: "same", text: "a" }, { type: "removed", text: "b" }, { type: "same", text: "c" }]);
    expect(charDiff("cat", "cot")).toEqual([{ type: "same", text: "c" }, { type: "removed", text: "a" }, { type: "added", text: "o" }, { type: "same", text: "t" }]);
  });

  it("keeps Chinese characters whole and finds the words that changed", () => {
    const runs = charDiff("本文比較兩種時序規則。", "本文比較三種時序規則，並加上說明。");
    expect(oldOf(runs)).toBe("本文比較兩種時序規則。");
    expect(newOf(runs)).toBe("本文比較三種時序規則，並加上說明。");
    expect(text(runs, "removed")).toContain("兩");
    expect(text(runs, "added")).toContain("三");
  });

  it("gives back both texts from its runs, whatever they are", () => {
    for (const [a, b] of [["abcdef", "azced"], ["", "new"], ["old", ""], ["😀a", "a😀"]] as const) {
      const runs = charDiff(a, b);
      expect(oldOf(runs)).toBe(a);
      expect(newOf(runs)).toBe(b);
    }
  });

  it("shows a stretch that is too long as removed and added, without taking long", () => {
    const old = "a".repeat(4000);
    const next = "b".repeat(4000);
    const started = Date.now();
    expect(charDiff(old, next)).toEqual([{ type: "removed", text: old }, { type: "added", text: next }]);
    expect(Date.now() - started).toBeLessThan(500);
  });
});
