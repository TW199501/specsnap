# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**SpecSnap** — a zero-loss translator between "human inspects UI visually" and "AI modifies UI precisely." Captures DOM elements into AI-friendly structured payloads (Markdown + JSON) with viewport context, box model, typography, and inter-element gaps. Pre-alpha (v0.0.x); schema stabilizes at v1.0.

The vision, decisions, and per-version plans live in [docs/superpower/plan/](docs/superpower/plan/). Read these before large changes — they explain the "why" behind choices that look arbitrary in code (e.g. the bilingual lexicon, mandatory viewport on every session).

## Repo layout

pnpm workspace (`pnpm-workspace.yaml` → `packages/*`, `apps/*`):

- [packages/core](packages/core) — `@tw199501/specsnap-core`, the only published package. Pure TypeScript, zero runtime deps, ships `.mjs` + `.cjs` + `.d.ts` via tsup.
- [apps/playground](apps/playground) — Vite demo that imports core via `workspace:*`. Not published. Doubles as the primary visual regression check for capture/serialize changes.
- [docs/superpower/plan/](docs/superpower/plan/) — dated brainstorm → decisions → plan → retrospective docs. Treat these as the source of truth for scope decisions.

## Commands

Run from repo root unless noted. Requires Node ≥ 20 and pnpm (pinned to 9.15.0 via `packageManager`).

```bash
pnpm install                    # bootstrap workspace
pnpm build                      # -r build: tsup builds packages/core
pnpm test                       # -r test: runs vitest in packages/core
pnpm check                      # LF check + -r tsc --noEmit (the CI gate)
pnpm check:eol                  # LF-only guard (see Line endings below)
```

Inside `packages/core`:

```bash
pnpm -F @tw199501/specsnap-core test              # run all tests once
pnpm -F @tw199501/specsnap-core test:watch        # vitest watch mode
pnpm -F @tw199501/specsnap-core test:coverage     # v8 coverage → coverage/
pnpm -F @tw199501/specsnap-core check             # tsc --noEmit (type-only)
pnpm -F @tw199501/specsnap-core dev               # tsup --watch
```

Run a single test file or test name:

```bash
pnpm -F @tw199501/specsnap-core exec vitest run src/gap.test.ts
pnpm -F @tw199501/specsnap-core exec vitest run -t "computes horizontal gap"
```

Playground:

```bash
pnpm -F specsnap-playground dev    # Vite dev server
```

## Architecture

Core is a single-purpose library: **DOM element → structured Session → Markdown/JSON**. The pipeline is intentionally small and linear.

### The Session schema is the product

Everything else is in service of emitting a stable, versioned `Session` object ([packages/core/src/types.ts](packages/core/src/types.ts)).

- `SCHEMA_VERSION` (currently `0.0.2`) is stamped onto every session at capture time. Bump it deliberately when any exported interface changes — downstream consumers branch on `session.schemaVersion`.
- A Session always carries `viewport` (`width`, `height`, `devicePixelRatio`) and `scroll` — this is non-negotiable (Principle P1 in [docs/superpower/plan/2026-04-19-vision.md](docs/superpower/plan/2026-04-19-vision.md)). Coordinates without viewport context are meaningless to AI.
- `Frame.rect` is **document-relative**, not viewport-relative. `viewportRelative` is a separate `{xPct, yPct}` field computed from the rect + viewport. Don't conflate them.
- `BoxModel.padding/border/margin` use the tuple `FourSides = [top, right, bottom, left]`. The serializer emits "上/右/下/左" in the same order; do not reorder.

### Pipeline

1. **[viewport.ts](packages/core/src/viewport.ts)** — `captureViewport()` / `captureScroll()`. Take an optional `Window` for test injection.
2. **[capture.ts](packages/core/src/capture.ts)** — `captureElement(el, index)` → `Frame`; `captureSession(elements)` → `Session`. The session builder also invokes `computeGap` between consecutive frames.
3. **[gap.ts](packages/core/src/gap.ts)** — axis-aligned distance between two `Rect`s. Returns `null` for overlap, diagonal, or 0px touch. 1-based indices.
4. **[lexicon.ts](packages/core/src/lexicon.ts)** — `DEFAULT_LEXICON` is a frozen 56-property Traditional-Chinese lookup. `annotate(prop, override)` is the only read API; callers must not mutate the default.
5. **[serialize-md.ts](packages/core/src/serialize-md.ts)** — `toMarkdown(session)` emits **one string per frame**; gaps are attached only to frame 1's document. The caller joins with a separator (the playground uses `━━━━━`).
6. **[serialize-json.ts](packages/core/src/serialize-json.ts)** — `toJSON(session, { pretty })`. Pretty-prints by default.

