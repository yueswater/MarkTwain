import { describe, expect, it } from "@jest/globals";
import { checkName, isLabelUsed, labelOfName, nameOfLabel } from "./equation-name";

describe("equation names", () => {
  it("turns a name into a label and back", () => {
    expect(labelOfName("payoff1")).toBe("eq:payoff1");
    expect(nameOfLabel("eq:payoff1")).toBe("payoff1");
    expect(nameOfLabel(null)).toBe("");
    expect(nameOfLabel("fig:a")).toBe("");
  });

  it("accepts letters and digits only", () => {
    expect(checkName("payoff1", new Set(), null)).toBeNull();
    expect(checkName("pay-off", new Set(), null)).toBe("chars");
    expect(checkName("收益", new Set(), null)).toBe("chars");
    expect(checkName("a b", new Set(), null)).toBe("chars");
    expect(checkName("", new Set(), null)).toBe("chars");
  });

  it("refuses a name that another target has, but keeps the name of the formula itself", () => {
    const taken = new Set(["eq:one", "eq:two"]);
    expect(checkName("one", taken, null)).toBe("taken");
    expect(checkName("one", taken, "eq:one")).toBeNull();
    expect(checkName("three", taken, "eq:one")).toBeNull();
  });

  it("keeps an existing name with other characters until it is changed", () => {
    expect(checkName("bench-payoff", new Set(["eq:bench-payoff"]), "eq:bench-payoff")).toBeNull();
    expect(checkName("bench-payoff2", new Set(), "eq:bench-payoff")).toBe("chars");
  });

  it("knows when a label is referred to", () => {
    expect(isLabelUsed("eq:a", ["eq:a"], [])).toBe(true);
    expect(isLabelUsed("eq:a", [], ["eq:a"])).toBe(true);
    expect(isLabelUsed("eq:a", ["eq:b"], ["eq:c"])).toBe(false);
  });
});
