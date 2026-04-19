# SpecSnap — Design Decisions (v0 lock-in)

**Status:** Claude proposes, user approves. Sign-off 前無實作。  
**Date:** 2026-04-19  
**Principles for all decisions:** 不侵權 · 已有創意 · 難以被仿冒（但即使被抄也 OK）· 核心價值是「自己要用」

---

## Q1 · 產品名稱

**決議：SpecSnap**

*   npm: `specsnap`（✅ 未被佔用）
*   GitHub: `tw199501/specsnap`
*   未來系列：`specsnap-core`、`specsnap-extension`、`specsnap-playwright`、`specsnap-tauri`
*   口號候選：\_"Snap a spec, skip the translation."\_

**為什麼不選別的：** `frame-bridge` / `pixelport` 已被佔用；`captour` 語意不夠直接；`SpecSnap` 一聽就懂、好念、好 Google。

---

## Q2 · Hotkey 預設值

**決議：**

*   Windows / Linux：\*\*`Alt + Shift + I`\*\*
*   macOS：\*\*`Option + Shift + I`\*\*（等於 `Alt + Shift + I`）

**理由：**

*   `Ctrl+Shift+I` 是 DevTools（全瀏覽器），不能搶
*   `Ctrl+Shift+C` 是 Chrome 的 Inspect Element
*   `Alt+Shift+I` 在所有主流瀏覽器 + OS 都沒預設佔用
*   助憶：**I = Inspector**
*   使用者可在設定頁 rebind（不綁死）

**Tauri 內：** 前端直接用 `window.addEventListener('keydown')`，無需 Tauri global shortcut API（那個是系統級）。

---

## Q3 · 源碼位置映射（file:line）

**決議：MVP 不做，V2 做。**

**MVP 做的：** 顯示 DOM 身份 + Vue 組件推斷（透過 `__vue_app__` 或 `data-v-*` scoped id）  
**V2 做的：** 獨立 `specsnap-vite-plugin`，編譯時注入 `data-source="File.vue:42-67"`，SpecSnap 讀取後直接顯示

**理由：** Vite plugin 本身是另一個子專案（自己的發布週期 + 相容性矩陣 + 更新節奏）。MVP 塞進來會拖垮發布節奏。DOM-only 已能讓 AI 推 80% 出檔案位置（因為 Vue SFC 的組件名會出現在 class 或 id 裡）。

---

## Q4 · 截圖實作

**決議：預設** `**dom-to-image-more**`**，偵測到 Chrome extension 環境時切換到原生** `**chrome.tabs.captureVisibleTab**`

| 環境 | 使用的實作 | 原因 |
| --- | --- | --- |
| Chrome extension | `chrome.tabs.captureVisibleTab` | 原生、最快、像素完美 |
| Firefox extension | `browser.tabs.captureVisibleTab` | 同上（Firefox 有同名 API） |
| Tauri webview | `dom-to-image-more` | Tauri 沒有 `captureVisibleTab`；`dom-to-image-more` 純 JS 能跑 |
| 注入 npm lib 到任意網頁 | `dom-to-image-more` | 同上 |

**為什麼不選** `**html2canvas**`**：** 它在 CSS transform / backdrop-filter / custom properties 遇到 bug 的機率很高，產出截圖常失真。`dom-to-image-more` 是 `dom-to-image` 的社群 fork，這些 bug 多數修掉了。

---

## Q5 · Overlay 渲染技術

**決議：SVG overlay + Shadow DOM 封裝**

**組合理由：**

*   **SVG**：畫框、量尺、px 標籤在任何 zoom 等級都銳利；可響應式定位
*   **Shadow DOM**：把 SpecSnap 自己的樣式完全**隔離**在宿主頁面 CSS 之外（宿主頁的 `* { color: red !important }` 干擾不到我們的 UI）
*   依然**可點擊可互動**（SVG 本身支援 pointer events）

**為什麼不選：**

*   純 Canvas：效能好但沒 DOM 事件，hover frame tooltip 會難做
*   純絕對定位 div：宿主頁 CSS 會污染 —— 除非也包 Shadow DOM，那不如用 SVG 直接

---

## Q6 · 權限範圍（Chrome extension manifest）

**決議：**`**activeTab**` **+ 使用者 opt-in 升級到** `**<all_urls>**`

**MVP 內建：**

*   `activeTab`：使用者按 SpecSnap icon 或按 hotkey 時才取得當前頁權限
*   隱私友善、Chrome Web Store 審核會比較快過

**設定頁選項：**

*   使用者可手動打勾「Allow on all sites」升級到 `<all_urls>`，適合重度使用者
*   升級後可支援「頁面載入即自動激活」這類 V2 功能

**Tauri 情境不受此限：** npm lib 直接在你的 app 內跑，沒有 extension 權限模型。

---

## Q7 · Core 程式語言

**決議：TypeScript（strict mode）**

**原因：**

1.  SpecSnap core 的核心輸出是一個**公開 schema**（frame payload、JSON export、雙語詞庫 interface）。沒有型別等於沒有 contract，下游 consumer（extension、Playwright plugin、使用者的 CI script）會很脆弱
2.  編譯輸出：
    *   `dist/index.mjs`（ESM）
    *   `dist/index.cjs`（CJS）
    *   `dist/index.d.ts`（TypeScript 型別）
