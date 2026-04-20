# SpecSnap

[English](./README.md) · [繁體中文](./README.zh-TW.md)

> A zero-loss translator between "human inspects UI visually" and "AI modifies UI precisely."

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![npm](https://img.shields.io/npm/v/@tw199501/specsnap-core.svg)](https://www.npmjs.com/package/@tw199501/specsnap-core)

## See it in action

<video src="./docs/superpower/video/specsnap-demo.mp4" controls muted playsinline width="860">
  Your browser doesn't support embedded video. <a href="./docs/superpower/video/specsnap-demo.mp4">Download the demo</a>.
</video>

![SpecSnap playground — multi-select inspection with numbered badges, inter-element gaps, and per-element box model diagrams](./docs/superpower/image/2026-04-20_02-49.png)

Click multiple elements on a page. SpecSnap captures them all at once with:

- **Numbered badges** that link the on-page overlay, the box-model panel, and the exported Markdown — the ① you see in the browser is the same ① in the file
- **Inter-element gaps** computed automatically (the orange "24px" / "16px" between siblings) — so AI gets spacing info, not just sizes
- **Per-element box models** — margin / border / padding / content with numeric labels on every side
- **Viewport context** attached to every capture — "120px wide" is meaningless without knowing it's on a 1440px screen
- **Bilingual annotations** — English terms for AI precision + 繁體中文 for humans (`padding: 16px (內邊距)`)

## Why

Every AI-coding interaction that touches UI hits the same wall:

1. Human eyes see "that button is off"
2. Human translates observation into text ("the Save button looks 8px too narrow")
3. AI translates text into code change
4. Something gets lost in each translation

SpecSnap removes step 2. You click what's wrong. AI reads structured data that can't be misread — viewport-qualified coordinates, box-model deltas, inter-element gaps, and the element's own semantic name.

## Status

Pre-alpha (v0.0.x) — schema may change. Locking in at v1.0.

### What v0.0.5 brought

- **`data-i18n-key` / `data-v-source` reverse lookup** — when a build-time tool has injected these attributes, core reads them into `ElementIdentity.i18nKey` and `.source`, and the MD's Basics section emits matching lines. AI can now do i18n key lookups and source-file navigation without grep.
- **Tag-triggered publish workflow** — `.github/workflows/publish.yml` auto-publishes on `core@*` tag push once `NPM_TOKEN` secret is added.
- `SCHEMA_VERSION` bumps to `'0.0.5'` (first wire-format change since 0.0.2; all additions are optional fields, no breaks).

### What v0.0.4 brought

- **File System Access API adapter** in the playground — Copy MD writes into a user-picked folder (Chrome / Edge 86+); older browsers fall back to Downloads/
- **Border subpixel display polish** — DPR 1.5 screens no longer show `0.67 / 0.67 / 0.67 / 0.67` in MD output; rounds cleanly to `1 / 1 / 1 / 1` while keeping exact precision in JSON

### What v0.0.3 brought

- **`toAnnotatedPNG`** — one annotated PNG per frame, focus-frame isolation
- **`toSpecSnapBundle`** — disk-ready bundle: MD + PNGs named `YYYYMMDD-NN-*.png` with relative-path refs inside the MD
- **`filter` option on capture** — exclude consumer UI chrome (panels, toolbars) from the screenshot

## Packages

| Package | Status | Description |
| --- | --- | --- |
| [`@tw199501/specsnap-core`](./packages/core) | 0.0.5 | TypeScript library: capture + serialize (MD / JSON) + annotated PNG + disk-ready bundles + optional i18nKey / source |
| `specsnap-extension` | planned | Chrome / Edge / Firefox extension wrapping core |
| [`apps/playground`](./apps/playground) | Vite demo | Multi-select inspector demo (see screenshot above) |

## Design Docs

- [Creative vision](./docs/superpower/plan/2026-04-19-vision.md) · what we're building, why, the 7 north-star principles
- [Design decisions (v0 lock-in)](./docs/superpower/plan/2026-04-19-decisions.md) · Q1-Q9 with reasoning
- [MVP core plan — Part 1](./docs/superpower/plan/2026-04-19-mvp-core-plan-part-1.md) · bootstrap + types
- [MVP core plan — Part 2](./docs/superpower/plan/2026-04-19-mvp-core-plan-part-2.md) · capture + serializers + ship
- [Retrospective v0.0.1](./docs/superpower/plan/2026-04-20-retrospective-v001.md)
- [v0.0.3 core plan](./docs/superpower/plan/2026-04-20-v003-core-annotated-png-plan.md)
- [v0.0.4 + v0.0.5 closeout plan](./docs/superpower/plan/2026-04-20-v004-v005-closeout-plan.md)

## Requirements

- Node **22+**
- pnpm **9.15+**
- TypeScript **6+** (for contributing)

## Development

Clone, install once, then use the following commands from the repo root.

### Daily dev loop

```bash
# Install workspace dependencies (first time, or after lockfile changes)
pnpm install

# Start the playground dev server — port is pinned to 5999 via vite.config.ts,
# and a predev hook kills any zombie process holding the port first
pnpm -F specsnap-playground dev
# → http://localhost:5999/
```

### Tests

```bash
# Run every workspace's test suite (core + playground)
pnpm test

# Just the core library (82 tests)
pnpm -F @tw199501/specsnap-core test

# Just the playground (fs-access adapter logic)
pnpm -F specsnap-playground test

# Watch mode (core)
pnpm -F @tw199501/specsnap-core test:watch

# Coverage report (core) — outputs to packages/core/coverage/
pnpm -F @tw199501/specsnap-core test:coverage
```

### Check (LF + types)

```bash
# Mirrors the release gate: LF enforcement across all tracked files,
# then tsc --noEmit in every workspace
pnpm check
```

### Build

```bash
# Builds packages/core's dist (tsup — ESM + CJS + d.ts)
pnpm -F @tw199501/specsnap-core build

# Preview what the npm tarball will contain (no upload)
cd packages/core
npm pack --dry-run
cd ../..
```

### Release ritual

```bash
# 1) Bump the version in packages/core/package.json
# 2) Update READMEs + any version-sensitive tests
# 3) Full gate — all green before tagging
pnpm check && pnpm test && pnpm build

# 4) Commit + tag
git add -A
git commit -m "release: @tw199501/specsnap-core@X.Y.Z"
git tag -a core@X.Y.Z -m "core X.Y.Z — one-line summary"

# 5) Push main + tag
git push origin main
git push origin core@X.Y.Z

# 6) Publish to npm (interactive — prompts for 2FA if not cached)
cd packages/core
npm publish
```

Once `NPM_TOKEN` is configured as a repo secret, steps 6 happens
automatically from [publish.yml](./.github/workflows/publish.yml) when
the tag is pushed.

### One-liner: ci gate

```bash
# Everything the GitHub Actions CI runs, locally
pnpm check && pnpm test && pnpm build
```

## License

[MIT](./LICENSE) © tw199501
