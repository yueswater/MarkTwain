# Roadmap

MarkTwain is developed against version milestones. Each version maps to a [GitHub Milestone](../../milestones), and the work items are tracked as issues.

Current version: v0.4.0.

| Version | Theme | Status |
|---|---|---|
| [v0.1.0](#v010--foundation) | Foundation | Released |
| [v0.2.0](#v020--editor) | Editor | Released |
| [v0.3.0](#v030--typst-output) | Typst output | Released |
| [v0.3.2](#v032--editor-and-bibliography-polish) | Editor and bibliography polish | Released |
| [v0.3.3](#v033--editor-fixes) | Editor fixes | Released |
| [v0.3.4](#v034--settings-and-watermark) | Settings and watermark | Released |
| [v0.3.5](#v035--blocks-and-tables) | Blocks and tables | Released |
| [v0.3.6](#v036--toolchain-and-preview) | Toolchain and preview | Released |
| [v0.4.0](#v040--version-control) | Version control | Released |
| [v0.5.0](#v050--latex-output) | LaTeX output | Not started |
| [v0.5.1](#v051--project-export) | Project export | Not started |
| [v0.6.0](#v060--word-output) | Word output, the body | Not started |
| [v0.6.1](#v061--word-output-front-matter-and-schools) | Word output, the front matter and the schools | Not started |
| [v0.6.2](#v062--word-output-citations-and-math-font) | Word output, citations and the math font | Not started |
| [v0.7.0](#v070--thesis-features) | Thesis features | Not started |
| [v0.8.0](#v080--offline-packaging) | Offline packaging | Not started |
| [v0.9.0](#v090--polish) | Polish | Not started |
| [v1.0.0-beta.1](#v100-beta1--public-beta) | Public beta | Not started |
| [v1.0.0](#v100--release) | Release | Not started |

v0.3.0 (Typst output) and v0.4.0 (version control) do not depend on each other and can be developed in parallel. v0.5.1 needs the LaTeX renderer of v0.5.0 for its LaTeX half.

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
- Export: the PDF, and the whole Typst project as a one way copy that compiles without MarkTwain
- Word-like tables: three-line or grid style, merged cells, column widths, row heights, horizontal and vertical alignment

**Done when:** a sample thesis builds a PDF for every supported school.

## v0.3.2 · Editor and Bibliography Polish

Work on the editor and the project window, plus a bibliography manager that was planned for v0.7.0.

- Settings window with editor preferences and the thesis settings, basic and advanced
- A preview that can be resized, a sidebar that folds into one icon, and documents that reorder by dragging
- Code blocks with a language menu and syntax colors, optional block numbers, and find in the document and in the whole project
- Pictures that resize by their corners and can be cropped, and tables that show their sizes while dragging
- Bibliography: a manager with a list and a form, a BibTeX source view, import from BibTeX, CSL JSON and Hayagriva, a citation picker, and citations that are highlighted and flagged when the key is unknown

**Not done:** keeping several bibliography files, custom `.csl` styles and the `bibliography.style` menu stay in v0.7.0.

## v0.3.3 · Editor Fixes

Fixes and small changes to the editor and the preview.

- The preview lists every warning, including the ones from Typst such as a missing font, and the warning area appears only when it has content
- Reordering documents in the sidebar uses a pointer drag that accepts the edges of the list, scrolls the list, says why a drop is refused, and also works with Alt and the arrow keys
- The cross-reference dialog picks the kind first and then the target, and long formulas end with `...` without breaking a command
- The language of a code block is chosen on the block, shown on hover and hidden while typing
- A display formula has no number until it is given a name from a small box that opens on hover, and a formula that is referred to keeps its name

## v0.3.4 · Settings and Watermark

The settings window and the small things around it.

- The settings window has sections with a page per topic, a search, and a page that is remembered
- Margins, headings, numbering, captions, cross-references, the table of contents and the bibliography title are shown as drawings and examples, margins are edited on click
- Delays are chosen with ten step sliders, sharpness and code size with named levels, and the dates are picked
- The watermark of the school is shown next to the school, can be replaced by an image of the author's own, and is drawn in the preview on request and in a final copy
- A new project asks for the basic thesis information, can be skipped, and what is about the author is remembered
- The preview keeps its place, the header is simpler, and the bibliography source is colored and numbered
- Line numbers count the lines of ordinary text, code blocks and formulas are numbered on their own, and Cmd/Ctrl+B is bold again

## v0.3.5 · Blocks and Tables

Writing mathematics, and tables that look like the page.

- Definitions, lemmas, theorems and proofs are blocks that are numbered by kind, cross-referenced, and drawn as a plain callout or in a color for each kind, the colors are in the editor only and the PDF stays plain
- A slash menu lists the blocks with a description or a drawing of the highlighted one, formulas open a small box at their place, and a reference or a footnote opens a card with what it points to when hovered
- A figure or a table is given a place to float with icons, written as `placement=top` and mapped to Typst as far as Typst goes, with a default for the thesis
- The borders menu of a table works like the one of a word processor, with a width, a style and a color for each line, diagonals included, and one step of undo for each choice
- A table in the editor has the width, the column shares, the lines, the number, the caption and the notes of the table in the PDF, and a test compares the columns of both

## v0.3.6 · Toolchain and Preview

The toolchain travels with the app, so a build needs nothing installed on the machine, and the page can be seen and edited side by side.

- Typst 0.15.1 and the two `@preview` packages that the template imports (`kouhu` and `ipsum`) ship in the installer, pinned in `typst.lock.json` and fetched with `pnpm typst:fetch`. A packaged app never uses a Typst of the system, and there is no Docker. LaTeX follows in v0.8.0 the same way, see there
- The preview shows the PDF in a PDF viewer with working links. It follows the caret and the scroll of the editor, keeps its page after a rebuild, and a click in the PDF takes the caret to that text
- Fonts are a page of their own: add fonts from the computer or by drag and drop, see which are in use, and the build prefers the fonts of the project. The font settings are selectors, and a Latin font with Chinese glyphs no longer takes the Chinese text
- Lists take a marker for each level, from presets or a custom combination, drawn the same in the editor and in the PDF
- One list of keyboard shortcuts feeds the tooltips, a cheat sheet and the settings, and a clash between two of them fails a test
- A library of table templates by field of study (economics, statistics, engineering, medicine, social science, management) kept as data files, in Chinese and English. A table that is selected by the handle at its corner can be given another template
- The payoff matrix is drawn as a game theory text does, with only the payoffs boxed
- A table can take a share of the text width and a text size, a table has a handle at its corner that selects it and moves it, and a block is moved by a grip at its left to any place, into a callout, into a list, or into a table cell as text
- A page can be turned sideways for a wide table, and a heading or a caption of another document can be referenced even when it has no label yet
- Keywords are written as tags, and the wheel pushed against the end of a chapter opens the next or the previous one

## v0.4.0 · Version Control

Local version control that does not depend on git.

- Save a version, start a named change (a branch), open another one, discard one. Changes that are not saved wait on their branch and come back when it is opened again
- The version history of the branch that is open, with a restore that adds a new version and never rewrites the past
- What a version changed, shown as a change history: green for what was added, red for what was taken away, and the characters that changed inside a paragraph
- Three-way merge at block level, with the blocks lined up first (Myers, and anchors on blocks that occur once for large differences). What one side changed is taken, insertions at different places are both kept, different changes to the same blocks are a conflict, and a move is a deletion and an addition
- A side-by-side conflict resolver: the base, the main line and the change, and a choice of the main line, the change, both, or a text of one's own. Nothing is written until every conflict has a choice
- SQLite storage: blocks, files and block sequences are kept by hash, so what did not change is stored once. A merge is a single transaction, and a test kills a process in the middle of one
- Locust load tests: a merge of two branches at 1k, 10k and 50k blocks and 1, 10 and 50 percent changed (130 ms at the 95th percentile for 50k blocks and half changed), and the time of a save over 3 600 versions (it does not grow)
- Property tests of the merge with random scenarios: no conflict and no lost change when the places are apart, the same blocks whichever side is the main line, a line merged with itself

**Done when:** you can branch, edit, and merge; a deliberate conflict can be resolved block by block; and killing the app mid-merge leaves the data as it was before the merge.

## v0.5.0 · LaTeX Output

The same content, rendered as LaTeX.

- LaTeX renderer (shares the IR with Typst)
- Finding a TeX Live (`xelatex`, `texlua`, `latexmk`, `citation-style-language`) through an environment variable or the PATH, as Typst is found in development. The installed app will carry its own, see v0.8.0
- Runs the template's `gen.lua` and latexmk, and parses the TeX log

**Done when:** the same sample thesis builds a LaTeX PDF with the TeX Live of the developer. Without one, LaTeX output is disabled with a message, and Typst is unaffected.

## v0.5.1 · Project Export

The whole thesis leaves MarkTwain as one `.zip`.

The zip holds a complete template project folder in the shape of `tw-thesis-typ` or `tw-thesis-tex`: the template itself, a `config.yml` generated from the project, `main.typ` or `main.tex`, every file under `contents/`, the bibliography files and the `.csl`, the fonts of the project, and the images. The user can unzip it and compile it with the template's own commands, without MarkTwain.

- Export as Typst or as LaTeX. The Typst folder export exists since v0.3.x as a folder; this makes it a zip and adds LaTeX, which needs the renderer of v0.5.0. Issue #35
- The zip is written in TypeScript (`fflate`), so it is the same on all three systems and uses no zip command
- The Markdown sources and the images as a zip. Issue #131. Importing a `.md` stays in v0.9.0, issue #49

**Done when:** a fixed sample thesis is exported for both Typst and LaTeX, unzipped, and compiled with the template's own commands, and the PDF has the same page count and text as the one MarkTwain builds.

## v0.6.0 · Word Output

The same thesis structure and settings, written as a real `.docx`. This is split over three versions: v0.6.0 is the body, v0.6.1 the front matter and the schools, v0.6.2 citations and the math font.

The promise is that PDF and Word come from the same thesis structure and the same formatting settings. It is not that they are identical line by line. Typst and Word are two layout engines, and one word of difference moves the later page numbers.

The file has real Word structure, not just a look: heading styles, `SEQ` captions, `REF` cross-references with the result already filled in, `TOC` fields with the entries already filled in, footnotes in `footnotes.xml`, formulas as real Word equations (OMML) that can be edited, and sections with roman then arabic page numbers.

Method: a new `docx` renderer in `packages/render` takes the same IR as Typst and LaTeX and writes the XML of the package directly (OOXML parts and a zip). A new pure package `thesis-spec` merges `schools/default.yml`, the school preset and the project `config.yml` into one typed object. A parity test checks it against what Typst resolves, for each of the 15 schools. It runs without Typst or TeX Live, so it adds nothing to the installer.

v0.6.0 is the body:

- `thesis-spec`. Issue #132
- The docx package writer. Issue #133
- Blocks and inline text from the IR: headings with numbering, paragraphs, lists with the marker of each level, quotes, code, the blocks of a mathematical thesis, landscape pages. Issue #134
- Tables with merged cells and the borders, and figures. Issue #135
- Formulas as OMML, with equation numbers made of a row with a `SEQ` field. Issue #136
- Captions, bookmarks, cross-references, footnotes. Issue #137
- The export entry and `build-docx`. Issue #138
- Validation in CI with the Open XML SDK validator and a LibreOffice conversion to PDF. Issue #139

**Done when:** a sample thesis exports to a `.docx` that passes the validator and opens in LibreOffice with the same numbers for figures, tables, formulas and blocks as the PDF.

Known limits of the Word output, for all of v0.6.x:

- A float placement of a figure or table is not kept in Word. A figure is a paragraph of its own
- Word does not embed fonts here, so a user without Times New Roman, a Kai font or XITS Math sees a substitute
- Citations differ slightly from the PDF because the engine is another one

## v0.6.1 · Word Output, Front Matter and Schools

The parts of the thesis before and after the body, and the covers of the schools.

- Cover, verification page, Chinese and English abstracts, acknowledgements, notation list, appendices, roman and arabic page numbers. Issue #140
- Contents, list of figures and list of tables as fields. Issue #141
- The cover data of the 15 schools, compared with the Typst cover. Issue #142

**Done when:** all of the front matter is there in the order of the template, and all 15 school covers match.

## v0.6.2 · Word Output, Citations and Math Font

- Citations and the reference list with CSL (`citeproc-js`), written as static text with links, not as Word sources. Issue #143
- A `layout.font-math` setting for Typst, LaTeX and Word, which needs a pull request in each template repository. Issue #144
- A checklist for a real Word, to be done by hand before each release, and the list of fonts the file needs. Issue #145

**Done when:** citations match the PDF or the differences are listed, the math font setting works in the three outputs, and the checklist was done once in a real Word.

## v0.7.0 · Thesis Features

The parts that make it a thesis.

- Chinese and English abstracts, keywords, acknowledgements, notation list, appendices
- Bibliography: import BibTeX, Hayagriva, CSL JSON, and CSL YAML; citation picker; custom `.csl` styles
- School selection (15 schools) with a preview of its settings

**Done when:** the PDF has a cover page, abstracts, a table of contents, and references, formatted according to the selected school.

## v0.8.0 · Offline Packaging

An installer that works without a network.

- electron-builder: macOS (arm64 and x64), Windows (x64), Linux (x64); each installer is built on its own platform's CI runner
- Bundled `typst`, templates, `@preview` package cache, and fonts. Typst 0.15.1 and the template packages are already in the installer from v0.3.6, for macOS arm64 and x64, Windows x64 and Linux x64, with no Docker
- A curated TeX Live subset in the installer, so that LaTeX output works at once and offline like Typst. It is built from TinyTeX, a small base with `tlmgr install` of the packages that the template needs and the documents and sources removed, for each platform and with a TeX Live year that is pinned. Estimated at 100 to 150 MB more for each platform, the real size is measured in the issue. It is not downloaded at first run, there is no Docker, and Tectonic is not used because it has no `texlua`, latexmk or biber. Open: Perl for latexmk on Windows (MarkTwain may run XeLaTeX and `texlua` itself), signing and notarization of the binaries, licenses in `THIRD_PARTY.md`
- Font license audit (commercial fonts are not bundled)
- A `--smoke-test` mode so the packaged app can check itself, run in CI on all three platforms together with Playwright against the packaged app
- A decision on code signing and notarization

**Done when:** CI passes the smoke test and end-to-end tests on the packaged app on all three platforms, and on a clean machine with no network you can install the app, create a project, edit, build a Typst PDF and a LaTeX PDF, and use version control.

## v0.9.0 · Polish

- Draft autosave, kept separate from versions
- Import a `.md` file into a document (the dialect of the project and plain Markdown), and the round trip of an exported file. Issue #49. Exporting the Markdown is in v0.5.1
- Review of the Traditional Chinese and English interface and error messages

**Done when:** after a forced quit, the draft is restored on reopen, and an exported `.md` imports back as it was.

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
