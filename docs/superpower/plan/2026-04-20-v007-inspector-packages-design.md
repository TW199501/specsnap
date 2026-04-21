# SpecSnap 0.0.7 — Inspector UI Packages (vanilla core + Vue + React) Design Spec

> **Status:** Design spec — input to `writing-plans`. Not yet decomposed into tasks.
> **Target release:** `0.0.7` (skipping `0.0.6` by intent — see "Versioning" below).
> **Date:** 2026-04-20
> **Author:** brainstorming session with tw199501

---

## Goal

Close the gap between "npm install `@tw199501/specsnap-core`" and "there's a usable SpecSnap UI on the page". Today, the only working Inspector UI lives in (a) `apps/playground/main.ts` (vanilla TS, unpublished demo) and (b) `antares2/TheSpecSnapInspector.vue` (private downstream repo). External consumers get a headless library and have to rebuild ~500 lines of Inspector from scratch — which is why the complaint "SpecSnap has no UI" is correct from their vantage point.

This release ships the Inspector as three public npm packages so that `pnpm add @tw199501/specsnap-inspector-vue` (or `-react`) + drop one component = working Inspector.

---

## Decisions locked during brainstorming

Signed off by the user in order; this doc is the consolidated record.

| # | Decision | Rationale |
| --- | --- | --- |
| D1 | **Three packages**: `-inspector-core` (headless) + `-inspector-vue` + `-inspector-react` | Shared logic written once; wrappers stay thin. User preference was initially B (independent) — flipped to A (shared core) after concrete duplicated-bug scenario (iframe picker bug would need two fixes under B). |
| D2 | **Scope = "batteries included + escape hatch"** | All 9 playground Inspector features shipped by default (see list below); storage auto-degrades (fs-access → ZIP download → individual file downloads); `onSave` prop overrides built-in storage entirely. User target was "let others integrate easily" — ruled out the MVP-only option. |
| D3 | **Trigger = (iii) default built-in + optional disable** | Small floating trigger button at bottom-right; consumer can pass `trigger={false}` and drive via imperative `open()` / `close()` on a ref. Mirrors the `onSave` escape-hatch philosophy: default works, advanced can override. |
| D4 | **Picker scope default =** `**document.body**`**, exclude self** | Matches antares2's "inspect whole page" behavior; playground-style `.targets` restriction becomes an optional `scope` prop. |
| D5 | **Panel position default = bottom-right, four-corner prop, draggable** | Because panel is hidden by default (D3), position only matters after open. |
| D6 | **Versioning = all 3 new packages + core bump to 0.0.7 in lockstep** | Single coordinated release; avoids mismatched peer-ranges at first publish. |
| D7 | **Playground upgrades in same release** | Replace its hand-rolled Inspector with an import of `-inspector-core` (and demo the Vue wrapper side-by-side). Ends the "two sources of truth" problem that the current CLAUDE.md tries to paper over with discipline. |

**The 9 features shipped at default** (referenced by D2):

1.  Floating panel (420×540, draggable)
2.  Start Inspect button (element-picker mode toggle with frame-count badge)
3.  Clear button
4.  Copy MD button → `navigator.clipboard.writeText(toMarkdown(session))`
5.  Live frame list (each frame shows index, tag, box model)
6.  Raw JSON drawer (collapsible)
7.  `next: YYYYMMDD-NN` hint (persisted across sessions in localStorage)
8.  Bundle save (MD + per-frame PNGs into `specsnap/YYYYMMDD/*`) — see storage ladder below for degradation path
9.  Save-status line (`✓ Saved to /path (3 files)` / `✓ Downloaded ZIP` / error messages)

Decisions deferred to implementation (not yet debated):

*   Exact CSS custom property names for theming
*   Whether to use CSS Modules, scoped CSS, or inline-style for React wrapper
*   Exact jszip-vs-alternatives choice for the ZIP fallback

---

## Architecture

### Workspace after this release

