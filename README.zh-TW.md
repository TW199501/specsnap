# SpecSnap

[English](./README.md) · [繁體中文](./README.zh-TW.md)

> 讓「人眼觀察 UI」和「AI 修改 UI」之間的翻譯損耗歸零的檢視器。

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![npm](https://img.shields.io/npm/v/@tw199501/specsnap-core.svg)](https://www.npmjs.com/package/@tw199501/specsnap-core)

## 實際長這樣

![SpecSnap playground — multi-select inspection with numbered badges, inter-element gaps, and per-element box model diagrams](./docs/superpower/image/2026-04-20_02-49.png)

在頁面上點選多個元素，SpecSnap 一次全部擷取：

- 🔢 **編號徽章** — 頁面 overlay、盒模型面板、匯出的 Markdown 共用同一組 ① ② ③，瀏覽器看到的 ① 就是檔案裡的 ①
- 📏 **元素間距** — 自動計算相鄰元素的 px 距離（橘色「24px」「16px」那些）。AI 拿到的是結構化間距數字，不是只有尺寸
- 📐 **每元素盒模型** — margin / border / padding / content 四層方塊，每邊都標數字
- 🌐 **視窗脈絡** — 每次擷取都帶 viewport 資訊；沒有 `1440×900` 參照，「寬 120px」這句話對 AI 毫無意義
- 🈴 **雙語標註** — 英文給 AI 精確、繁體中文給人類閱讀（`padding: 16px (內邊距)`）

## 為什麼要這個工具

任何跟 UI 有關的 AI 協作對話，都會撞同一道牆：

1. 人眼看到「那個按鈕怪怪的」
2. 人用文字描述觀察（「Save 按鈕感覺窄 8px」）
3. AI 把文字翻譯回程式碼修改
4. 每一層翻譯都在丟資訊

SpecSnap 把**第 2 步消掉**。你點選有問題的元素，AI 直接讀無法誤讀的結構化資料：帶 viewport 參照的座標、盒模型差異、元素間距、語意化的元素名稱。

## 版本狀態

🚧 **Pre-alpha（v0.0.x）** — schema 可能微調，v1.0 時凍結。

### v0.0.3 新增的功能

- **`toAnnotatedPNG`** — 每 frame 一張標註 PNG，只突顯當前 focus frame
- **`toSpecSnapBundle`** — 可直接落地的 bundle：MD + PNG 命名 `YYYYMMDD-NN-*.png`、MD 內含相對路徑引用
- **capture `filter` 選項** — 排除使用者自己的 UI 元素（panel、toolbar）避免被拍進截圖

## 套件

| 套件 | 狀態 | 說明 |
| --- | --- | --- |
| [`@tw199501/specsnap-core`](./packages/core) | ✅ 0.0.3 | TypeScript 核心庫：擷取 + 序列化（MD / JSON）+ 標註 PNG + 磁碟落地 bundle |
| `specsnap-extension` | 📋 規劃中 | Chrome / Edge / Firefox 瀏覽器擴充，包裝 core |
| [`apps/playground`](./apps/playground) | ✅ Vite 展示頁 | 多選檢視器示範（上方截圖即此頁） |

## 設計文件

- [創意願景](./docs/superpower/plan/2026-04-19-vision.md) · 為什麼做、要做什麼、7 條北極星原則
- [設計決議（v0 鎖定）](./docs/superpower/plan/2026-04-19-decisions.md) · Q1-Q9 + 理由
- [MVP core 計畫 — Part 1](./docs/superpower/plan/2026-04-19-mvp-core-plan-part-1.md) · bootstrap + types
- [MVP core 計畫 — Part 2](./docs/superpower/plan/2026-04-19-mvp-core-plan-part-2.md) · capture + serializers + ship
- [v0.0.1 回顧](./docs/superpower/plan/2026-04-20-retrospective-v001.md)
- [v0.0.3 core 計畫](./docs/superpower/plan/2026-04-20-v003-core-annotated-png-plan.md)
- [v0.0.4 + v0.0.5 收尾計畫](./docs/superpower/plan/2026-04-20-v004-v005-closeout-plan.md)

## 環境需求

- Node **22+**
- pnpm **9.15+**
- TypeScript **6+**（貢獻者需要）

## 授權

[MIT](./LICENSE) © tw199501
