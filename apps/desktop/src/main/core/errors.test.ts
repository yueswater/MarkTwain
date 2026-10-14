import { describe, expect, it } from "@jest/globals";
import { ErrorCode } from "../../shared/enums/error-code.enum";
import { AppError, toErrorPayload } from "./errors";

describe("AppError", () => {
  it("帶有錯誤代碼與參數", () => {
    const error = new AppError(ErrorCode.InvalidLocale, { value: "fr" });
    expect(error.code).toBe("settings.invalid-locale");
    expect(error.params).toEqual({ value: "fr" });
    expect(error).toBeInstanceOf(Error);
  });

  it("參數預設為空物件", () => {
    expect(new AppError(ErrorCode.Unknown).params).toEqual({});
  });
});

describe("toErrorPayload", () => {
  it("AppError 轉成代碼與參數", () => {
    const payload = toErrorPayload(new AppError(ErrorCode.InvalidLocale, { value: "fr" }));
    expect(payload).toEqual({ code: "settings.invalid-locale", params: { value: "fr" } });
  });

  it("其他錯誤一律轉成 unknown，不洩漏內部訊息", () => {
    expect(toErrorPayload(new Error("secret path /Users/x"))).toEqual({
      code: "app.unknown",
      params: {},
    });
    expect(toErrorPayload("oops")).toEqual({ code: "app.unknown", params: {} });
  });
});
