import { _electron as electron, expect, test } from "@playwright/test";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { findPackagedExecutable } from "./find-app";

const dist = resolve(__dirname, "../dist");

// 在打包後的程式裡，經由真正的 IPC 建立、儲存、關閉、重新開啟專案。
// 這同時驗證 `node:sqlite` 在每個平台的 Electron 裡可用（規格第 3 節）。
test("a project survives being created, saved, closed, and reopened", async () => {
  // 路徑含空白與中文（規格 9.1 節規則 2）
  const dir = mkdtempSync(join(tmpdir(), "marktwain 專案 "));
  const file = join(dir, "我的論文.marktwain");
  const args = [`--user-data-dir=${join(dir, "userData")}`, "--lang=en-US"];
  if (process.platform === "linux") args.push("--no-sandbox");

  const app = await electron.launch({ executablePath: findPackagedExecutable(dist), args });
  try {
    const page = await app.firstWindow();
    await expect(page.getByRole("heading", { name: "MarkTwain" })).toBeVisible();

    const result = await page.evaluate(
      async ({ file }) => {
        const api = window.marktwain;
        const created = await api.invoke("project:create", { path: file, name: "我的論文" });
        if (!created.ok) return { step: "create", error: created.error };
        const chapter = created.data.documents.find((d) => d.kind === "chapter");
        if (!chapter) return { step: "find chapter" };

        const saved = await api.invoke("document:save", { id: chapter.id, text: "# 緒論\r\n\r\n內文" });
        if (!saved.ok) return { step: "save", error: saved.error };
        await api.invoke("project:close");
        const none = await api.invoke("project:current");

        const reopened = await api.invoke("project:open", { path: file });
        if (!reopened.ok) return { step: "reopen", error: reopened.error };
        const doc = await api.invoke("document:get", { id: chapter.id });
        if (!doc.ok) return { step: "get", error: doc.error };

        const missing = await api.invoke("project:open", { path: file + ".missing" });
        return {
          step: "done",
          kinds: reopened.data.documents.map((d) => d.kind),
          text: doc.data.text,
          currentAfterClose: none.ok ? none.data : "error",
          missingCode: missing.ok ? "ok" : missing.error.code,
        };
      },
      { file },
    );

    expect(result).toEqual({
      step: "done",
      kinds: ["abstract", "chapter"],
      text: "# 緒論\n\n內文",
      currentAfterClose: null,
      missingCode: "project.not-found",
    });
    expect(existsSync(file)).toBe(true);
  } finally {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
