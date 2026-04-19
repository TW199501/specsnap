# SpecSnap

> A zero-loss translator between "human inspects UI visually" and "AI modifies UI precisely"
> 讓人眼觀察 UI 和 AI 修改 UI 之間翻譯損耗歸零的檢視器

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

## See it in action

![SpecSnap playground — multi-select inspection with numbered badges, inter-element gaps, and per-element box model diagrams](./docs/superpower/image/2026-04-20_02-49.png)

Click multiple elements on a page. SpecSnap captures them all at once with:

- 🔢 **Numbered badges** that link the on-page overlay, the box-model panel, and the exported Markdown — the ① you see in the browser is the same ① in the file
- 📏 **Inter-element gaps** computed automatically (the orange "24px" / "16px" between siblings) — so AI gets spacing info, not just sizes
- 📐 **Per-element box models** — margin / border / padding / content with numeric labels on every side
- 🌐 **Viewport context** attached to every capture — "120px wide" is meaningless without knowing it's on a 1440px screen
- 🈴 **Bilingual annotations** — English terms for AI precision + 繁體中文 for humans (`padding: 16px (內邊距)`)

## Why

Every AI-coding interaction that touches UI hits the same wall:

1. Human eyes see "that button is off"
2. Human translates observation into text ("the Save button looks 8px too narrow")
3. AI translates text into code change
4. Something gets lost in each translation

SpecSnap removes step 2. You click what's wrong. AI reads structured data that can't be misread — viewport-qualified coordinates, box-model deltas, inter-element gaps, and the element's own semantic name.

## Status

🚧 **Pre-alpha (v0.0.x)** — schema may change. Locking in at v1.0.

## Packages

| Package | Status | Description |
|---------|--------|-------------|
| [`@tw199501/specsnap-core`](./packages/core) | ✅ 0.0.2 | TypeScript library: capture + serialize (MD / JSON) |
| `specsnap-extension` | 📋 planned | Chrome / Edge / Firefox extension wrapping core |
| [`apps/playground`](./apps/playground) | ✅ Vite demo | Multi-select inspector demo (see screenshot above) |

## Design Docs

- [Creative vision](./docs/superpower/plan/2026-04-19-vision.md) · what we're building, why, the 7 north-star principles
- [Design decisions (v0 lock-in)](./docs/superpower/plan/2026-04-19-decisions.md) · Q1-Q9 with reasoning
- [MVP core plan — Part 1](./docs/superpower/plan/2026-04-19-mvp-core-plan-part-1.md) · bootstrap + types
- [MVP core plan — Part 2](./docs/superpower/plan/2026-04-19-mvp-core-plan-part-2.md) · capture + serializers + ship

## License

[MIT](./LICENSE) © tw199501
