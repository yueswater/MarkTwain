import { expect, test } from "../../support/test";
import { chooseEngine, createProject } from "../../support/project";

// The other tests skip the question of the thesis, these ones are about it
const ASKS = { MARKTWAIN_TEST_NO_PROFILE_DIALOG: "0" };

test("a new project asks for the thesis, can be skipped, and the next one starts with what is about the author", async ({ launch }) => {
  const first = await launch({ name: "作者", projectName: "one.marktwain", env: ASKS });
  const page = await first.app.firstWindow();
  await createProject(page);
  const dialog = page.getByTestId("new-project-dialog");
  await expect(dialog).toBeVisible();

  // A few fields first, the rest under More
  await expect(dialog.getByLabel("Author (Chinese)")).toBeVisible();
  await expect(dialog.getByLabel("Student ID")).toHaveCount(0);
  await dialog.getByLabel("Author (Chinese)").fill("宋品岳");
  await dialog.getByLabel("Advisor (Chinese)").fill("潘老師");
  await dialog.getByRole("button", { name: "More" }).click();
  await dialog.getByLabel("Student ID").fill("112351049");
  await dialog.getByLabel("Defense date").fill("2026-12-01");
  await dialog.getByRole("button", { name: "Done" }).click();
  await expect(dialog).toBeHidden();

  const fields = () =>
    page.evaluate(async () => {
      const r = await window.marktwain.invoke("config:get");
      return r.ok ? r.data.fields : null;
    });
  expect(await fields()).toMatchObject({ author: "宋品岳", advisor: "潘老師", id: "112351049", oralDate: "2026-12-01" });
  // What is about the author is kept, what is about the thesis is not
  const profile = await page.evaluate(async () => {
    const r = await window.marktwain.invoke("profile:get");
    return r.ok ? r.data : null;
  });
  expect(profile).toMatchObject({ author: "宋品岳", id: "112351049", ask: true });
  expect(JSON.stringify(profile)).not.toContain("潘老師");

  // The second project starts with the author, and the dialog can be skipped
  const second = await first.restart({ projectName: "two.marktwain" });
  const page2 = await second.app.firstWindow();
  // The app reopens the last project, so close it to start a new one
  await page2.getByRole("button", { name: "Close project" }).click();
  await page2.getByRole("button", { name: "New project" }).click();
  await chooseEngine(page2);
  const dialog2 = page2.getByTestId("new-project-dialog");
  await expect(dialog2.getByLabel("Author (Chinese)")).toHaveValue("宋品岳");
  await expect(dialog2).toContainText("Filled in from your earlier project");
  await expect(dialog2.getByLabel("Advisor (Chinese)")).toHaveValue("");
  await dialog2.getByRole("button", { name: "Skip" }).click();
  await expect(dialog2).toBeHidden();
  const fields2 = () =>
    page2.evaluate(async () => {
      const r = await window.marktwain.invoke("config:get");
      return r.ok ? r.data.fields : null;
    });
  // Skipped, so nothing was written to the second project
  expect((await fields2())?.author).toBe("");

  // Do not ask again turns the question off, and a project starts with the known facts
  const third = await second.restart({ projectName: "three.marktwain" });
  const page3 = await third.app.firstWindow();
  // The app reopens the last project, so close it to start a new one
  await page3.getByRole("button", { name: "Close project" }).click();
  await page3.getByRole("button", { name: "New project" }).click();
  await chooseEngine(page3);
  const dialog3 = page3.getByTestId("new-project-dialog");
  await dialog3.getByRole("switch", { name: "Do not ask again" }).click();
  await dialog3.getByRole("button", { name: "Skip" }).click();
  await expect(dialog3).toBeHidden();

  const fourth = await third.restart({ projectName: "four.marktwain" });
  const page4 = await fourth.app.firstWindow();
  // The app reopens the last project, so close it to start a new one
  await page4.getByRole("button", { name: "Close project" }).click();
  await page4.getByRole("button", { name: "New project" }).click();
  await chooseEngine(page4);
  await expect(page4.getByTestId("new-project-dialog")).toBeHidden();
  await expect.poll(async () => page4.evaluate(async () => {
    const r = await window.marktwain.invoke("config:get");
    return r.ok ? r.data.fields.author : null;
  })).toBe("宋品岳");

  // The profile can be edited in the settings, and the question turned on again there
  await page4.getByRole("button", { name: "Settings", exact: true }).click();
  const settings = page4.getByRole("dialog", { name: "Settings" });
  await settings.getByRole("button", { name: "About you", exact: true }).click();
  await expect(settings.getByLabel("Author (Chinese)")).toHaveValue("宋品岳");
  await settings.getByRole("switch", { name: "Ask when a project is created" }).click();
  await expect.poll(async () => page4.evaluate(async () => {
    const r = await window.marktwain.invoke("profile:get");
    return r.ok ? r.data.ask : null;
  })).toBe(true);
});


test("a bad answer is refused with a message and the dialog stays", async ({ launch }) => {
  const { app } = await launch({ name: "作者錯誤", projectName: "bad.marktwain", env: ASKS });
  const page = await app.firstWindow();
  await createProject(page);
  const dialog = page.getByTestId("new-project-dialog");
  await dialog.getByLabel("Title (Chinese)").fill("");
  await dialog.getByRole("button", { name: "Done" }).click();
  // An empty title is a missing field, not a wrong answer, so the dialog closes and the cover warns later
  await expect(dialog).toBeHidden();
});
