import { expect, test } from "../../support/test";
import { createProject, seedChapter } from "../../support/project";
import { viewerState } from "../../support/preview-viewer";

test("the preview asks no server for anything, it is an app that works offline", async ({ launch }) => {
  const { app } = await launch({ name: "離線" });
  const page = await app.firstWindow();
  const asked: string[] = [];
  const refused: string[] = [];
  page.on("request", (request) => {
    if (/^https?:/i.test(request.url())) asked.push(request.url());
  });
  page.on("console", (message) => {
    if (/Content Security Policy/i.test(message.text())) refused.push(message.text().slice(0, 160));
  });
  await createProject(page);
  await seedChapter(page, "# 離線\n\n內文。\n");
  await page.getByRole("button", { name: "Preview", exact: true }).click();
  await expect.poll(async () => (await viewerState(page))?.total ?? 0, { timeout: 90_000 }).toBeGreaterThan(0);
  await page.waitForTimeout(2000);
  expect(asked).toEqual([]);
  expect(refused).toEqual([]);
});
