import { expect, test } from "../../support/test";
import { existsSync } from "node:fs";

// Runs inside the packaged app through real IPC, creating, saving, closing and reopening a project.
// This also checks that node:sqlite works in Electron on every platform.

test("a project survives being created, saved, closed, and reopened", async ({ launch }) => {
  // Path contains a space and Chinese characters
  const { app, file } = await launch({ name: "專案", projectName: "我的論文.marktwain" });
  const page = await app.firstWindow();
  await expect(page.getByRole("heading", { name: "MarkTwain" })).toBeVisible();

  const result = await page.evaluate(
    async ({ file }) => {
      const api = window.marktwain;
      const created = await api.invoke("project:create", { path: file, name: "我的論文", engine: "typst" });
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
});
