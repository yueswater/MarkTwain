#!/usr/bin/env bash
# Installs TinyTeX with the packages that the LaTeX template reads, the same small TeX Live that the installer will carry.
# It runs on the CI runners of Linux and Windows, in Git Bash on Windows.
set -euo pipefail

# Found from the file list of a build of the template, with the engines and the fonts that they load
PACKAGES="latex-bin latex xetex luatex latexmk lua-tinyyaml lualibs luaotfload citation-style-language
  amsfonts amsmath bigintcalc bitset booktabs caption chngcntr cjk ctex enumitem eso-pic etoolbox fancyhdr fontspec
  geometry gettitlestring graphics graphics-cfg graphics-def hycolor hyperref iftex infwarerr intcalc kvdefinekeys
  kvoptions kvsetkeys l3kernel l3packages l3experimental accsupp lipsum listings ltxcmds makecell metalogo multirow pdfescape
  pdflscape pdftexcmds pgf refcount rerunfilecheck stringenc titlesec tools ulem uniquecounter url xcolor xecjk
  zhlipsum zhnumber psnfss lm lm-math unicode-math xetexconfig"

if [ "${RUNNER_OS:-}" = "Windows" ]; then
  # The batch file of TinyTeX quotes the address in a way that curl does not read in cmd, so its PowerShell script is run directly
  curl -fsSL -o "$RUNNER_TEMP/install-tinytex.ps1" https://tinytex.yihui.org/install-bin-windows.ps1
  powershell -ExecutionPolicy Bypass -File "$(cygpath -w "$RUNNER_TEMP/install-tinytex.ps1")"
  bin="$(cygpath "$APPDATA")/TinyTeX/bin/windows"
  export PATH="$bin:$PATH"
  # tlmgr may report an error after the packages are in, the checks at the end say whether the install is usable
  cmd //c "tlmgr install $(echo $PACKAGES)" || true
  echo "MARKTWAIN_TEX_BIN=$(cygpath -w "$bin")" >> "$GITHUB_ENV"
else
  curl -fsSL https://yihui.org/tinytex/install-bin-unix.sh | sh
  bin="$(ls -d "$HOME"/.TinyTeX/bin/* | head -1)"
  export PATH="$bin:$PATH"
  tlmgr install $PACKAGES || true
  echo "MARKTWAIN_TEX_BIN=$bin" >> "$GITHUB_ENV"
fi
echo "$bin" >> "$GITHUB_PATH"

# The install is usable when the engine runs and the packages of the bibliography and the Chinese text are found
xelatex --version | head -1
kpsewhich citation-style-language/citeproc-lua.lua
kpsewhich ctex.sty xeCJK.sty
latexmk --version | head -2
