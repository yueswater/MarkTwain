import { describe, expect, it } from "@jest/globals";
import type { TFunction } from "i18next";
import { errorMessage } from "./error-message";
import { IpcError } from "./ipc-error";

function fakeT() {
  const calls: Array<{ key: string; options: unknown }> = [];
  const t = ((key: string, options?: unknown) => {
    calls.push({ key, options });
    return `T(${key})`;
  }) as unknown as TFunction;
  return { t, calls };
}

describe("errorMessage", () => {
  it("IpcError 以代碼與參數在 diagnostics 命名空間翻譯", () => {
    const { t, calls } = fakeT();
    const message = errorMessage(
      t,
      new IpcError({ code: "settings.invalid-locale", params: { value: "fr" } }),
    );
    expect(message).toBe("T(error.settings.invalid-locale)");
    expect(calls).toEqual([
      {
        key: "error.settings.invalid-locale",
        options: { ns: "diagnostics", value: "fr" },
      },
    ]);
  });

  it("其他錯誤一律顯示 unknown", () => {
    const { t, calls } = fakeT();
    expect(errorMessage(t, new Error("boom"))).toBe("T(error.app.unknown)");
    expect(calls[0]?.options).toEqual({ ns: "diagnostics" });
  });
});
