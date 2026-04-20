# @tw199501/specsnap-core

[English](./README.md) · [繁體中文](./README.zh-TW.md)

> [SpecSnap](https://github.com/tw199501/specsnap) 的核心擷取與序列化函式庫 —— 對 AI 友善的 DOM 檢視器。

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![npm](https://img.shields.io/npm/v/@tw199501/specsnap-core.svg)](https://www.npmjs.com/package/@tw199501/specsnap-core)

## 安裝

```bash
pnpm add @tw199501/specsnap-core
# 或
npm install @tw199501/specsnap-core
# 或
yarn add @tw199501/specsnap-core
```

## 基本用法

### 最簡 — 純文字 MD + JSON

```ts
import { captureSession, toJSON, toMarkdown } from '@tw199501/specsnap-core';

// 把一或多個 DOM 元素擷取成結構化 session
const elements = [
  document.querySelector('#save')!,
  document.querySelector('#username')!
];
const session = captureSession(elements);

// Markdown — 直接貼到 Claude / ChatGPT / Cursor 就能用
const mdPerFrame = toMarkdown(session);
console.log(mdPerFrame.join('\n\n---\n\n'));

// JSON — 給自動化 pipeline / Playwright 等機器消費者
const json = toJSON(session);
```

### 完整 bundle — MD + 每 frame 標註 PNG

```ts
import { toSpecSnapBundle } from '@tw199501/specsnap-core';

const bundle = await toSpecSnapBundle(session, { sequence: 1 });

// bundle.dirName            → "20260420"
// bundle.captureId          → "20260420-01"
// bundle.markdownFilename   → "20260420-01.md"
// bundle.markdownContent    → MD 文字，內含 ![Frame N](./20260420-01-N.png)
// bundle.images             → [{ filename, blob }, ...]  每 frame 一張 PNG

// 寫入磁碟的方式由環境決定（Chrome extension / Tauri / FSA API）
```

`bundle.markdownContent` 裡的每張圖都以**相對路徑**引用，所以只要 MD 跟 PNG 放在同一個資料夾，開 VS Code / Typora / GitHub 就會 render 出含圖的文件；貼到 AI chat 也只是純文字 + 另外拖 PNG 附件 —— 沒有 base64 汙染、也不會 broken reference。

## 每個 session 帶的資訊

- **Viewport（強制）** — `width`、`height`、`devicePixelRatio`。整個 session 的座標都可以對著這個參照解讀
- **Scroll** — `{ x, y }` 擷取當下的捲動位置
- **Gaps** — 每對連續 frame 若共享某軸，會產生一個 `Gap { from, to, axis, px }` — AI 拿到結構化間距，不是只看圖猜

## 每個 frame 帶的資訊

- **盒模型** — `content`、`padding`、`border`、`margin`，四邊 tuple `[top, right, bottom, left]`
- **字體** — `fontFamily`、`fontSize`、`fontWeight`、`lineHeight`、`letterSpacing`、`color`、`textAlign`
- **背景** — `color`、`image`、`borderRadius`（四角）
- **身份** — `tagName`、`id`、`classList`、語意化 `name`（例如 `button#save`）、唯一 `domPath`（必要時用 `:nth-of-type()` 消歧）
- **位置** — 文件相對絕對座標 `rect` + 視窗相對 `{ xPct, yPct }`
- **雙語標註**（出現在 Markdown）—  數字貼標籤：`120 (寬度) × 34 (高度) px`、`padding: 4 / 12 / 4 / 12 (上/右/下/左) (內邊距)`

## API 總覽

### 擷取

- `captureElement(el, index)` — 擷取單一 DOM 元素，回傳 `Frame`
- `captureSession(elements)` — 擷取多個元素，回傳 `Session`（含 viewport、gap 等）

### 序列化

- `toMarkdown(session, options?)` → `string[]`（每 frame 一份）
  - 選項 `imageFilenames?: readonly string[]` — 提供時每 frame MD 自動加 `![Frame N](./<filename>)` 相對路徑
  - 選項 `lexiconOverride?: Record<string, string>` — 覆寫雙語詞庫
- `toJSON(session, options?)` → `string`（`pretty?: boolean` 預設 `true`）
- `toAnnotatedPNG(session, options?)` → `Promise<Blob[]>`
  - **僅瀏覽器** — 每 frame 一張標註 PNG。focusFrame 機制讓每張只標示自己
  - 內部動態載入 `dom-to-image-more`，不呼叫就零負擔
  - 選項 `filter?: (node: Node) => boolean` — 排除你自己的 UI chrome（panel、toolbar）不被拍進去
- `toSpecSnapBundle(session, options?)` → `Promise<SpecSnapBundle>`
  - 一次回傳 `{ dirName, captureId, markdownFilename, markdownContent, images[] }`
  - 命名規則：`specsnap/YYYYMMDD/YYYYMMDD-NN.{md,k.png}`
  - 選項 `sequence?: number` — 當日第幾次（1..99，由 consumer 追蹤）
- `buildAnnotationSvg(input, options?)` → `SVGSVGElement`
  - 底層 SVG primitive，座標系無關（consumer 決定是 viewport 還是 document 座標）

### 輔助

- `formatDateYYYYMMDD(date)` → `string`（local time YYYYMMDD）
- `formatCaptureId(date, sequence)` → `string`（`YYYYMMDD-NN`，sequence 截斷到 1..99）
- `annotate(property, override?)` — 查某 CSS 屬性的中文翻譯
- `DEFAULT_LEXICON` — 內建 56 個屬性的繁中詞庫（frozen，改用 `lexiconOverride`）

## Bundle 落地到檔案系統

Core 只負責**回傳記憶體資料**，**寫檔是 consumer 的責任** —— 因為每個環境的能力不同：

| 環境 | 落地方式 |
| --- | --- |
| **純瀏覽器（`<a download>`）** | 多次觸發下載。檔案去 `Downloads/`，使用者自己移到 `specsnap/YYYYMMDD/`。最簡單、無路徑控制。 |
| **瀏覽器（File System Access API）** | 第一次用 `window.showDirectoryPicker()` 選資料夾、handle 存 IndexedDB，之後直接寫。Chrome / Edge 86+ |
| **瀏覽器擴充** | `chrome.downloads.download({ filename: 'specsnap/20260420/…' })` 支援 Downloads 子目錄、不跳窗 |
| **Tauri / Electron** | Node `fs` 或 Tauri 的 `@tauri-apps/api/fs` 全權限、放哪都可以 |

本 repo 的 playground 示範純瀏覽器 `<a download>` 做法。

## 目前狀態

Pre-alpha（v0.0.x），schema 可能微調，v1.0 凍結

已發布：
- `v0.0.1` — 核心 capture、雙語 MD、JSON
- `v0.0.2` — 元素間距 `Gap`
- `v0.0.3` — `toAnnotatedPNG` 每 frame PNG、`toSpecSnapBundle` 磁碟 bundle、MD 相對路徑圖片引用
- `v0.0.4` — Border subpixel 顯示潤飾；playground 加入 File System Access API adapter，Copy MD 寫入使用者挑選的資料夾而不再是 Downloads/
- `v0.0.5` **（current）** — `ElementIdentity.i18nKey` + `.source` 讀取 `data-i18n-key` / `data-v-source` 屬性；tag-triggered publish workflow 草稿。`SCHEMA_VERSION` 升到 `'0.0.5'`。

Roadmap：
- `v0.1.0+` — 配套 Vite plugin `@tw199501/specsnap-vite-plugin`，build-time 自動注入 `data-v-source` + `data-i18n-key`。Pseudo-state 擷取、recursive children dump。
- 之後 — 元件樹感知（Vue / React）、`data-i18n-key` 反查、pseudo-state 擷取

## 授權

[MIT](./LICENSE) © tw199501
