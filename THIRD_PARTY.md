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