```
packages/
  core/                   @tw199501/specsnap-core              (unchanged — still headless library, bumps to 0.0.7)
  inspector-core/         @tw199501/specsnap-inspector-core    (NEW)
  inspector-vue/          @tw199501/specsnap-inspector-vue     (NEW)
  inspector-react/        @tw199501/specsnap-inspector-react   (NEW)
apps/
  playground/             (REFACTORED — uses inspector-core for vanilla demo, inspector-vue for framework demo)
```

### Dependency graph (single-direction, enforced by CI)

```
inspector-vue    ─┐
                  ├─► inspector-core ─► specsnap-core
inspector-react  ─┘
```

*   `inspector-core` has `@tw199501/specsnap-core` as a `peerDependency` with `workspace:^` in the monorepo (`^0.0.7` published).
*   `inspector-vue` has `@tw199501/specsnap-inspector-core` + `vue` (>=3.3) as peer deps.
*   `inspector-react` has `@tw199501/specsnap-inspector-core` + `react` (>=18) + `react-dom` as peer deps.

### Boundary discipline (prevents core-bloat regression)

| Rule | Enforcement |
| --- | --- |
| `inspector-core` MUST NOT import `vue` / `react` / any JSX / any `.vue` SFC | dependency-cruiser rule in CI (`packages/inspector-core/**` forbidden to resolve \`vue |
| `inspector-core` MUST NOT emit CSS | tsup config has no CSS plugin; no `.css` imports allowed |
| Both wrappers MUST delegate logic to core, never re-implement | Code review + per-wrapper tests that mock `inspector-core` and assert it's called for every user action |
| `specsnap-core` is not allowed to import from `inspector-*` packages | Trivially enforced by dependency direction |

### What lives where

| Concern | `inspector-core` | `inspector-vue` / `inspector-react` |
| --- | --- | --- |
| Element picker (hover outline + click capture) | ✅ — `startPicker({ scope })` / `stopPicker()` | — |
| Frame list state | ✅ — `subscribe(listener)` / `getSnapshot()` | Bind via `ref`+`onMounted` (Vue) / `useSyncExternalStore` (React) |
| Sequence counter + localStorage | ✅ — `getNextCaptureId()`, `commitSequence(n)` | — |
| Clipboard write | ✅ — `copyMarkdownToClipboard()` | — |
| fs-access bridge + ZIP fallback + individual-download fallback | ✅ — `saveBundle(bundle, opts)` with auto-strategy | — |
| Imperative API (`open`, `close`, `clearFrames`) | ✅ — on the core instance | Wrappers re-expose via `ref` handle |
| DOM rendering (panel HTML, buttons, frame list) | ❌ | ✅ |
| CSS / styling | ❌ | ✅ |

Core exposes a single factory: `createInspector(options)` returning `{ subscribe, getSnapshot, open, close, startPicker, stopPicker, clearFrames, copyMarkdown, saveBundle, destroy }`. Wrappers instantiate one per component mount and tear it down on unmount.

---

## Public API surface

### Vue (`@tw199501/specsnap-inspector-vue`)

```
<template>
  <SpecSnapInspector
    :scope="scopeRef"
    :position="'bottom-right'"
    :trigger="true"
    @save="onSave"
    @copy="onCopy"
    @capture="onCapture"
    @clear="onClear"
    ref="inspectorRef"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { SpecSnapInspector } from '@tw199501/specsnap-inspector-vue';
import type { SpecSnapInspectorHandle, SpecSnapBundle } from '@tw199501/specsnap-inspector-vue';

const scopeRef = ref<HTMLElement | null>(null); // optional; default = document.body
const inspectorRef = ref<SpecSnapInspectorHandle>();

function onSave(bundle: SpecSnapBundle) { /* optional; if present, overrides built-in storage */ }
function onCopy(markdown: string) { /* fired when user clicks Copy MD */ }
function onCapture(frameIndex: number) { /* fired per-frame addition */ }
function onClear() { /* fired when user clicks Clear */ }

// imperative (e.g. wire to own debug menu button):
// inspectorRef.value?.open();
</script>
```

### React (`@tw199501/specsnap-inspector-react`)

```
import { useRef } from 'react';
import { SpecSnapInspector } from '@tw199501/specsnap-inspector-react';
import type { SpecSnapInspectorHandle, SpecSnapBundle } from '@tw199501/specsnap-inspector-react';

function App() {
  const ref = useRef<SpecSnapInspectorHandle>(null);
  return (
    <SpecSnapInspector
      ref={ref}
      scope={null /* = document.body */}
      position="bottom-right"
      trigger
      onSave={(bundle: SpecSnapBundle) => { /* override storage */ }}
      onCopy={(md) => { /* observability */ }}
      onCapture={(index) => { }}
      onClear={() => { }}
    />
  );
}
```

### Shared props / events contract

Both wrappers implement the same shape; types re-exported from each wrapper but sourced in `inspector-core`.

| Prop | Type | Default | Purpose |
| --- | --- | --- | --- |
| `scope` | \`HTMLElement | (() => HTMLElement) | null\` |
| `position` | \`'top-left' | 'top-right' | 'bottom-left' |
| `trigger` | `boolean` | `true` | If `false`, no built-in trigger button; must drive open/close via `ref` |
| `initialSequence` | `number` | (read from localStorage for today) | Override the daily counter starting value |
| `sequenceStorageKey` | `string` | `'specsnap:sequence'` | localStorage key, in case consumer runs multiple inspectors |
| `panelTitle` | `string` | `'SpecSnap Inspector'` | Header text |

| Event (Vue `@`) / Callback (React `on*`) | Payload | Fired when |
| --- | --- | --- |
| `save` | `SpecSnapBundle` | User triggers bundle save (Copy MD) — **if provided, overrides built-in storage** |
| `copy` | `markdown: string` | User clicks Copy MD — fired regardless of save behavior |
| `capture` | `{ frameIndex: number; session: Session }` | A new frame is added |
| `clear` | `void` | User clicks Clear |
| `open` | `void` | Panel opens (trigger click or imperative `open()`) |
| `close` | `void` | Panel closes (close button, ESC, or imperative `close()`) |

| Imperative handle (via `ref`) | Signature |
| --- | --- |
| `open()` | `() => void` |
| `close()` | `() => void` |
| `toggle()` | `() => void` |
| `startPicker()` | `() => void` |
| `stopPicker()` | `() => void` |
| `clearFrames()` | `() => void` |
| `getSnapshot()` | `() => InspectorSnapshot` — current frames, sequence, visibility |

---

## Default behavior ladder

### Visibility

*   **Mount time**: only the trigger button is in the DOM (44px circular button at `position` corner, ~12px edge margin, z-index 2147483000). The 420×540 panel is not rendered.
*   **Trigger click**: panel mounts, picker mode is **off** (user must click "Start Inspect" explicitly — prevents accidental capture).
*   **Close**: panel unmounts, picker is stopped, frames are preserved in core state so reopening shows previous captures.

### Storage fallback (when `onSave` is NOT provided)

Tried in order, first success wins:

1.  **File System Access API** (`window.showDirectoryPicker` available — Chromium 86+): mounts the bundle into `specsnap/YYYYMMDD/*`; folder handle persisted in IndexedDB so subsequent saves skip the picker.
2.  **ZIP download** (fs-access unavailable, but browser supports `<a download>`): dynamic-imports a zipping lib, triggers a single `YYYYMMDD-NN.zip` download containing the MD + PNGs.
3.  **Individual downloads** (ZIP lib load failed — very narrow edge case): triggers N+1 `<a download>` clicks for each MD and PNG.

Status line in the panel reflects which path ran (`✓ Saved to /path (3 files)` / `✓ Downloaded ZIP` / `✓ Downloaded 4 files`).

### When `onSave` IS provided

Built-in storage is completely skipped. Wrapper just calls `onSave(bundle)` and renders a status line saying "✓ Handled by app" (or whatever the app returns from the callback — if a Promise rejects, status shows error).

---

## Build + test + release strategy

### Build tooling

| Package | Tool | Output |
| --- | --- | --- |
| `inspector-core` | tsup (matches existing core) | `.mjs` + `.cjs` + `.d.ts` |
| `inspector-vue` | unbuild or Vite library mode (needs `.vue` SFC compilation) — evaluate during implementation | `.mjs` + `.d.ts` + CSS file |
| `inspector-react` | tsup (TSX works in tsup out of the box) | `.mjs` + `.cjs` + `.d.ts` + CSS file |

### Test infrastructure

*   `**inspector-core**`: vitest + happy-dom (same as `specsnap-core`). fs-access / ZIP paths mocked via injectable adapters (same pattern as `apps/playground/fs-access.ts` already uses).
*   `**inspector-vue**`: vitest + `@vue/test-utils` + happy-dom. Each test mounts the component, asserts it called the mocked core exactly as expected.
*   `**inspector-react**`: vitest + `@testing-library/react` + happy-dom. Same mock-core pattern.
*   **Playground**: its existing vitest stays; gains a few tests that `inspector-core` is correctly wired.

**Known limitation (inherited)**: happy-dom returns zero-sized rects, so picker-hover visual tests can't assert real bounding boxes. Mitigation (same as existing code): test the state-machine layer with pure inputs; test DOM wiring only for structural invariants.

### Release workflow

*   Use **changesets** for coordinated release (new tooling for this repo — not yet installed; add as part of the plan).
*   All 4 published packages bump to `0.0.7` in one changeset.
*   `SCHEMA_VERSION` in `specsnap-core` bumps to `0.0.7` only if the schema surface changes. If the Inspector adds new fields to `Session` (e.g. a `sessionId` for the bundle id), bump; otherwise keep at `0.0.5`.
*   Pre-publish CI: `pnpm check` + `pnpm test` + `pnpm build` + smoke integration test (mount `<SpecSnapInspector />` in a scratch app and assert `document.querySelector` hits). All must pass.
*   First publish order: `specsnap-core` → `inspector-core` → `inspector-vue` + `inspector-react` in parallel. Changesets handles this automatically.

### Versioning rationale (why 0.0.7, skipping 0.0.6)

`0.0.5` is current. `0.0.6` is deliberately skipped per user instruction — conceptually reserved for "a core-only patch release if one becomes urgent during this feature work". If nothing urgent surfaces, `0.0.6` is simply never published (npm is tolerant of gaps). Bumping straight to `0.0.7` signals this is the "Inspector packages ship" release.

---

## Playground migration

Playground is refactored in the same release:

*   Delete ~400 lines of hand-rolled Inspector from `apps/playground/main.ts`.
*   Mount `inspector-core` directly for the vanilla-TS demo variant.
*   Add a second demo tab / route that mounts `inspector-vue` — proves the Vue package works in a real app and gives contributors a live example.
*   Keep the playground's `.targets` dashed-border testing region; pass it via `scope` prop.
*   Playground's `fs-access.ts` **moves** into `inspector-core/src/storage/fs-access.ts` — no behavioral change, just a relocation. Playground imports it from core via `import { ... } from '@tw199501/specsnap-inspector-core/storage'` (or a more curated re-export).

This completes D7 — after this release, there is exactly **one source of truth** for the Inspector UI.

---

## antares2 migration (out of scope for this release)

The downstream Vue component `TheSpecSnapInspector.vue` in antares2 will be replaced with `import { SpecSnapInspector } from '@tw199501/specsnap-inspector-vue'` — but that work happens in the antares2 repo after this release ships. Listed here as a follow-up so it isn't forgotten:

*   In antares2: swap component import + update `onSave` wiring to match new callback signature
*   Delete `antares2/TheSpecSnapInspector.vue`
*   Verify antares2's existing inspector usage (panel position, scope, keyboard shortcuts) still works

If antares2 has features the playground doesn't (unknown to the author of this spec — user couldn't recall any differences), those become either:

*   (a) Deficiencies of the shipped Inspector → follow-up PR to `-inspector-core`
*   (b) antares2-specific customization → stays in antares2, wired via props on the new component

---

## Risks

| # | Risk | Mitigation |
| --- | --- | --- |
| R1 | Core-boundary drift over time (same problem that spawned this refactor) | dependency-cruiser CI rule in the very first commit; any PR that violates it cannot merge |
| R2 | `.vue` SFC build in tsup pipeline — currently untested in this repo | First task of the plan is to prove the Vue build works end-to-end (hello-world SFC published, imported by a scratch Vite app). If tsup plus a plugin can't do it, fall back to Vite library mode. Gate the whole design on this working. |
| R3 | SSR regression — wrapper imported in Next.js/Nuxt breaks at build time (core uses `document.addEventListener` eagerly) | Core factory guards: `if (typeof window === 'undefined') throw new Error('SpecSnap Inspector requires a browser environment')`; wrappers only call the factory inside `onMounted` / `useEffect` |
| R4 | React 18 Strict Mode double-invokes effects → picker subscribes twice → ghost handlers | Use `useSyncExternalStore` which Strict-Mode-safe by design; document-level listeners attached inside `useEffect` with proper cleanup |
| R5 | ZIP fallback bundle size regression if jszip brings in `stream` or `buffer` polyfills | Evaluate `fflate` (~10KB brotli, pure ESM, no polyfills) vs~ `~jszip~` ~(~40KB gzip) during implementation; pick the smaller one that covers `specsnap/YYYYMMDD/*.png` + `.md` case |
| R6 | Imperative `ref` handles fighting with component re-mounts (esp. React Strict Mode) | Handle methods delegate to core instance; core instance is stored in `useRef`/`ref` at the wrapper level, not recreated per render |
| R7 | Trigger button visual quality ("made it myself" look) lowers perceived product quality | Spend 15-20 minutes on the trigger design during implementation: use the existing `#2563eb` selected-blue from `annotate.ts` (project already has a color system), subtle shadow, hover state, ESC-to-close hint |

---

## Open questions / TBDs

1.  **Trigger button icon** — use a logo mark or plain `?` / camera emoji? (Nice-to-have; can defer or iterate post-release.)
2.  **CSS custom properties naming** — e.g. `--specsnap-inspector-panel-bg` vs `--ssp-bg`. Decide during implementation.
3.  **Does** `**SpecSnapBundle**` **stay in** `**specsnap-core**` **or move to** `**-inspector-core**`**?** — Currently in `specsnap-core`. Leaning "stay put" so headless consumers can also import the type; wrappers re-export it.
4.  **Minimum supported Vue / React versions** — proposed: Vue `>=3.3`, React `>=18` (for `useSyncExternalStore`). Confirm during implementation by checking antares2's Vue version.
5.  **Should** `**inspector-core**` **have a single-file vanilla** `**mount(el, options)**` **convenience export?** — Would make the playground's vanilla demo a one-liner and would be useful for "integrate without a framework" users. Proposed: yes, ship it alongside the factory API.

---

## Success criteria

This release is done when:

*   All 4 published packages (`specsnap-core`, `-inspector-core`, `-inspector-vue`, `-inspector-react`) are published at `0.0.7` on npm.
*   In a scratch Vite + Vue 3 project: `pnpm add @tw199501/specsnap-inspector-vue vue` → add `<SpecSnapInspector />` to `App.vue` → dev server shows the trigger button → click → panel opens → Start Inspect → click element → frame captured → Copy MD → (in Chromium) prompt for folder → files land on disk. Zero additional code.
*   In a scratch Vite + React 18 project: equivalent flow with `<SpecSnapInspector />` in `App.tsx`.
*   Playground still passes all its tests and now imports from `inspector-core` / `inspector-vue`.
*   CI green: `pnpm check` + `pnpm test` + dependency-cruiser rule.
*   README (en + zh-TW) has a "Use the Inspector UI" section with copy-pasteable code.
*   CLAUDE.md updated: "Inspector panel is the UI we ship" entry now points at the packages, not at `apps/playground/main.ts`.
*   0.0.7 retrospective written at `docs/superpower/plan/2026-04-20-retrospective-v007.md` (or dated when the release actually happens).

---

**Next step:** invoke `superpowers:writing-plans` to decompose this into an executable task list (`2026-04-20-v007-inspector-packages-plan.md`).
