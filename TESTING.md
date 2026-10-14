# Testing

Automated tests cover the logic and the whole app (unit tests with Jest, end-to-end tests
with Playwright against the packaged app on Ubuntu and Windows in CI). A few things cannot
be automated; they are checked by hand before each release.

## Chinese input methods (IME)

Composition events differ between operating systems and input methods, and the editor
must not lose or duplicate characters while a composition is open (issue #60).

Run on **macOS** (Zhuyin, Pinyin, Cangjie) and **Windows** (Microsoft Bopomofo, Cangjie).
In a chapter document:

1. Type a sentence with Zhuyin. While the composition underline is visible, check that the
   toolbar and autosave do not interrupt it. Confirm with Space/Enter; the text must appear once.
2. Type `**` + a Chinese word + `**` right after Chinese text. The word must become bold
   (the input rule works without spaces).
3. Type `$x^2$` directly after Chinese text. It must become a formula.
4. Start a composition, then press Escape. The candidate list closes and nothing is inserted.
5. Compose inside a table cell, a footnote dialog, the caption dialog and the settings form.
6. Compose at the end of a heading, in a list item and in a block quote.
7. Select Chinese text, replace it by composing, then undo (Ctrl/Cmd+Z): one undo step
   must restore the original text.
8. Leave a composition open and click another document in the sidebar: the text typed so
   far must be saved to the document you left.

Record the OS, input method and any failure in the issue.

## Visual check

CI uploads screenshots (`screenshots-<os>` artifact). On Windows the artifact also contains
`desktop-win32-*.png`, a capture of the whole desktop including the title bar. Look at
them after UI changes; per-platform pixel baselines are planned for the release polish
milestone (issue #61).
