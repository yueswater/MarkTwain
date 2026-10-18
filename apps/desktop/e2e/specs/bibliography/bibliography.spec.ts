import { expect, test } from "../../support/test";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createProject } from "../../support/project";

const BIB = `% my references
@article{wang2020,
  author = {Wang, Xiaoming and Lee, Jane},
  title = {Deep learning for thesis writing},
  journal = {Journal of AI},
  year = {2020}
}

@book{chen2019,
  author = {Chen, Da},
  title = {An unfinished book}
}
`;

test("the bibliography is imported, edited, cited, checked and built", async ({ launch }) => {
  const { app, dir, file } = await launch({ name: "書目" });
  const bibFile = join(dir, "refs.bib");
  writeFileSync(bibFile, BIB);
  const page = await app.firstWindow();
  await createProject(page);

  // The sidebar has an entry, the page starts empty
  await page.getByRole("button", { name: "Bibliography" }).click();
  const bibliography = page.getByTestId("bibliography-page");
  await expect(bibliography).toContainText("The bibliography is empty");

  // Import a BibTeX file
  await page.getByTestId("bibliography-file").setInputFiles(bibFile);
  await expect(bibliography.getByRole("status")).toContainText("2 added");
  const list = bibliography.getByRole("list", { name: "Bibliography" });
  await expect(list.getByRole("listitem")).toHaveCount(2);
  await expect(list).toContainText("Wang & Lee, 2020");
  // The book misses its publisher and year, the list says so
  await expect(list.getByRole("listitem").nth(1).getByLabel(/Missing/)).toBeVisible();

  // Search narrows the list
  await bibliography.getByRole("textbox", { name: "Search entries" }).fill("unfinished");
  await expect(list.getByRole("listitem")).toHaveCount(1);
  await bibliography.getByRole("textbox", { name: "Search entries" }).fill("");

  // Edit one entry in the form
  await list.getByRole("button", { name: /Wang & Lee/ }).click();
  // The star of a required field sits right after its label
  const label = bibliography.locator("label", { hasText: /^Title/ });
  const labelBox = await label.locator("span").first().boundingBox();
  const star = await label.locator("[title='Required']").boundingBox();
  expect(labelBox && star && star.x - (labelBox.x + labelBox.width) < 24).toBe(true);
  await bibliography.getByLabel(/^Title/).fill("Deep learning, revised");
  await bibliography.getByRole("button", { name: "Save" }).click();
  await expect(bibliography.getByRole("status").filter({ hasText: "Saved" })).toBeVisible();

  // The source view shows the changed entry, the untouched one keeps the way it was written
  await bibliography.getByRole("button", { name: "BibTeX source" }).click();
  const source = bibliography.getByRole("textbox", { name: "BibTeX source" });
  await expect(source).toHaveValue(/title\s+= \{Deep learning, revised\}/);
  await expect(source).toHaveValue(/@book\{chen2019,\n  author = \{Chen, Da\},/);

  // The source is colored and numbered line by line
  await expect(bibliography.getByTestId("bib-highlight").locator(".bib-type").first()).toHaveText("@article");
  await expect(bibliography.getByTestId("bib-highlight").locator(".bib-field").first()).toHaveText("author");
  await expect(bibliography.getByTestId("bib-gutter").locator("div").first()).toHaveText("1");

  // A broken entry marks its line in the gutter
  await source.fill(`${BIB}\n@article{broken,\n  title = {never closed\n`);
  await expect(bibliography.getByTestId("bib-gutter").locator("[data-error]")).not.toHaveCount(0);

  // Typing in the source is saved and shows up in the manager
  await source.fill(`% my references\n${BIB}\n@misc{extra2021, title = {Added in source}}\n`);
  await expect(bibliography.getByRole("status").filter({ hasText: "Saved" })).toBeVisible();
  await bibliography.getByRole("button", { name: "Manager" }).click();
  await expect(list.getByRole("listitem")).toHaveCount(3);

  // Cite from the picker in a chapter, plus one key that does not exist
  await page.getByRole("button", { name: /^Chapter 1/ }).click();
  const editor = page.locator(".ProseMirror");
  await editor.click();
  await page.keyboard.type("Prior work ");
  await page.getByRole("button", { name: "Citation" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("checkbox").first().check();
  await dialog.getByLabel("Other keys").fill("ghost");
  await dialog.getByRole("button", { name: "Insert" }).click();
  const cite = editor.locator("[data-citation]");
  await expect(cite).toHaveAttribute("data-display", /^\(.*, 2020; ghost\)$/);
  await expect(cite).toHaveAttribute("data-broken", "");

  // A cited key without an entry is listed and can be added from there
  await expect(page.getByRole("status")).toHaveText("Saved");
  await page.getByRole("button", { name: "Bibliography" }).click();
  const problems = bibliography.getByRole("region", { name: "Needs attention" });
  await expect(problems).toContainText("Cited but not in the bibliography");
  await problems.getByRole("button", { name: "Add ghost" }).click();
  await expect(bibliography.getByLabel("Key", { exact: true })).toHaveValue("ghost");
  await bibliography.getByLabel(/^Title/).fill("Ghost paper");
  await bibliography.getByRole("button", { name: "Save" }).click();
  await expect(problems).toBeHidden();

  // The entry shows where it is cited
  await list.getByRole("button", { name: /Wang & Lee/ }).click();
  await expect(bibliography.getByRole("region", { name: "Cited in" })).toContainText("Chapter 1");

  // The PDF build has the bibliography and no citation fallback warning
  const outcome = await page.evaluate(async () => {
    const result = await window.marktwain.invoke("build:typst");
    return result.ok ? result.data : null;
  });
  expect(outcome?.ok).toBe(true);
  expect(outcome?.diagnostics.filter((d) => d.code === "citation-no-bibliography")).toEqual([]);

  // The stored source is the file of the project
  const stored = await page.evaluate(async () => {
    const result = await window.marktwain.invoke("bibliography:get");
    return result.ok ? result.data.text : "";
  });
  expect(stored).toContain("% my references");
  expect(stored).toContain("@misc{extra2021, title = {Added in source}}");
  expect(stored).toContain("@article{ghost,");
  expect(readFileSync(bibFile, "utf8")).toBe(BIB);
});


test("without a bibliography a citation stays plain text and the build still works", async ({ launch }) => {
  const { app } = await launch({ name: "無書目" });
  const page = await app.firstWindow();
  await createProject(page);
  const outcome = await page.evaluate(async () => {
    const list = await window.marktwain.invoke("document:list");
    if (!list.ok) throw new Error("an IPC call that the test needs failed");
    const chapter = list.data.find((d) => d.kind === "chapter")!;
    await window.marktwain.invoke("document:save", { id: chapter.id, text: "# Intro\n\nAs shown by [@nobody].\n" });
    const result = await window.marktwain.invoke("build:typst");
    return result.ok ? result.data : null;
  });
  expect(outcome?.ok).toBe(true);
  expect(outcome?.diagnostics.map((d) => d.code)).toContain("citation-no-bibliography");
});
