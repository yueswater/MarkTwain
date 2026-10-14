import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { ErrorCode } from "../../shared/enums/error-code.enum";
import { AppError } from "./errors";
import { runHandler } from "./ipc-result";

afterEach(() => {
  jest.restoreAllMocks();
});

describe("runHandler", () => {
  it("同步的回傳值包成 ok", async () => {
    expect(await runHandler((n: number) => n + 1, 1)).toEqual({ ok: true, data: 2 });
  });

  it("非同步的回傳值包成 ok", async () => {
    expect(await runHandler(async (s: string) => s.toUpperCase(), "a")).toEqual({
      ok: true,
      data: "A",
    });
  });

  it("AppError 轉成帶代碼的失敗結果", async () => {
    const result = await runHandler(() => {
      throw new AppError(ErrorCode.InvalidLocale, { value: "fr" });
    }, undefined);
    expect(result).toEqual({
      ok: false,
      error: { code: "settings.invalid-locale", params: { value: "fr" } },
    });
  });

  it("未預期的錯誤轉成 unknown，並寫到 console.error", async () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    const result = await runHandler(() => {
      throw new Error("boom");
    }, undefined);
    expect(result).toEqual({ ok: false, error: { code: "app.unknown", params: {} } });
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("AppError 不寫到 console.error", async () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    await runHandler(() => {
      throw new AppError(ErrorCode.Unknown);
    }, undefined);
    expect(spy).not.toHaveBeenCalled();
  });
});
