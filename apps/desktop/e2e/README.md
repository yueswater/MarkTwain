# End-to-end tests

These tests start the real, unpacked app (`pnpm build:unpacked` first) and drive it with Playwright.

```bash
pnpm e2e                          # every test, with no window on the screen
pnpm e2e:headed                   # every test, with the windows of the app shown
pnpm e2e editor/math              # the tests of one file, a part of the path is enough
pnpm e2e -g "table handle"        # the tests whose title has these words
```

With `pnpm e2e` the app runs with `MARKTWAIN_HEADLESS=1`: its window exists and renders, but it is never shown and the app keeps out of the dock. Use `pnpm e2e:headed` to watch a test, or to find out why it fails.

## Layout

| Folder | What its tests are about |
|---|---|
| `specs/app` | The shell of the app: the language, the native menu, shortcuts, recent projects |
| `specs/project` | Creating, opening and closing projects, the documents of a project, the thesis facts, search, the layout of the workspace |
| `specs/editor` | Writing: typing, formulas, references, pictures, code, menus, blocks of a mathematical thesis, dragging blocks |
| `specs/tables` | Tables: editing, borders, the handle at the corner, templates |
| `specs/build` | The preview, the build, export, fonts |
| `specs/bibliography` | The bibliography and citations |
| `specs/settings` | The settings window |
| `support` | What the tests share, see below |

## Writing a test

A test takes the `launch` fixture and starts the app with it. Every app that a test starts is closed, and its temporary folder removed, when the test ends, also when it fails. A test needs no `try` and no `finally`.

```ts
import { expect, test } from "../../support/test";
import { createProject, readChapter } from "../../support/project";

test("typing is saved as Markdown", async ({ launch }) => {
  const { app } = await launch({ name: "typing", lang: "zh-TW" });
  const page = await app.firstWindow();
  await createProject(page, "zh-TW");
  // ...
});
```

- `launch({ lang, name, projectName, env, args })` starts the app. The open and save dialogs answer with `projectName` inside the temporary folder. `env` can be a function of that folder, for a test hook that points to a file in it.
- `session.restart()` quits the app and starts it again on the same folder, as a person does.
- `support/project.ts` has the steps that many tests share: creating, closing and reopening a project, writing and reading the Markdown of the first chapter.
- `support/paths.ts` has the paths of the repository, the unpacked app and the template.
