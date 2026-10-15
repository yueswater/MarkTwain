import { describe, expect, it } from "@jest/globals";
import { headingName } from "./heading-names";

describe("headingName", () => {
  it("takes the chosen name and falls back to the default for an empty one", () => {
    expect(headingName(2, ["節", "", ""], "Section")).toBe("節");
    expect(headingName(3, ["節", "", ""], "Subsection")).toBe("Subsection");
    expect(headingName(4, ["", "", " 目 "], "x")).toBe("目");
    expect(headingName(2, [], "Section")).toBe("Section");
  });
});
