<p align="center"><img src="assets/brand/logo.png" alt="MarkTwain" width="160"></p>

<h1 align="center">MarkTwain</h1>

<p align="center"><a href="README.md">English</a> | 繁體中文</p>

<p align="center">
  給臺灣碩博士生用的離線桌面論文編輯器。<br>
  你用 Markdown 寫作，MarkTwain 產生符合學校格式的 PDF。
</p>

<p align="center">
  <a href="https://github.com/yueswater/MarkTwain/tags"><img src="https://img.shields.io/github/v/tag/yueswater/MarkTwain?style=flat-square&color=4008FC&label=version" alt="版本"></a>
  <a href="https://github.com/yueswater/MarkTwain/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/yueswater/MarkTwain/ci.yml?style=flat-square&labelColor=4008FC&label=CI" alt="CI"></a>
  <img src="https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-4008FC?style=flat-square" alt="支援平台">
  <img src="https://img.shields.io/badge/Typst-0.15.1-4008FC?style=flat-square&logo=typst&logoColor=white" alt="Typst 0.15.1">
  <img src="https://img.shields.io/badge/interface-zh--Hant%20%7C%20en-4008FC?style=flat-square" alt="介面語言">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-4008FC?style=flat-square" alt="MIT 授權"></a>
</p>

MarkTwain 是 [TW-Thesis](https://github.com/TW-Thesis) 模板的編輯器。你寫的是 Markdown，編輯器會把它顯示得接近成品的樣子。建置時，MarkTwain 把 Markdown 轉成 [Typst](https://typst.app) 專案，再用內建的 Typst 編譯。除了 MarkTwain 本身，電腦上不必裝任何東西，資料也不會離開你的電腦：沒有帳號，也沒有雲端。

> **免責聲明**：格式設定來自 TW-Thesis 模板，僅供參考，實際仍請以學校公布的論文規範及系所要求為準。

> **目前狀態**：開發中。v0.3.6 可以用 Typst 模板寫作並建置 PDF。安裝檔、LaTeX 輸出和版本控制會在後續版本推出（見 [ROADMAP.md](ROADMAP.md)），目前請從原始碼執行。

## 功能

- **寫作**：Markdown 編輯器，支援公式、註腳、引用文獻、圖、程式碼區塊，以及依種類編號的定義、引理與定理。區塊可以拖曳到任何位置，包括 callout 和表格儲存格裡。
- **表格**：合併儲存格、像文書軟體一樣的框線選單、整張表的寬度與字級，還有依領域分類的範本庫（經濟、統計、工程、醫學、社會科學、管理），例如報酬矩陣、迴歸結果表。
- **交叉引用**：可以引用標題、圖、表、公式和定理，在別章也行；還沒有標籤的，選了之後會自動補上。
- **預覽**：PDF 就在編輯器旁邊。它會跟著游標與捲動走，在 PDF 上點一下，游標就跳到那段文字。
- **格式**：選一所學校（共 15 所），再到設定頁調整邊界、字型、標題編號、清單符號，以及圖表的編號方式。
- **字型**：從電腦加入字型到專案裡，專案會帶著它們走，建置時優先使用。
- **參考文獻**：匯入 BibTeX、選引用格式，游標停在引用上就會顯示是哪一篇。
- **檔案**：一個專案就是一個 `.marktwain` 檔，它是 SQLite 資料庫，內容以 Markdown 為準。可以匯出成 Typst 專案資料夾，不用 MarkTwain 也能編譯。

介面有繁體中文和英文。

還沒做的有兩項：本機版本控制（具名分支、區塊層級合併，v0.4.0）和 LaTeX 輸出（v0.5.0）。

## 從原始碼執行

需要 Node.js 22 和 [pnpm](https://pnpm.io)（版本固定在 `package.json`）。模板要靠 GitHub CLI 下載，請先安裝 [`gh`](https://cli.github.com) 並執行 `gh auth login`。

```bash
git clone https://github.com/yueswater/MarkTwain.git
cd MarkTwain
pnpm install
pnpm templates:fetch  # 下載固定版本的 TW-Thesis 模板
pnpm typst:fetch      # 下載固定版本的 Typst，以及模板用到的套件
pnpm dev              # 啟動桌面 App
```

`pnpm typst:fetch` 會把 Typst 放進 `resources/`。沒有執行的話，開發時的 App 會找電腦上已經裝好的 Typst，套件則在第一次建置時下載。

Node 26 會讓 `electron` 套件的安裝腳本失效，在部分機器上什麼都解不出來。如果 `pnpm dev` 顯示 "Electron uninstall"，請改用 Node 22。

### 指令

```bash
pnpm test             # 單元測試
pnpm typecheck        # 型別檢查
pnpm lint             # 包含禁止把介面文字寫死的規則（i18n）
pnpm build:unpacked   # 建置真正的未打包 App，輸出到 apps/desktop/dist/
pnpm e2e              # 對打包後的 App 執行端對端測試，不會在螢幕上顯示視窗
pnpm e2e:headed       # 同上，但顯示 App 的視窗
```

## 專案結構

- `apps/desktop`：Electron App。`src/main` 是後端（Node.js），`src/renderer` 是前端（React），`src/shared` 是兩邊共用的部分。
- `packages/*`：純 TypeScript 函式庫，不依賴 Electron。`schema` 讀寫 Markdown，`render` 轉成 Typst，`build` 負責建置，`table-templates` 放表格範本。
- `resources/*`：表格範本，以及由 `pnpm typst:fetch` 和 `pnpm templates:fetch` 放進來的 Typst、套件與模板。
- `tools/*`：只在開發時使用的工具（下載模板與 Typst、效能測試），不會隨 App 發佈。

## 持續整合

每次 push 和 pull request 都會在 Ubuntu 與 Windows 上執行 lint、型別檢查和單元測試。接著 CI 會建置真正的 App（用它內建的 Typst），並對它執行端對端測試。兩種語言、100% 與 150% 縮放的截圖會上傳成 artifact，未打包的 Windows App 也會上傳，所以用 Mac 就能檢查 Windows 的介面：

```bash
gh run download <run-id> -n screenshots-windows-latest
gh run download <run-id> -n app-win-unpacked
```

只有手動啟動 workflow 並加上 `include-macos` 時，才會多跑 macOS。

## 授權

[MIT](LICENSE)。隨 App 發佈的字型與其他素材列在 [THIRD_PARTY.md](THIRD_PARTY.md)。
