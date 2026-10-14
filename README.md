# MarkTwain

An offline desktop thesis editor. You write in a TipTap Markdown editor; MarkTwain turns the Markdown into the [TW-Thesis](https://github.com/TW-Thesis) Typst and LaTeX templates and builds a PDF that follows your school's format. It has built-in local version control (named branches, merging back into the main line) and does not use git or the cloud.

> Under development. There is no usable release yet. See [ROADMAP.md](ROADMAP.md).

## Development

You need Node.js 22 and pnpm (the version is pinned in `package.json`).

```bash
pnpm install
pnpm templates:fetch  # fetch the pinned TW-Thesis templates (needs `gh` and `gh auth login`)
pnpm dev              # start the desktop app
pnpm test             # unit tests
pnpm typecheck        # type checks
pnpm lint             # includes the rule against hard-coded UI text (i18n)
pnpm build:unpacked   # build the real, unpacked app into apps/desktop/dist/
pnpm e2e              # run end-to-end tests against the packaged app and take screenshots
```

Node 26 breaks the install script of the `electron` package on some machines (it extracts nothing). If `pnpm dev` says "Electron uninstall", use Node 22.

## Layout

- `apps/desktop`: the Electron app. `src/main` is the back end (Node.js), `src/renderer` is the front end (React), `src/shared` is what both sides share.
- `packages/*`: pure TypeScript libraries with no Electron dependency.
- `tools/*`: development-only tools (template fetching; load tests later). They are not shipped.

## Continuous integration

Every push and pull request runs lint, type checks, and unit tests on Ubuntu and Windows, then builds the real app and runs the end-to-end tests against it. Screenshots in both languages and at 100% and 150% scale are uploaded as artifacts, and so is the unpacked Windows app, so the Windows UI can be checked from a Mac:

```bash
gh run download <run-id> -n screenshots-windows-latest
gh run download <run-id> -n app-win-unpacked
```

macOS is only added when the workflow is started by hand with `include-macos`.
