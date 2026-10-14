# Roadmap

MarkTwain is developed against version milestones. Each version maps to a [GitHub Milestone](../../milestones), and the work items are tracked as issues.

Current version: not released yet (in development).

| Version | Theme | Status |
|---|---|---|
| [v0.1.0](#v010--foundation) | Foundation | In progress |
| [v0.2.0](#v020--editor) | Editor | Not started |
| [v0.3.0](#v030--typst-output) | Typst output | Not started |
| [v0.4.0](#v040--version-control) | Version control | Not started |
| [v0.5.0](#v050--latex-output) | LaTeX output | Not started |
| [v0.6.0](#v060--thesis-features) | Thesis features | Not started |
| [v0.7.0](#v070--offline-packaging) | Offline packaging | Not started |
| [v0.8.0](#v080--polish) | Polish | Not started |
| [v1.0.0-beta.1](#v100-beta1--public-beta) | Public beta | Not started |
| [v1.0.0](#v100--release) | Release | Not started |

v0.3.0 (Typst output) and v0.4.0 (version control) do not depend on each other and can be developed in parallel.

## v0.1.0 · Foundation

A monorepo and a desktop app shell that starts.

- pnpm workspace, shared TypeScript config, Jest (unit tests)
- `schema` package: Markdown block splitting
- Template fetch script: pins the TW-Thesis template versions with a lock file
- Electron + React shell; main and renderer talk over typed IPC
- i18n from day one: Traditional Chinese and English, with a lint rule against hard-coded UI text
- CI on Ubuntu and Windows (macOS on demand), so cross-platform problems show up without owning every machine
- The Windows gate: every push builds the real unpacked app, launches it with Playwright, and takes screenshots in both languages at 100% and 150% scale
- A bundled UI font (Noto Sans TC), so the interface looks the same on every platform and in CI

**Done when:** `pnpm dev` opens a window that shows the version, `pnpm test` and `pnpm typecheck` pass, and CI on Windows produces the screenshots.

Every milestone below also ends with the Windows gate: CI passes on Windows and the new screens have been reviewed in the Windows screenshots.

## v0.2.0 · Editor

Create a project, write the thesis, and save it.

- TipTap Markdown editor (the document is Markdown) with the v1 node set: headings, lists, tables, images, math, code, footnotes, cross-references
- Numbering and resolution of cross-references for figures, tables, equations, and chapters
- Create and open projects (`.marktwain`), stored in SQLite (Node's built-in `node:sqlite`) with versioned migrations
- An interface that follows AnvilNote's design language: strict monochrome (Notion-style), Tailwind CSS with shadcn/ui-style components, Geist and Noto Sans TC fonts; the brand colors live only in the logo and app icon
- `config.yml` form: title, author, advisor, college, degree, keywords, and so on

**Done when:** content that uses every node survives closing and reopening the project, numbering updates immediately when figures or tables are added or removed, and Chinese input (Zhuyin, Cangjie) works on Windows and macOS.

## v0.3.0 · Typst Output

The first version that produces a PDF.

- Intermediate representation (IR) and a Typst renderer that uses the TW-Thesis template vocabulary
- Bundled `typst` invocation and build directory management
- PDF preview and structured errors that point back to the source block
- A formula that fails to convert falls back to its source text instead of aborting the build
- Load-test foundation: a bench server and Locust scenarios (long-thesis compile, concurrent compile), a baseline report, and performance budgets

**Done when:** a sample thesis builds a PDF for every supported school.

## v0.4.0 · Version Control

Local version control that does not depend on git.

- Save a version, create a named branch, discard a branch
- Three-way merge at block level, merged back into the main line
- Block-level diff and a side-by-side conflict resolver
- SQLite storage; a merge is a single transaction
- Locust load tests: large merges (1k to 50k blocks) and snapshot write latency after long use

**Done when:** you can branch, edit, and merge; a deliberate conflict can be resolved block by block; and killing the app mid-merge leaves the data as it was before the merge.

## v0.5.0 · LaTeX Output

The same content, rendered as LaTeX.

- LaTeX renderer (shares the IR with Typst)
- Detection of the system TeX Live (`xelatex`, `latexmk`, `citation-style-language`)
- Runs the template's `gen.lua` and latexmk, and parses the TeX log

**Done when:** the same sample thesis builds a LaTeX PDF. Without TeX Live, LaTeX output is disabled with install instructions, and Typst is unaffected.

## v0.6.0 · Thesis Features

The parts that make it a thesis.

- Chinese and English abstracts, keywords, acknowledgements, notation list, appendices
- Bibliography: import BibTeX, Hayagriva, CSL JSON, and CSL YAML; citation picker; custom `.csl` styles
- School selection (15 schools) with a preview of its settings

**Done when:** the PDF has a cover page, abstracts, a table of contents, and references, formatted according to the selected school.

## v0.7.0 · Offline Packaging

An installer that works without a network.

- electron-builder: macOS (arm64 and x64), Windows (x64), Linux (x64); each installer is built on its own platform's CI runner
- Bundled `typst`, templates, `@preview` package cache, and fonts
- Font license audit (commercial fonts are not bundled)
- A `--smoke-test` mode so the packaged app can check itself, run in CI on all three platforms together with Playwright against the packaged app
- A decision on code signing and notarization

**Done when:** CI passes the smoke test and end-to-end tests on the packaged app on all three platforms, and on a clean machine with no network you can install the app, create a project, edit, build a Typst PDF, and use version control.

## v0.8.0 · Polish

- Draft autosave, kept separate from versions
- Export the whole project as a template folder (Typst or LaTeX), which compiles with the template's own commands without MarkTwain
- Review of the Traditional Chinese and English interface and error messages

**Done when:** after a forced quit, the draft is restored on reopen, and the exported folder compiles with `tw-thesis-typ` or `tw-thesis-tex` using their own commands.

## v1.0.0-beta.1 · Public Beta

The first release that other people use for real work. Versions follow SemVer, so the pre-release is `1.0.0-beta.1` (not `1.0.0b1`, which is Python's notation and is rejected by npm and electron-builder).

- Feature complete against the project goals; installers for macOS, Windows, and Linux, published as a GitHub pre-release
- End-to-end regression tests (Playwright driving Electron) and installer verification on every platform
- An "Export diagnostics" command (no telemetry; no thesis content) and an issue template, so offline users can report problems
- A known-issues list and a first draft of the user documentation
- Project file migrations: from this release on, every later version can open projects created by the beta (with an automatic backup before upgrading)
- Only bug fixes, documentation, and performance work while in beta; no new features

**Done when:** every project goal is met, and the installers pass the smoke and end-to-end tests in CI on all three platforms.

## v1.0.0 · Release

- Fix the problems found in the beta; more betas (`beta.2`, `beta.3`, and so on) if needed
- Final documentation and the signing decision carried out

**Done when:** the beta exit criteria are met: no known data-loss, cannot-open, or cannot-export bugs; CI green on all platforms; beta projects open in 1.0.0; documentation finished; Chinese input checked on Windows and macOS.

## Out of Scope

Cloud sync, collaboration, accounts, using git, editing LaTeX or Typst source directly (export the project and edit it there instead), and integration with the `tw-thesis-updater` regulation data.