Everything is exported via [packages/core/src/index.ts](packages/core/src/index.ts). When adding public API, update this barrel and bump `SCHEMA_VERSION` if any type changed.

### Test environment

- vitest with `environment: 'happy-dom'` and `globals: true` ([vitest.config.ts](packages/core/vitest.config.ts)).
- **happy-dom returns zero-sized `getBoundingClientRect()`** — so you cannot assert real rect/gap values from DOM-driven tests. Test the gap algorithm directly with `computeGap(…, Rect, Rect)` in [gap.test.ts](packages/core/src/gap.test.ts); test the DOM-wiring path only for structural invariants (frame count, index assignment, empty-session handling). This is a known limitation, documented inline in [capture.test.ts:130](packages/core/src/capture.test.ts#L130).
- Tests **co-locate** with source as `*.test.ts` (Jest-style, not a `tests/` sibling directory). Coverage excludes `*.test.ts`, `types.ts` (types-only), and `dom-fixture.ts` (test helper).
- `dom-fixture.ts` provides `makeElement` / `mount` / `clearBody` — prefer these over inline `document.createElement` in tests; they avoid `innerHTML` for consistency.

## TypeScript settings (non-default ones that matter)

[tsconfig.base.json](tsconfig.base.json) enables `strict`, plus:

- `exactOptionalPropertyTypes: true` — `foo?: string` is not assignable from `string | undefined`. Pass optional fields explicitly or omit.
- `noUncheckedIndexedAccess: true` — `array[i]` is `T | undefined`. Existing code uses non-null assertions (`frames[0]!`) where the index is provably valid; match that style.
- `verbatimModuleSyntax: true` — use `import type { … }` for type-only imports and keep `.js` extensions on internal imports even though the files are `.ts` (bundler resolution).
- `moduleResolution: "bundler"` — works with tsup; don't "fix" import extensions.

## Build output

[tsup.config.ts](packages/core/tsup.config.ts) emits both formats with matching extensions:

- `dist/index.mjs` (ESM) / `dist/index.cjs` (CJS) / `dist/index.d.ts` / `dist/index.d.cts` + source maps.
- The `outExtension` override is load-bearing: without it tsup emits `.js` which mismatches `package.json.module` (`./dist/index.mjs`). Retrospective notes this was a fix; don't remove it.

## Line endings — enforced in 4 layers

LF is mandatory everywhere. If any layer is removed, Windows editors silently reintroduce CRLF and the CI gate breaks. All 4 layers must coexist:

1. [.gitattributes](.gitattributes) — `* text=auto eol=lf` + binary extension list. Source of truth.
2. [.editorconfig](.editorconfig) — LF + UTF-8 + 2-space indent, recognized by all major editors.
3. [.vscode/settings.json](.vscode/settings.json) — per-project VS Code overrides so contributors don't need global config.
4. [scripts/check-line-endings.mjs](scripts/check-line-endings.mjs) — CI guard that scans `git ls-files` for CRLF and exits 1. Runs via `pnpm check:eol`.

Rationale and the history of how this was chosen is in [docs/superpower/plan/2026-04-19-decisions.md](docs/superpower/plan/2026-04-19-decisions.md) (Q9). **Never edit files from PowerShell/Notepad on Windows** — they save CRLF by default.

## Conventions

- **Semantic versioning**: the npm package version and `SCHEMA_VERSION` track separately. Breaking the schema → bump `SCHEMA_VERSION` in [types.ts](packages/core/src/types.ts) **and** regenerate any test expectations asserting it (grep for the literal version string).
- **Bilingual annotations are a schema feature, not an afterthought.** The Markdown output interleaves English CSS terms with Traditional-Chinese labels (`padding: 16px (內邊距)`). Principle P3 — don't strip them, don't remove lexicon entries without updating `toMarkdown` and its tests.
- **P7 — observe, not modify.** Capture code must never mutate the host page. No writes to `el.style`, no event listeners attached on the page's behalf, no DOM injection. The overlay rendering in the playground is a separate consumer concern.
- **Numbered badges must stay stable across overlay / Markdown / JSON.** The `index` on a `Frame` (1-based) is what ties on-page overlay, box-model panel, exported Markdown, and JSON together. Don't silently renumber during serialization.

## License & authorship

MIT © tw199501. Single-author project; no CLA. The `author` + `repository` fields in [packages/core/package.json](packages/core/package.json) drive npm attribution.
