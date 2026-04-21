# Phase 0 outcome — tsup + esbuild-plugin-vue3 + vue-tsc works

**Date:** 2026-04-21
**Outcome:** **A** — the tsup pipeline is viable for `inspector-vue`. No fallback to Vite library mode required.

## What was tested

A throwaway `packages/vue-spike/` package with:

- One `.vue` SFC (`Hello.vue`) exercising all three sections: `<template>` + `<script setup lang="ts">` (with `defineProps<{ name: string }>()`) + `<style scoped>`
- `tsup.config.ts` using `esbuild-plugin-vue3` with `external: ['vue']`
- Chained build script: `tsup && vue-tsc --emitDeclarationOnly --declaration --outDir dist`

## Observed output

`pnpm -F @tw199501/vue-spike build` produced:

```
dist/
  Hello.vue.d.ts       # Full DefineComponent<__VLS_Props = { name: string }, ...>
  Hello.vue.d.ts.map
  index.css            # 159 B — scoped .hello { color: #2563eb }
  index.d.ts           # export { default as Hello } from './Hello.vue';
  index.d.ts.map
  index.mjs            # 1.17 KB — compiled _defineComponent + render fn
```

Runtime smoke test:

```bash
$ node packages/vue-spike/smoke.mjs
OK: spike imports and produces a valid Vue component object
```

The compiled `dist/index.mjs` contains:
- A `_defineComponent` call with the correct `props: { name: { type: String, required: true } }`
- A proper `render()` function built via `openBlock()` + `createElementBlock()`
- `Hello_default.render = render` wiring script and template

## Decision

`inspector-vue` (Part 2 Phase 3) will use:

- **Build:** `tsup` with `esbuild-plugin-vue3`, `external: ['vue', '@tw199501/specsnap-inspector-core']`
- **`.d.ts`:** chained `vue-tsc --emitDeclarationOnly --declaration --outDir dist` after tsup
- **CSS:** `dist/index.css` emitted alongside (consumer imports via `./styles.css` subpath export)

No Vite library mode needed. Part 2 plan proceeds as written.

## Build tool versions verified

- `tsup ^8.5.1`
- `esbuild-plugin-vue3 ^0.4.2` (pulls in older `esbuild@0.14.54` — standalone from tsup's own esbuild)
- `vue ^3.5.0`
- `vue-tsc ^2.2.0`
- `typescript ^6.0.3` (root-level)

These versions are what the real `inspector-vue` `package.json` should pin to.
