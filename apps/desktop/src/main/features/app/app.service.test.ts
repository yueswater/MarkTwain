import { describe, expect, it } from "@jest/globals";
import { AppService } from "./app.service";

describe("AppService", () => {
  it("回傳名稱、版本與平台", () => {
    expect(new AppService().getInfo("0.1.0", "darwin")).toEqual({
      name: "MarkTwain",
      version: "0.1.0",
      platform: "darwin",
    });
  });
});
