<p align="center"><img src="assets/brand/logo.png" alt="MarkTwain" width="160"></p>

<h1 align="center">MarkTwain</h1>

<p align="center">English | <a href="README.zh-TW.md">繁體中文</a></p>

<p align="center">
  An offline desktop editor for master's and doctoral theses in Taiwan.<br>
  You write in Markdown. MarkTwain builds a PDF that follows your school's format.
</p>

<p align="center">
  <a href="https://github.com/yueswater/MarkTwain/tags"><img src="https://img.shields.io/github/v/tag/yueswater/MarkTwain?style=flat-square&color=4008FC&label=version" alt="Version"></a>
  <a href="https://github.com/yueswater/MarkTwain/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/yueswater/MarkTwain/ci.yml?style=flat-square&labelColor=4008FC&label=CI" alt="CI"></a>
  <img src="https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-4008FC?style=flat-square" alt="Platforms">
  <img src="https://img.shields.io/badge/Typst-0.15.1-4008FC?style=flat-square&logo=typst&logoColor=white" alt="Typst 0.15.1">
  <img src="https://img.shields.io/badge/interface-zh--Hant%20%7C%20en-4008FC?style=flat-square" alt="Interface languages">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-4008FC?style=flat-square" alt="MIT license"></a>
</p>

MarkTwain is an editor for the [TW-Thesis](https://github.com/TW-Thesis) templates. The text you write is Markdown, and the editor shows it close to how it will look on the page. When you build, MarkTwain turns the Markdown into a [Typst](https://typst.app) project and compiles it with Typst, which is bundled in the app. Nothing is installed on your computer besides MarkTwain, and nothing leaves it: there is no account and no cloud.

> **Disclaimer**: The format presets come from the TW-Thesis templates and are for reference only. Always follow your school's official thesis regulations and your department's requirements.

> **Status**: under development. v0.3.6 writes and builds PDFs with the Typst template. Installers, LaTeX output and version control come in later releases (see [ROADMAP.md](ROADMAP.md)), so for now you run MarkTwain from source.

## What it does

- **Write.** A Markdown editor with formulas, footnotes, citations, figures, code blocks, and definitions, lemmas and theorems that are numbered by kind. Blocks can be dragged to any place, including into a callout or a table cell.
- **Tables.** Merged cells, the borders menu of a word processor, a width and a text size for the whole table, and a library of templates by field of study (economics, statistics, engineering, medicine, social science, management), such as a payoff matrix or a regression table.
- **Cross-references.** Refer to a heading, figure, table, formula or theorem, even when it sits in another chapter. A label is added where it is missing.
- **Preview.** The PDF sits next to the editor. It follows your caret and your scrolling, and a click in the PDF takes the caret to that text.
- **Format.** Pick one of 15 schools, then adjust margins, fonts, heading numbers, list markers and the numbering of figures and tables in the settings.
- **Fonts.** Add fonts to a project from your computer. The project carries them, and the build prefers them.
- **Bibliography.** Import BibTeX, pick a citation style, and hover a citation to see which work it is.
- **Your files.** A project is one `.marktwain` file, a SQLite database whose source of truth is Markdown. You can export it as a Typst project folder that compiles without MarkTwain.

The interface is in Traditional Chinese and English.

Still to come: local version control with named branches and block-level merging (v0.4.0), and LaTeX output (v0.5.0).

## Run from source

You need Node.js 22 and [pnpm](https://pnpm.io) (the version is pinned in `package.json`). The templates are fetched with the GitHub CLI, so install [`gh`](https://cli.github.com) and run `gh auth login` first.

```bash
git clone https://github.com/yueswater/MarkTwain.git
cd MarkTwain
pnpm install
pnpm templates:fetch  # the pinned TW-Thesis templates
pnpm typst:fetch      # the pinned Typst and the packages that the template imports
pnpm dev              # start the desktop app
```

`pnpm typst:fetch` puts Typst under `resources/`. Without it, the app in development looks for a Typst that is already installed and downloads the packages the first time you build.

Node 26 breaks the install script of the `electron` package on some machines, and it extracts nothing. If `pnpm dev` says "Electron uninstall", use Node 22.

### Commands

```bash
pnpm test             # unit tests
pnpm typecheck        # type checks
pnpm lint             # includes the rule against hard-coded UI text (i18n)
pnpm build:unpacked   # build the real, unpacked app into apps/desktop/dist/
pnpm e2e              # run the end-to-end tests against the packaged app, with no window on the screen
pnpm e2e:headed       # the same, with the windows of the app shown
```

## Layout

- `apps/desktop`: the Electron app. `src/main` is the back end (Node.js), `src/renderer` is the front end (React), `src/shared` is what both sides share.
- `packages/*`: pure TypeScript libraries with no Electron dependency. `schema` reads and writes the Markdown, `render` turns it into Typst, `build` runs the build, and `table-templates` holds the table templates.
- `resources/*`: the table templates, and the Typst, packages and templates that `pnpm typst:fetch` and `pnpm templates:fetch` put in place.
- `tools/*`: development-only tools (fetching the templates and Typst, benchmarks). They are not shipped.

How the parts are divided, and the rules that keep them apart, are in [ARCHITECTURE.md](ARCHITECTURE.md).
## Continuous integration

Every push and pull request runs lint, type checks and unit tests on Ubuntu and Windows. CI then builds the real app, with the Typst it bundles, and runs the end-to-end tests against it. Screenshots in both languages and at 100% and 150% scale are uploaded as artifacts, and so is the unpacked Windows app, so the Windows UI can be checked from a Mac:

```bash
gh run download <run-id> -n screenshots-windows-latest
gh run download <run-id> -n app-win-unpacked
```

macOS is only added when the workflow is started by hand with `include-macos`.

## License

[MIT](LICENSE). The fonts and other material that ship with the app are listed in [THIRD_PARTY.md](THIRD_PARTY.md).
