#!/usr/bin/env bash
# Installs TinyTeX with the packages that the LaTeX template reads, the same small TeX Live that the installer will carry.
# It runs on the CI runners of Linux and Windows, in Git Bash on Windows.
set -euo pipefail

# Found from the file list of a build of the template, with the engines and the fonts that they load
PACKAGES="latex-bin latex xetex luatex latexmk lua-tinyyaml lualibs luaotfload citation-style-language
  amsfonts amsmath bigintcalc bitset booktabs caption chngcntr cjk ctex enumitem eso-pic etoolbox fancyhdr fontspec
  geometry gettitlestring graphics graphics-cfg graphics-def hycolor hyperref iftex infwarerr intcalc kvdefinekeys
  kvoptions kvsetkeys l3backend l3kernel l3packages lipsum listings ltxcmds makecell metalogo multirow pdfescape
  pdflscape pdftexcmds pgf refcount rerunfilecheck stringenc titlesec tools ulem uniquecounter url xcolor xecjk
  zhlipsum zhnumber psnfss lm lm-math unicode-math xetexconfig"

if [ "${RUNNER_OS:-}" = "Windows" ]; then
  curl -fsSL -o "$RUNNER_TEMP/install-tinytex.bat" https://yihui.org/tinytex/install-bin-windows.bat
  (cd "$RUNNER_TEMP" && cmd //c install-tinytex.bat)
  bin="$(cygpath "$APPDATA")/TinyTeX/bin/windows"
  export PATH="$bin:$PATH"
  cmd //c "tlmgr install $(echo $PACKAGES)"
  echo "MARKTWAIN_TEX_BIN=$(cygpath -w "$bin")" >> "$GITHUB_ENV"
else
  curl -fsSL https://yihui.org/tinytex/install-bin-unix.sh | sh
  bin="$(ls -d "$HOME"/.TinyTeX/bin/* | head -1)"
  export PATH="$bin:$PATH"
  tlmgr install $PACKAGES
  echo "MARKTWAIN_TEX_BIN=$bin" >> "$GITHUB_ENV"
fi
echo "$bin" >> "$GITHUB_PATH"
xelatex --version | head -1
