# v0.0.8 Retrospective — Polish release on top of 0.0.7

**Shipped:** 2026-04-21 (tag `v0.0.8` pushed — CI triggers `publish.yml`-sibling workflow `release.yml` for multi-package npm publish).

**Scope:** Polish release addressing real-user bugs found the moment a human sat down in front of 0.0.7 and tried to use it. Every change listed here was driven by hands-on testing feedback the unit-test / type-check pipeline did not catch.

## What shipped

### Core (`@tw199501/specsnap-core` @ 0.0.8, `SCHEMA_VERSION` 0.0.5 → 0.0.6)

- **Name formatter rewrite.** Priority chain: `id` → `aria-label` → first heading descendant → whitespace-normalized textContent with word-boundary break → class → bare tag. Fixes the `"A dark cardwith some sty"` bug where block-level `textContent` concatenated without whitespace and chopped mid-word at 24 chars.
- 4 new tests covering each priority level.

### Inspector packages (`@tw199501/specsnap-inspector-{core,vue,react}` @ 0.0.8)

Fixes driven by hands-on UX testing of 0.0.7:

1. **Vue Boolean-prop footgun** (`trigger={false}` default): `withDefaults` instead of `?? true` — Vue 3 Boolean props default to `false` when absent, not `undefined`, so nullish coalescing never kicked in.
2. **Picker eating its own tail**: `excludeSelectors` now includes `a[download]`; `onCopyClick` stops picker before save so transient download anchors don't bubble back into the frame list.
3. **Picker vs panel button conflict**: picker's capture-phase listener no longer `preventDefault + stopPropagation` on excluded elements — panel's own click handlers (Start Inspect / Clear / Copy MD) need the click to keep propagating.
4. **Overlay layer missing**: `packages/inspector-core/src/overlay.ts` — on-page numbered badges + outlines + size labels + gap lines via `buildAnnotationSvg`. Subscribes to core store, re-renders on scroll/resize via rAF throttle. Previously only the frame list in the side panel showed capture state; the page itself had no visual feedback.
5. **Per-frame detail view in panel** (Vue + React parity): SVG box-model diagram (4 layers always visible, dashed strokes throughout, content dims in center) + meta rows: size / padding / border / margin / font / family / bg / ↓ gap. Previously only `tag.class` shown.
6. **Copy MD feedback**: button cycles `Copy MD → Copying… → Copied ✓ (green) → Copy MD` on a 1.8s reset timer. Previously clicking Copy MD had no visible acknowledgement.
7. **React StrictMode safety**: `useInspector` defers destroy via `setTimeout(0)`; fake remount cancels the pending destroy. Without this, React 18 dev-mode fake-unmount killed the inspector before the trigger click could reach the live handle.

### Intro screenshots

`intro-vue.png` + `intro-react.png` at repo root — side-by-side 4-pick scenario showing overlay badges, gap lines, panel detail. Embedded in both READMEs under "Use the Inspector UI" as a hero table so npm package-page visitors see the feature parity at a glance.

### Release infrastructure

- `.github/workflows/release.yml` — triggered by `v*` tags, runs `pnpm release` to publish all 4 packages via `changeset publish`. Supersedes the previous `publish.yml` (which was single-package + `core@*`-tag-only) for the multi-package world.

## What went well

- **Every hands-on testing round caught bugs the CI didn't.** 146 unit tests all green, tsc + vue-tsc clean, dependency-cruiser 0 violations → still had Vue trigger not rendering, panel buttons unresponsive, overlay missing, name glue, StrictMode-incompatible React hook, 10 download dialogs popping up. This is the ongoing lesson: ship to a real user early.
- **Fixing on a live worktree with Playwright MCP made verification fast.** `evaluate → screenshot → diff-the-Markdown` loop let us confirm each fix without rebuilding / re-publishing.
- **0.0.8 fits the "patch release" shape.** No breaking API changes; just bug fixes + UI polish that any 0.0.7 consumer gets by bumping.

## What surprised us (again)

- **Vue's Boolean-prop behavior** — `trigger?: boolean` with no `withDefaults` + nullish coalescing fallback is the canonical way to build a footgun into any Vue package. Should be the first code-review sweep item for any future Vue wrapper.
- **React 18 StrictMode is a real filter** — we only discovered the `useInspector` race because the demo-react template imports `<StrictMode>` by default. Production build would not have caught this. Tests that use `@testing-library/react` in a non-StrictMode harness also wouldn't catch it.
- **Playwright click vs stopPropagation** — understanding which clicks the picker's capture listener actually sees (including our own internally-triggered `<a download>.click()` calls!) required rebuilding the mental model of event capture phase.

## Follow-ups for v0.0.9+

- [ ] **Layout section (`display / position / flex*`)** — requires `captureElement` to sample more `getComputedStyle` properties; new `Session.Frame.layout` field; `SCHEMA_VERSION` 0.0.6 → 0.0.7. Requested based on Web Inspector reference screenshot.
- [ ] **Dark theme** — CSS custom properties already in place, just need a media-query / `data-theme` hook.
- [ ] **Colors / Assets tabs** — niche but potentially useful; Colors especially as a swatch overview.
- [ ] **Wrapper tests** — `@vue/test-utils` + `@testing-library/react` integration tests covering props / events / imperative handle / (React) StrictMode safety.
- [ ] **Playground migration** to import inspector-core instead of hand-rolled logic.
- [ ] **antares2 migration** to consume `@tw199501/specsnap-inspector-vue`.

## Metrics

- **Commits on feature branch since 0.0.7**: ~10 (name fix, React port, overlay, boxmodel design iterations, Copy feedback, bg/gap rows, StrictMode fix, intro images, workflows, retrospective).
- **Tests**: 156 passing (86 core + 61 inspector-core + 5 playground + 2 inspector-vue + 2 inspector-react).
- **Published bundle sizes** (approx, gzipped):
  - `specsnap-core` 22 KB
  - `specsnap-inspector-core` 18 KB
  - `specsnap-inspector-vue` 25 KB
  - `specsnap-inspector-react` 16 KB

## Status check

- [x] `pnpm check` green (LF + depcruise + 4 tsc/vue-tsc)
- [x] `pnpm test` green (156 passing)
- [x] `pnpm build` green (4 published packages emit dist/)
- [x] Intro screenshots at repo root, linked from README (en + zh-TW)
- [x] `release.yml` workflow in place for `v*` tag publish
- [x] `SCHEMA_VERSION` bumped to `0.0.6` with test expectations updated
- [x] 4 `package.json` versions at `0.0.8`
- [x] Changeset entry in `.changeset/v008-name-fix-and-react-parity.md`

Merge feature branch → main → tag `v0.0.8` → push → CI publishes.
