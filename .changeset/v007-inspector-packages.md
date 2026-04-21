---
'@tw199501/specsnap-core': patch
'@tw199501/specsnap-inspector-core': patch
'@tw199501/specsnap-inspector-vue': patch
'@tw199501/specsnap-inspector-react': patch
---

Ship the SpecSnap Inspector UI as three new npm packages — `@tw199501/specsnap-inspector-core`, `@tw199501/specsnap-inspector-vue`, `@tw199501/specsnap-inspector-react`. Consumers now get a working Inspector via `npm install` + one component; no more 500-line hand-rolled integration. Version 0.0.6 intentionally skipped to signal this is the "Inspector packages debut" release. `specsnap-core` bumped in lockstep but API unchanged.

**New packages (all at 0.0.7):**

- `@tw199501/specsnap-inspector-core` — framework-agnostic headless factory (`createInspector`) with element picker, pub-sub store, daily sequence counter, clipboard, and storage ladder (File System Access → ZIP via `fflate` → individual downloads → `onSave` callback override).
- `@tw199501/specsnap-inspector-vue` — Vue 3 drop-in `<SpecSnapInspector />` SFC. Uses `<Teleport>` + `shallowRef` subscription.
- `@tw199501/specsnap-inspector-react` — React 18+ drop-in `<SpecSnapInspector />`. Uses `createPortal` + `useSyncExternalStore`.

**Infrastructure:**

- `changesets` for coordinated lockstep releases across the 4 published packages.
- `dependency-cruiser` CI gate enforcing `inspector-core` stays framework-agnostic (no `vue`/`react`/`react-dom` imports allowed).

**Versioning note:** 0.0.6 intentionally skipped; this was a conscious jump from 0.0.5 → 0.0.7 to mark the Inspector packages as a meaningful release milestone rather than a routine patch.
