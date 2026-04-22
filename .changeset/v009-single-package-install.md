---
'@tw199501/specsnap-core': patch
'@tw199501/specsnap-inspector-core': patch
'@tw199501/specsnap-inspector-vue': patch
'@tw199501/specsnap-inspector-react': patch
---

v0.0.9: install simplification — consumers now need only one package.

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
