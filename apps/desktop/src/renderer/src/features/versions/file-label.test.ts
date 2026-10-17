import { describe, expect, it } from "@jest/globals";
import { fileLabel } from "./file-label";

describe("fileLabel", () => {
  it("names the config file by what it holds and keeps the other paths", () => {
    expect(fileLabel("config.yml", "Thesis settings")).toBe("Thesis settings");
    expect(fileLabel("images/a.png", "Thesis settings")).toBe("images/a.png");
  });
});
