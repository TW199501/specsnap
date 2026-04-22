# @tw199501/specsnap-inspector-react

## 0.0.9

### Patch Changes

- 2c0b7e0: Ship the SpecSnap Inspector UI as three new npm packages — `@tw199501/specsnap-inspector-core`, `@tw199501/specsnap-inspector-vue`, `@tw199501/specsnap-inspector-react`. Consumers now get a working Inspector via `npm install` + one component; no more 500-line hand-rolled integration. Version 0.0.6 intentionally skipped to signal this is the "Inspector packages debut" release. `specsnap-core` bumped in lockstep but API unchanged.

  **New packages (all at 0.0.7):**

  - `@tw199501/specsnap-inspector-core` — framework-agnostic headless factory (`createInspector`) with element picker, pub-sub store, daily sequence counter, clipboard, and storage ladder (File System Access → ZIP via `fflate` → individual downloads → `onSave` callback override).
  - `@tw199501/specsnap-inspector-vue` — Vue 3 drop-in `<SpecSnapInspector />` SFC. Uses `<Teleport>` + `shallowRef` subscription.
  - `@tw199501/specsnap-inspector-react` — React 18+ drop-in `<SpecSnapInspector />`. Uses `createPortal` + `useSyncExternalStore`.

  **Infrastructure:**

  - `changesets` for coordinated lockstep releases across the 4 published packages.
  - `dependency-cruiser` CI gate enforcing `inspector-core` stays framework-agnostic (no `vue`/`react`/`react-dom` imports allowed).

  **Versioning note:** 0.0.6 intentionally skipped; this was a conscious jump from 0.0.5 → 0.0.7 to mark the Inspector packages as a meaningful release milestone rather than a routine patch.

- 8632a5e: v0.0.8: polish release addressing two real-user issues surfaced after 0.0.7's first consumer testing.

  **specsnap-core — name formatter smarter (SCHEMA_VERSION 0.0.5 → 0.0.6)**

  Old name formatter used raw `textContent` + 24-char slice → `<h2>A dark card</h2><p>with some styled text</p>` rendered as `div[text="A dark cardwith some sty"]` (block boundary lost + chopped mid-word = unfindable selector). New priority:

  1. `id` → `tag#id`
  2. `aria-label` → `tag[aria-label="…"]`
  3. First heading descendant → `tag[heading="…"]`
  4. Whitespace-normalized text with word-boundary break → `tag[text="…"]`
  5. First class → `tag.class`
  6. Bare tag

  Added 4 new tests in `capture.test.ts` covering the aria-label, heading, whitespace-glue, and word-boundary cases.

  **inspector-react — Panel parity with Vue**

  Port of every per-frame detail view Vue got in 0.0.7 polish — box-model SVG diagram, size/padding/border/margin/font/family/bg/↓gap rows, Copy MD button's `Copying… → Copied ✓ → idle` 1.8s feedback cycle. Both wrappers now render identical information per frame.

  **No breaking changes.** Any 0.0.7 consumer upgrading will see:

  - Different (better) names in MD/JSON
  - Visual parity between Vue/React panels
  - More obvious clipboard feedback on Copy MD clicks

- 1ae24f8: v0.0.9: install simplification — consumers now need only one package.

  **Before**

  ```bash
  pnpm add @tw199501/specsnap-inspector-vue \
           @tw199501/specsnap-inspector-core \
           @tw199501/specsnap-core \
           vue
  ```

  **After**

  ```bash
  pnpm add @tw199501/specsnap-inspector-vue
  ```

  (Same for the React wrapper — `react`/`react-dom` remain peers.)

  **What changed**

  Internal workspace links between SpecSnap packages moved from `peerDependencies` to `dependencies`:

  - `@tw199501/specsnap-inspector-vue` → bundles `@tw199501/specsnap-inspector-core` as a runtime dep.
  - `@tw199501/specsnap-inspector-react` → same.
  - `@tw199501/specsnap-inspector-core` → bundles `@tw199501/specsnap-core` as a runtime dep.

  Framework runtimes (`vue >=3.3`, `react >=18`, `react-dom >=18`) stay as peer deps so consumers keep their own version.

  **Why**

  `peerDependencies` is the right tool when the consumer must provide their own copy (Vue/React, where two copies in one app would break singletons). Internal SpecSnap layers don't have that constraint — making them peers just forced consumers to learn our internal architecture and list 3-4 packages in a single install command. Now they list one.

  **Docs**

  - `README.md` Vue 3 section: previously had no `pnpm add` command at all; now mirrors the React section.
  - `packages/inspector-vue/README.md` and `packages/inspector-react/README.md` install commands collapsed to single-package.

  **No breaking changes for existing consumers** — anyone already on v0.0.8 with the longer install will continue to work; `pnpm install` will just hoist the now-direct deps.

- Updated dependencies [2c0b7e0]
- Updated dependencies [8632a5e]
- Updated dependencies [1ae24f8]
  - @tw199501/specsnap-inspector-core@0.0.9