3.  開發時的 refactor 安全度 +90%

**代價：** 需要 `tsup` 或 `tsc` build step。以專案規模這代價很低。

---

## Q8 · License

**決議：MIT（core 和 extension 都是）**

**原因：**

*   使用者原則：「被仿冒了也不會怎麼樣」 → 不需要 Apache 2.0 的專利條款包袱
*   MIT 是所有主流 dependency 的 default，整合相容性最高
*   全文最短、最易懂
*   npm 生態系預期值

**追加：**

*   Contributor License Agreement（CLA）**不採用** —— 自己維護為主，不預期大量外部貢獻
*   Copyright holder：`tw199501` 個人

---

## Q9 · 換行符號（Line endings）

**決議：全專案強制 LF，透過 4 層機制鎖死，不靠人肉守則。**

### 為什麼重要

Windows 專案最常見的污染源。CRLF（`\r\n`）和 LF（`\n`）混在一起會造成：

*   git diff 顯示整個檔案都改了（噪音）
*   pre-commit hook 或 lint 炸
*   Docker / CI 在 Linux 跑時 bash script 行為異常
*   跨 OS 協作的 merge conflict

### 4 層鎖死機制（全部要有，缺一不可）

**Layer 1 —** `**.gitattributes**`**（repo 根目錄）**

```
* text=auto eol=lf
*.png binary
*.jpg binary
*.ico binary
```

保證 git checkout 到任何 OS 都是 LF；二進位檔不被動手腳。

**Layer 2 —** `**.editorconfig**`**（repo 根目錄）**

```
root = true

[*]
end_of_line = lf
insert_final_newline = true
charset = utf-8
indent_style = space
indent_size = 2
trim_trailing_whitespace = true
```

VS Code、IntelliJ、Sublime 等主流編輯器全都認這個檔。

**Layer 3 —** `**package.json**` **加 lint 檢查**

```
{
  "scripts": {
    "check:eol": "node scripts/check-line-endings.mjs"
  }
}
```

自寫一個 3 行的 checker，CI 跑。遇到 CRLF 直接 fail build。

**Layer 4 —** `**.vscode/settings.json**`**（專案內建編輯器設定）**

```
{
  "files.eol": "\n",
  "files.encoding": "utf8",
  "files.insertFinalNewline": true,
  "files.trimTrailingWhitespace": true
}
```

團隊成員打開專案，VS Code 自動套用，不需要他們自己改 global 設定。

### 已知陷阱

*   `git config core.autocrlf` 這個設定只影響本地 —— 會被 `.gitattributes` 覆蓋，所以 `.gitattributes` 才是 source of truth
*   Windows 記事本 / PowerShell 預設存 CRLF —— **任何 shell script / build script 都不用 PowerShell 存**，一律用 VS Code
*   npm 有些 package 的檔案是 CRLF（源碼在 GitHub 原本就是）—— 我們只管自己的程式碼，`node_modules` 不理

---

## 附加決議（從原則衍生）

### A · Repository 結構

**monorepo（pnpm workspaces）：**

```
specsnap/
├── packages/
│   ├── core/              → @tw199501/specsnap-core（npm 發布）
│   ├── extension/         → Chrome/Edge/Firefox extension
│   └── vite-plugin/       → @tw199501/specsnap-vite（V2）
├── apps/
│   └── playground/        → dev-time 測試用頁面
├── docs/
└── README.md
```

**理由：** core 和 extension 會有共享型別、共享雙語詞庫；monorepo 讓 refactor 一次到位。

### B · 第一個 dogfood 對象

**antares2 的連線面板重構** —— 已經用過的素材、pencil spec 齊全、可立即驗證 SpecSnap 的輸出格式是否讓 AI 對話變快。

### C · 版本策略

*   **0.x**：breaking changes allowed（到 1.0 前 schema 可能會變）
*   **1.0**：schema 公開凍結、向前相容承諾
*   **目標：3 個月內上 1.0**（避免永遠 0.x 的「還在 beta」感）

---

## 未決事項（刻意延後）

這些**不在 MVP 範疇**，但寫下來避免忘記：

1.  **發布策略** —— Chrome Web Store 帳號申請（$5 一次性費用）、Firefox AMO 免費但要審
2.  **文件網站** —— GitHub Pages 還是獨立 docs site？MVP 先 README 就夠
3.  **中文行銷文案** —— 一切 0.x 到 1.0 之前都用 README 雙語
4.  **分析 / 匿名遙測** —— **決議不加**，守住 P7（不干擾使用者）
5.  **付費功能** —— 無此計畫。永遠免費開源

---

_簽核區（use approves）：_

[v]  Q1 SpecSnap
[v]  Q2 `Alt+Shift+I`
[v]  Q3 MVP 只做 DOM inspect，V2 加 Vite plugin
[v]  Q4 `dom-to-image-more` + extension 原生 API
[v]  Q5 SVG + Shadow DOM
[v]  Q6 `activeTab` + opt-in 升級
[v]  Q7 TypeScript strict
[v]  Q8 MIT
[v]  Q9 LF 強制 + 4 層鎖死機制
[v]  A · pnpm monorepo
[v]  B · antares2 當第一個 dogfood 目標
[v]  C · 0.x → 1.0 三個月內