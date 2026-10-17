# Third-party material

## Fonts bundled in the app

| Font | License | Source |
|---|---|---|
| Noto Sans TC | SIL Open Font License 1.1 | `@fontsource-variable/noto-sans-tc` (copyright The Noto Project Authors) |

The thesis fonts used by the bundled TW-Thesis templates are listed in the templates' own `THIRD_PARTY.md`.

## Typst bundled in the app

| Component | Version | License | Source |
|---|---|---|---|
| Typst | 0.15.1 | Apache License 2.0 | https://github.com/typst/typst, one release binary per platform, pinned with a sha256 in `typst.lock.json` |

## Typst packages bundled in the app

The template imports these on every build, so they travel with the app and Typst never downloads them.

| Package | Version | License | Source |
|---|---|---|---|
| `@preview/kouhu` | 0.2.0 | MIT (copyright Shengqi Chen), its sample text is excerpted from the zhlipsum LaTeX package | https://packages.typst.org/preview/kouhu-0.2.0.tar.gz |
| `@preview/ipsum` | 0.1.0 | MIT (copyright neuralpain) | https://packages.typst.org/preview/ipsum-0.1.0.tar.gz |

## Logos on the output squares

The squares where a new project chooses its output show the name of each tool. They are used only to say which tool a square stands for, are not changed, and belong to their owners. MarkTwain is not affiliated with them.

| Mark | Source | Terms |
|---|---|---|
| Typst logo | https://typst.app/assets/images/typst.svg | Brand rules at https://typst.app/legal/brand/ allow the unchanged logo for the compiler, a commercial use needs the authorization of Typst |
| Microsoft Word icon | "Microsoft Office Word (2019-2025)" on Wikimedia Commons, https://commons.wikimedia.org/wiki/File:Microsoft_Office_Word_(2019%E2%80%932025).svg | Marked as public domain on Commons for its simple shapes, the name and the icon are still a trademark of Microsoft, and a commercial use needs its permission |
| LaTeX | A way of setting the letters, drawn by the app | None |
