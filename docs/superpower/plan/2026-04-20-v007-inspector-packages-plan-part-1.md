# SpecSnap 0.0.7 — Inspector Packages Implementation Plan (Part 1 of 2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Execution environment:** Do this work in a git worktree, not on `main`. See [superpowers:using-git-worktrees](../../superpowers/skills/) before starting. All `git commit` commands below assume you are in the worktree.

**Goal:** Ship the SpecSnap Inspector UI as three installable npm packages (`@tw199501/specsnap-inspector-core`, `-vue`, `-react`) so that external consumers get a working Inspector with `npm install` + one component. Part 1 lays the foundation: retire the Vue-SFC build risk, set up release + boundary infrastructure, and build the framework-agnostic `inspector-core` package that both wrappers will consume.

**Architecture:** Three new packages with strict single-direction dependency (`inspector-vue` ─► `inspector-core` ─► `specsnap-core`; `inspector-react` ─► `inspector-core` ─► `specsnap-core`). `inspector-core` is pure TypeScript + DOM APIs, no framework imports. It exposes `createInspector(options)` returning an imperative handle + a subscribe/getSnapshot pub-sub store. Storage uses a fallback ladder: File System Access → ZIP download (via `fflate`, dynamic-imported) → individual downloads.

**Tech Stack:** TypeScript strict, tsup, vitest + happy-dom, pnpm workspace, changesets (new), dependency-cruiser (new), `fflate` ^0.8 (new — dynamic-imported only), `@tw199501/specsnap-core` ^0.0.7 peer dep.

**Spec:** See [2026-04-20-v007-inspector-packages-design.md](2026-04-20-v007-inspector-packages-design.md). Decisions D1–D7 and the 9 default features are the authoritative contract.

---

## File Structure (Part 1 scope)

**New packages:**

- `packages/inspector-core/` — new workspace package `@tw199501/specsnap-inspector-core` @ 0.0.7
  - `src/types.ts` — public types (`InspectorOptions`, `InspectorSnapshot`, `InspectorHandle`, etc.)
  - `src/picker.ts` — element picker (hover outline + click capture) — framework-agnostic
  - `src/store.ts` — pub-sub state store (frames, picker mode, panel visibility, sequence counter)
  - `src/sequence.ts` — daily sequence counter backed by localStorage
  - `src/clipboard.ts` — `copyTextToClipboard(text)`
  - `src/storage/fs-access.ts` — File System Access API branch (ported from `apps/playground/fs-access.ts`)
  - `src/storage/zip-fallback.ts` — fflate-based ZIP download (dynamic-imported)
  - `src/storage/individual-fallback.ts` — per-file `<a download>` clicks
  - `src/storage/save-bundle.ts` — unified `saveBundleWithLadder(bundle, opts)`
  - `src/create-inspector.ts` — the `createInspector(options)` factory — wires everything together
  - `src/mount.ts` — `mount(el, options)` vanilla convenience helper (per Open Question #5, decided yes)
  - `src/index.ts` — public barrel
  - `src/*.test.ts` — co-located tests
  - `tsup.config.ts`, `vitest.config.ts`, `package.json`, `tsconfig.json`, `README.md`

**New root config:**

- `.dependency-cruiser.cjs` — boundary enforcement rules
- `.changeset/config.json` — release coordination (new tooling for this repo)
- `.changeset/README.md` — changesets intro (auto-generated on init)

**Modified files:**

- `package.json` (root) — add `changeset` / `changeset publish` / `changeset version` scripts, add `depcruise` script
- `pnpm-workspace.yaml` — no change (packages/* glob already includes inspector-core)
- `packages/core/package.json` — bump to `0.0.7` (but NOT in Part 1 — deferred to Phase 7 release in Part 2)

**Temporary spike files (deleted at end of Phase 0):**

- `packages/vue-spike/` — throwaway package to validate Vue-SFC-in-tsup

---

## Phase 0: Retire the Vue-SFC-in-tsup risk (R2 from spec)

Until we prove we can build a `.vue` file into a publishable `.mjs` + `.d.ts` with our existing tooling (tsup), all downstream planning for `inspector-vue` is speculative. A 30-minute spike de-risks the whole plan. If tsup can't handle Vue SFCs cleanly, we commit to Vite library mode for `inspector-vue` and adjust Part 2 accordingly.

### Task 0.1: Create a throwaway Vue-spike package

**Files:**

- Create: `packages/vue-spike/package.json`
- Create: `packages/vue-spike/tsup.config.ts`
- Create: `packages/vue-spike/src/index.ts`
- Create: `packages/vue-spike/src/Hello.vue`
- Create: `packages/vue-spike/tsconfig.json`

- [ ] **Step 1: Create `packages/vue-spike/package.json`**

```json
{
  "name": "@tw199501/vue-spike",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./dist/index.mjs",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsup",
    "clean": "rm -rf dist"
  },
  "peerDependencies": {
    "vue": ">=3.3"
  },
  "devDependencies": {
    "@types/node": "^22.10.0",
    "esbuild-plugin-vue3": "^0.4.2",
    "tsup": "^8.5.1",
    "typescript": "^6.0.3",
    "vue": "^3.5.0",
    "vue-tsc": "^2.2.0"
  }
}
```

- [ ] **Step 2: Create `packages/vue-spike/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "jsx": "preserve",
    "types": ["node"]
  },
  "include": ["src/**/*.ts", "src/**/*.vue"]
}
```

- [ ] **Step 3: Create `packages/vue-spike/src/Hello.vue`**

```vue
<template>
  <div class="hello">Hello {{ name }}</div>
</template>

<script setup lang="ts">
defineProps<{ name: string }>();
</script>

<style scoped>
.hello { color: #2563eb; }
</style>
```

- [ ] **Step 4: Create `packages/vue-spike/src/index.ts`**

```ts
export { default as Hello } from './Hello.vue';
```

- [ ] **Step 5: Create `packages/vue-spike/tsup.config.ts`**

```ts
import { defineConfig } from 'tsup';
import vuePlugin from 'esbuild-plugin-vue3';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: false,
  outExtension: () => ({ js: '.mjs' }),
  clean: true,
  esbuildPlugins: [vuePlugin()],
  external: ['vue']
});
```

Note: `dts: false` because tsup's built-in d.ts emitter does not understand `.vue` SFCs — we chain `vue-tsc` in Task 0.3.

- [ ] **Step 6: Commit the spike scaffold**

```bash
git add packages/vue-spike
git commit -m "spike: vue-spike package to validate .vue SFC build with tsup"
```

### Task 0.2: Build the spike and verify output

**Files:** — (no file changes; just running commands)

- [ ] **Step 1: Install new dev deps at the workspace root**

```bash
pnpm install
```

Expected: pnpm installs `esbuild-plugin-vue3`, `vue`, `vue-tsc`, etc., into `packages/vue-spike/node_modules`.

- [ ] **Step 2: Build the spike**

```bash
pnpm -F @tw199501/vue-spike build
```

Expected: `packages/vue-spike/dist/index.mjs` exists and contains compiled Vue SFC output (render function, scoped CSS injection).

- [ ] **Step 3: Inspect the output**

```bash
head -20 packages/vue-spike/dist/index.mjs
```

Expected: Output includes a `render` function, CSS injected via JS (or a separate `.css` emission), and an export of the component. If the output contains raw `<template>` strings or errors about unknown `.vue` extension, tsup failed — proceed to Task 0.4 fallback.

### Task 0.3: Generate `.d.ts` for the spike via vue-tsc

tsup's built-in `dts: true` does not understand `.vue` SFCs. We use `vue-tsc` as a separate emission step. If Vue becomes the chosen path, `inspector-vue` will follow the same pattern.

**Files:**

- Modify: `packages/vue-spike/package.json`

- [ ] **Step 1: Update `scripts.build` to chain tsup + vue-tsc**

Edit `packages/vue-spike/package.json`, replace the `"build"` script:

```json
"build": "tsup && vue-tsc --emitDeclarationOnly --declaration --outDir dist"
```

- [ ] **Step 2: Re-run the build**

```bash
pnpm -F @tw199501/vue-spike build
```

Expected: `dist/index.d.ts` exists and declares `Hello` as a Vue component.

- [ ] **Step 3: Inspect the generated types**

```bash
cat packages/vue-spike/dist/index.d.ts
```

Expected: Output declares `Hello` with its props (`{ name: string }`). If the file is empty or says "no output", vue-tsc didn't find SFCs — check `tsconfig.json` `include` and re-emit.

### Task 0.4: Smoke-test the spike from a consumer

We prove the built artifact actually imports in a downstream context. Use a one-file Node script, because a full Vite app is overkill for this spike.

**Files:**

- Create: `packages/vue-spike/smoke.mjs` (temporary)

- [ ] **Step 1: Create a smoke script that imports the built artifact**

Create `packages/vue-spike/smoke.mjs`:

```js
import { Hello } from './dist/index.mjs';

// Vue components are objects with `render` or `setup` + template-derived internals.
// We're not rendering — just asserting the import resolves and has the expected shape.
if (typeof Hello !== 'object' || Hello === null) {
  console.error('FAIL: Hello is not an object');
  process.exit(1);
}
if (typeof Hello.setup !== 'function' && typeof Hello.render !== 'function') {
  console.error('FAIL: Hello has no setup/render — SFC compilation did not produce a valid component');
  process.exit(1);
}
console.log('OK: spike imports and produces a valid Vue component object');
```

- [ ] **Step 2: Run the smoke script**

```bash
node packages/vue-spike/smoke.mjs
```

Expected: Output is `OK: spike imports and produces a valid Vue component object`. If FAIL, either the SFC compilation is broken or `external: ['vue']` stripped something we need — investigate before proceeding.

- [ ] **Step 3: Decision gate — record the outcome**

Create (or update) `docs/superpower/plan/2026-04-20-v007-phase-0-outcome.md` with ONE of:

- **Outcome A: tsup + esbuild-plugin-vue3 + vue-tsc works.** `inspector-vue` will use this exact pipeline. Part 2 uses tsup.
- **Outcome B: tsup cannot emit usable SFC output.** `inspector-vue` will use Vite library mode (`vite build` with `lib` config + `@vitejs/plugin-vue`). Part 2 pipeline changes — flag it in the commit.

Example content (for outcome A):

```markdown
# Phase 0 outcome: tsup + esbuild-plugin-vue3 works

Spike built `Hello.vue` -> `dist/index.mjs` + `dist/index.d.ts`. Consumer import resolves.

Decision: inspector-vue uses tsup pipeline (same as inspector-core, with added vue-tsc for d.ts).
```

### Task 0.5: Delete the spike

**Files:**

- Delete: `packages/vue-spike/` (entire directory)

- [ ] **Step 1: Remove the spike directory**

```bash
rm -rf packages/vue-spike
```

- [ ] **Step 2: Clean node_modules reference**

```bash
pnpm install
```

Expected: pnpm removes the vue-spike symlink from workspace.

- [ ] **Step 3: Commit the deletion**

```bash
git add -A
git commit -m "spike: remove vue-spike after outcome recorded"
```

---

## Phase 1: Release infrastructure (changesets + dependency-cruiser)

Installing changesets and dependency-cruiser BEFORE writing inspector-core means every commit from here on is enforced against the boundary rules and can be tracked toward the 0.0.7 release.

### Task 1.1: Install changesets

**Files:**

- Create: `.changeset/config.json`
- Create: `.changeset/README.md`
- Modify: `package.json` (root — add scripts + devDependency)

- [ ] **Step 1: Install @changesets/cli as a dev dependency at root**

```bash
pnpm add -Dw @changesets/cli
```

Expected: `@changesets/cli` added to root `package.json` `devDependencies`; pnpm-lock.yaml updated.

- [ ] **Step 2: Initialize changesets**

```bash
pnpm changeset init
```

Expected: Creates `.changeset/config.json` and `.changeset/README.md`.

- [ ] **Step 3: Edit `.changeset/config.json` for workspace coordination**

Open `.changeset/config.json` and ensure these fields (overwrite `changelog` and `access` as needed):

```json
{
  "$schema": "https://unpkg.com/@changesets/config@3.0.0/schema.json",
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "fixed": [["@tw199501/specsnap-core", "@tw199501/specsnap-inspector-core", "@tw199501/specsnap-inspector-vue", "@tw199501/specsnap-inspector-react"]],
  "linked": [],
  "access": "public",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": ["specsnap-playground"]
}
```

The `fixed` array forces all four published packages to bump in lockstep (per D6). The `ignore` entry excludes the playground.

- [ ] **Step 4: Add root scripts for the release flow**

Edit root `package.json`, add these inside `"scripts"` (merge with existing):

```json
{
  "scripts": {
    "changeset": "changeset",
    "version-packages": "changeset version",
    "release": "pnpm -r build && changeset publish"
  }
}
```

- [ ] **Step 5: Verify changesets CLI is callable**

```bash
pnpm changeset --version
```

Expected: Prints the installed version (e.g. `2.x.x`).

- [ ] **Step 6: Commit the changesets setup**

```bash
git add .changeset package.json pnpm-lock.yaml
git commit -m "chore: add changesets for coordinated 0.0.7 release"
```

### Task 1.2: Install and configure dependency-cruiser

**Files:**

- Create: `.dependency-cruiser.cjs`
- Modify: `package.json` (root — add script + devDependency)

- [ ] **Step 1: Install dependency-cruiser**

```bash
pnpm add -Dw dependency-cruiser
```

Expected: `dependency-cruiser` added to root devDependencies.

- [ ] **Step 2: Create `.dependency-cruiser.cjs`**

Create `.dependency-cruiser.cjs` at the repo root with this content:

```js
/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'inspector-core-no-framework',
      comment: 'inspector-core must remain framework-agnostic - it MUST NOT import vue, react, or react-dom.',
      severity: 'error',
      from: { path: '^packages/inspector-core/src' },
      to: { path: '^(vue|react|react-dom)($|/)' }
    },
    {
      name: 'inspector-core-no-css',
      comment: 'inspector-core must not emit CSS - styling belongs to wrappers.',
      severity: 'error',
      from: { path: '^packages/inspector-core/src' },
      to: { path: '\\.css$' }
    },
    {
      name: 'specsnap-core-no-inspector',
      comment: 'specsnap-core must not depend on inspector-* packages (dependency direction is one-way).',
      severity: 'error',
      from: { path: '^packages/core/src' },
      to: { path: '^packages/inspector-' }
    },
    {
      name: 'no-circular',
      comment: 'Circular dependencies make the code harder to reason about.',
      severity: 'error',
      from: {},
      to: { circular: true }
    }
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsConfig: { fileName: 'tsconfig.base.json' },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default']
    }
  }
};
```

- [ ] **Step 3: Add a root script for depcruise**

Edit root `package.json`, add to `"scripts"`:

```json
{
  "scripts": {
    "depcruise": "depcruise --config .dependency-cruiser.cjs packages"
  }
}
```

- [ ] **Step 4: Run depcruise against the current tree to establish a baseline**

```bash
pnpm depcruise
```

Expected: No violations (inspector-core doesn't exist yet, and specsnap-core has no forbidden imports). If there are violations in existing code, they are pre-existing bugs — fix them or exclude specifically.

- [ ] **Step 5: Wire depcruise into `pnpm check`**

Edit root `package.json`, change the `check` script:

```json
{
  "scripts": {
    "check": "node scripts/check-line-endings.mjs && pnpm depcruise && pnpm -r exec tsc --noEmit"
  }
}
```

- [ ] **Step 6: Verify `pnpm check` still passes**

```bash
pnpm check
```

Expected: All three checks pass (line endings, depcruise, tsc).

- [ ] **Step 7: Commit the dependency-cruiser setup**

```bash
git add .dependency-cruiser.cjs package.json pnpm-lock.yaml
git commit -m "chore: add dependency-cruiser with inspector-core boundary rules"
```

---

## Phase 2: inspector-core package

This is the foundation of the entire release. Every task is TDD: write the failing test, verify it fails, implement the minimum, verify it passes, commit.

### Task 2.1: Scaffold the inspector-core package

**Files:**

- Create: `packages/inspector-core/package.json`
- Create: `packages/inspector-core/tsconfig.json`
- Create: `packages/inspector-core/tsup.config.ts`
- Create: `packages/inspector-core/vitest.config.ts`
- Create: `packages/inspector-core/src/index.ts` (empty for now — barrel added later)

- [ ] **Step 1: Create `packages/inspector-core/package.json`**

```json
{
  "name": "@tw199501/specsnap-inspector-core",
  "version": "0.0.7",
  "description": "Framework-agnostic logic powering SpecSnap Inspector UIs",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs"
    }
  },
  "files": ["dist", "README.md"],
  "sideEffects": false,
  "scripts": {
    "build": "tsup",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "check": "tsc --noEmit",
    "dev": "tsup --watch"
  },
  "peerDependencies": {
    "@tw199501/specsnap-core": "workspace:^"
  },
  "dependencies": {},
  "devDependencies": {
    "@types/node": "^22.10.0",
    "@vitest/coverage-v8": "^4.1.4",
    "fflate": "^0.8.2",
    "happy-dom": "^20.9.0",
    "tsup": "^8.5.1",
    "typescript": "^6.0.3",
    "vitest": "^4.1.4"
  },
  "publishConfig": {
    "access": "public"
  },
  "author": "tw199501",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/tw199501/specsnap.git",
    "directory": "packages/inspector-core"
  },
  "keywords": ["specsnap", "inspector", "ui", "dom", "capture", "devtools"]
}
```

Note `fflate` is in `devDependencies`, not `dependencies`, because it's dynamically imported only in the ZIP fallback branch — consumers who never trigger that code path should not pay for it at install time. The `tsup.config.ts` below declares it `external` so it resolves from the consumer's tree at runtime.

- [ ] **Step 2: Create `packages/inspector-core/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "types": ["node"]
  },
  "include": ["src/**/*.ts"],
  "exclude": ["**/*.test.ts", "dist"]
}
```

- [ ] **Step 3: Create `packages/inspector-core/tsup.config.ts`**

```ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  outExtension({ format }) {
    return { js: format === 'esm' ? '.mjs' : '.cjs' };
  },
  external: ['fflate', '@tw199501/specsnap-core']
});
```

The `outExtension` override matches the pattern in `packages/core/tsup.config.ts` (and is load-bearing per CLAUDE.md).

- [ ] **Step 4: Create `packages/inspector-core/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/types.ts']
    }
  }
});
```

- [ ] **Step 5: Create empty `packages/inspector-core/src/index.ts`**

```ts
// Public barrel - filled in by subsequent tasks.
export {};
```

- [ ] **Step 6: Install the new deps**

```bash
pnpm install
```

Expected: `packages/inspector-core/node_modules` is linked; `fflate`, `happy-dom`, etc. are available.

- [ ] **Step 7: Smoke-test the scaffold**

```bash
pnpm -F @tw199501/specsnap-inspector-core build && pnpm -F @tw199501/specsnap-inspector-core test && pnpm -F @tw199501/specsnap-inspector-core check
```

Expected: Build succeeds producing `dist/index.mjs` + `dist/index.cjs` + `dist/index.d.ts` (for an empty module). Tests pass (zero tests run). tsc passes.

- [ ] **Step 8: Commit the scaffold**

```bash
git add packages/inspector-core pnpm-lock.yaml
git commit -m "feat(inspector-core): scaffold @tw199501/specsnap-inspector-core package"
```

### Task 2.2: Define public types

**Files:**

- Create: `packages/inspector-core/src/types.ts`
- Create: `packages/inspector-core/src/types.test.ts` (type-only compilation check)

- [ ] **Step 1: Write the failing test**

Create `packages/inspector-core/src/types.test.ts`:

```ts
import { describe, it, expectTypeOf } from 'vitest';
import type {
  InspectorOptions,
  InspectorSnapshot,
  InspectorHandle,
  StorageStrategy,
  SaveResult,
  Listener
} from './types.js';
import type { Session, SpecSnapBundle } from '@tw199501/specsnap-core';

describe('inspector-core public types', () => {
  it('InspectorOptions has required shape', () => {
    expectTypeOf<InspectorOptions>().toHaveProperty('scope');
    expectTypeOf<InspectorOptions>().toHaveProperty('position');
    expectTypeOf<InspectorOptions>().toHaveProperty('initialSequence');
    expectTypeOf<InspectorOptions>().toHaveProperty('sequenceStorageKey');
  });

  it('InspectorSnapshot carries frames + sequence + visibility', () => {
    expectTypeOf<InspectorSnapshot>().toHaveProperty('frames');
    expectTypeOf<InspectorSnapshot>().toHaveProperty('session');
    expectTypeOf<InspectorSnapshot>().toHaveProperty('nextCaptureId');
    expectTypeOf<InspectorSnapshot>().toHaveProperty('visible');
    expectTypeOf<InspectorSnapshot>().toHaveProperty('picking');
  });

  it('InspectorHandle exposes imperative methods', () => {
    expectTypeOf<InspectorHandle['open']>().toEqualTypeOf<() => void>();
    expectTypeOf<InspectorHandle['close']>().toEqualTypeOf<() => void>();
    expectTypeOf<InspectorHandle['toggle']>().toEqualTypeOf<() => void>();
    expectTypeOf<InspectorHandle['startPicker']>().toEqualTypeOf<() => void>();
    expectTypeOf<InspectorHandle['stopPicker']>().toEqualTypeOf<() => void>();
    expectTypeOf<InspectorHandle['clearFrames']>().toEqualTypeOf<() => void>();
    expectTypeOf<InspectorHandle['getSnapshot']>().toEqualTypeOf<() => InspectorSnapshot>();
  });

  it('StorageStrategy is the discriminated union', () => {
    expectTypeOf<StorageStrategy>().toEqualTypeOf<'fs-access' | 'zip' | 'individual' | 'callback'>();
  });

  it('SaveResult records the strategy that ran', () => {
    expectTypeOf<SaveResult>().toHaveProperty('strategy');
    expectTypeOf<SaveResult>().toHaveProperty('fileCount');
    expectTypeOf<SaveResult>().toHaveProperty('error');
  });

  it('Listener is a no-arg void function', () => {
    expectTypeOf<Listener>().toEqualTypeOf<() => void>();
  });

  it('SpecSnapBundle is re-exported from specsnap-core', () => {
    expectTypeOf<SpecSnapBundle>().toHaveProperty('dirName');
    expectTypeOf<SpecSnapBundle>().toHaveProperty('images');
  });

  it('Session is still available (transitive re-export)', () => {
    expectTypeOf<Session>().toHaveProperty('schemaVersion');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm -F @tw199501/specsnap-inspector-core test
```

Expected: FAIL — imports from `./types.js` unresolved (file does not exist yet).

- [ ] **Step 3: Create `packages/inspector-core/src/types.ts`**

```ts
import type { Session, SpecSnapBundle } from '@tw199501/specsnap-core';

export type PanelPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export type ScopeInput = HTMLElement | (() => HTMLElement) | null;

export interface InspectorOptions {
  /** Region the picker is allowed to select inside. `null` = whole document.body. */
  scope?: ScopeInput;
  /** Corner anchor for the trigger and opened panel. */
  position?: PanelPosition;
  /** Whether to render the built-in floating trigger button. */
  trigger?: boolean;
  /** Override the daily sequence counter starting value (otherwise read from localStorage). */
  initialSequence?: number;
  /** localStorage key used for sequence persistence. */
  sequenceStorageKey?: string;
  /** Header text shown in the opened panel. */
  panelTitle?: string;
  /**
   * If provided, ALL built-in storage is skipped and this callback receives the bundle.
   * Resolving the promise signals success; rejecting it is reflected in the status line.
   */
  onSave?: (bundle: SpecSnapBundle) => void | Promise<void>;
  /** Optional observers. Fired in addition to any onSave. */
  onCopy?: (markdown: string) => void;
  onCapture?: (payload: { frameIndex: number; session: Session }) => void;
  onClear?: () => void;
  onOpen?: () => void;
  onClose?: () => void;
}

export interface InspectorSnapshot {
  /** The element references the user has picked, in capture order (1-based indexing matches Frame.index). */
  frames: readonly HTMLElement[];
  /** The serialized Session, or null if no frames captured yet. */
  session: Session | null;
  /** Preview of the next capture id that will be assigned ("20260420-05"). */
  nextCaptureId: string;
  /** Whether the panel is open. */
  visible: boolean;
  /** Whether the picker is actively listening. */
  picking: boolean;
  /** Last save attempt outcome, or null if the user hasn't saved in this session. */
  lastSave: SaveResult | null;
}

export interface InspectorHandle {
  open: () => void;
  close: () => void;
  toggle: () => void;
  startPicker: () => void;
  stopPicker: () => void;
  clearFrames: () => void;
  copyMarkdown: () => Promise<void>;
  saveBundle: () => Promise<SaveResult>;
  getSnapshot: () => InspectorSnapshot;
  subscribe: (listener: Listener) => () => void;
  destroy: () => void;
}

export type StorageStrategy = 'fs-access' | 'zip' | 'individual' | 'callback';

export interface SaveResult {
  strategy: StorageStrategy;
  fileCount: number;
  /** Human-readable location ("/specsnap/20260420", "downloads/20260420-01.zip", null if errored). */
  location: string | null;
  /** If present, the save failed and the string explains why. */
  error: string | null;
}

export type Listener = () => void;

/** Re-export commonly used types so wrappers don't have to import from two packages. */
export type { Session, SpecSnapBundle };
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm -F @tw199501/specsnap-inspector-core test
```

Expected: PASS — 8 assertions green.

- [ ] **Step 5: Commit**

```bash
git add packages/inspector-core/src/types.ts packages/inspector-core/src/types.test.ts
git commit -m "feat(inspector-core): define public types (InspectorOptions, Snapshot, Handle)"
```

### Task 2.3: Sequence counter (TDD)

The `nextDailySequence` + `commitDailySequence` logic is a pure function over localStorage. Small and easy to test — good starting point for TDD rhythm.

**Files:**

- Create: `packages/inspector-core/src/sequence.ts`
- Create: `packages/inspector-core/src/sequence.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `packages/inspector-core/src/sequence.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import {
  formatDateYYYYMMDD,
  getNextCaptureId,
  commitSequence,
  resetSequenceForTests
} from './sequence.js';

const KEY = 'specsnap:sequence:test';

function mockLocalStorage(): Storage {
  let store: Record<string, string> = {};
  return {
    getItem: (k) => (k in store ? store[k]! : null),
    setItem: (k, v) => { store[k] = v; },
    removeItem: (k) => { delete store[k]; },
    clear: () => { store = {}; },
    key: (i) => Object.keys(store)[i] ?? null,
    get length() { return Object.keys(store).length; }
  };
}

describe('sequence counter', () => {
  beforeEach(() => {
    resetSequenceForTests();
  });

  it('formats date as YYYYMMDD', () => {
    expect(formatDateYYYYMMDD(new Date('2026-04-20T10:30:00'))).toBe('20260420');
    expect(formatDateYYYYMMDD(new Date('2026-01-05T23:59:00'))).toBe('20260105');
  });

  it('first call of the day returns sequence 1', () => {
    const storage = mockLocalStorage();
    const result = getNextCaptureId({
      date: new Date('2026-04-20T10:00:00'),
      storage,
      key: KEY
    });
    expect(result.sequence).toBe(1);
    expect(result.captureId).toBe('20260420-01');
  });

  it('reading alone does not increment - only commit does', () => {
    const storage = mockLocalStorage();
    const opts = { date: new Date('2026-04-20T10:00:00'), storage, key: KEY };
    const a = getNextCaptureId(opts);
    const b = getNextCaptureId(opts);
    expect(a.sequence).toBe(1);
    expect(b.sequence).toBe(1); // still 1 because we never committed
  });

  it('commit advances the counter for the same day', () => {
    const storage = mockLocalStorage();
    const opts = { date: new Date('2026-04-20T10:00:00'), storage, key: KEY };
    expect(getNextCaptureId(opts).sequence).toBe(1);
    commitSequence({ sequence: 1, ...opts });
    expect(getNextCaptureId(opts).sequence).toBe(2);
    commitSequence({ sequence: 2, ...opts });
    expect(getNextCaptureId(opts).sequence).toBe(3);
  });

  it('new day resets the counter', () => {
    const storage = mockLocalStorage();
    commitSequence({ sequence: 5, date: new Date('2026-04-20T23:59:00'), storage, key: KEY });
    const next = getNextCaptureId({ date: new Date('2026-04-21T00:01:00'), storage, key: KEY });
    expect(next.sequence).toBe(1);
    expect(next.captureId).toBe('20260421-01');
  });

  it('sequence above 99 does not crash', () => {
    const storage = mockLocalStorage();
    commitSequence({ sequence: 99, date: new Date('2026-04-20'), storage, key: KEY });
    const next = getNextCaptureId({ date: new Date('2026-04-20'), storage, key: KEY });
    expect(next.sequence).toBe(100);
    expect(next.captureId).toBe('20260420-100');
  });

  it('handles missing localStorage gracefully (SSR)', () => {
    const result = getNextCaptureId({
      date: new Date('2026-04-20'),
      storage: null,
      key: KEY
    });
    expect(result.sequence).toBe(1);
    expect(result.captureId).toBe('20260420-01');
  });

  it('corrupt localStorage value falls back to 1', () => {
    const storage = mockLocalStorage();
    storage.setItem(KEY, 'not-json-at-all');
    const result = getNextCaptureId({
      date: new Date('2026-04-20'),
      storage,
      key: KEY
    });
    expect(result.sequence).toBe(1);
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
pnpm -F @tw199501/specsnap-inspector-core test sequence.test.ts
```

Expected: FAIL — `./sequence.js` does not resolve.

- [ ] **Step 3: Implement `packages/inspector-core/src/sequence.ts`**

```ts
export interface SequenceOptions {
  date: Date;
  storage: Storage | null;
  key: string;
}

export interface CommitOptions extends SequenceOptions {
  sequence: number;
}

export interface NextCaptureId {
  sequence: number;
  captureId: string;
  today: string;
}

interface StoredEntry {
  day: string;
  lastCommitted: number;
}

/** Format a date as YYYYMMDD using local time. */
export function formatDateYYYYMMDD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

/** Format a (day, sequence) pair as `${day}-${NN}` with 2-digit zero-padding up to 99, unpadded thereafter. */
function formatCaptureId(day: string, sequence: number): string {
  const nn = sequence < 100 ? String(sequence).padStart(2, '0') : String(sequence);
  return `${day}-${nn}`;
}

function readEntry(storage: Storage | null, key: string): StoredEntry | null {
  if (!storage) return null;
  const raw = storage.getItem(key);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (
      typeof parsed === 'object'
      && parsed !== null
      && 'day' in parsed
      && 'lastCommitted' in parsed
      && typeof (parsed as StoredEntry).day === 'string'
      && typeof (parsed as StoredEntry).lastCommitted === 'number'
    ) {
      return parsed as StoredEntry;
    }
    return null;
  }
  catch {
    return null;
  }
}

function writeEntry(storage: Storage | null, key: string, entry: StoredEntry): void {
  if (!storage) return;
  storage.setItem(key, JSON.stringify(entry));
}

/**
 * Read-only preview of the next capture id for `date`. Does NOT increment.
 * Safe to call repeatedly from render paths (e.g. to display `next: 20260420-05` in UI).
 */
export function getNextCaptureId(opts: SequenceOptions): NextCaptureId {
  const today = formatDateYYYYMMDD(opts.date);
  const entry = readEntry(opts.storage, opts.key);
  const lastCommittedToday = entry && entry.day === today ? entry.lastCommitted : 0;
  const sequence = lastCommittedToday + 1;
  return { sequence, captureId: formatCaptureId(today, sequence), today };
}

/**
 * Record that `sequence` has been used on `date` so that the next call to
 * getNextCaptureId returns `sequence + 1` (same day) or `1` (next day).
 */
export function commitSequence(opts: CommitOptions): void {
  const today = formatDateYYYYMMDD(opts.date);
  writeEntry(opts.storage, opts.key, { day: today, lastCommitted: opts.sequence });
}

/**
 * TEST-ONLY helper. Currently a no-op because this module is stateless; kept so
 * future tests have a stable hook if caching is introduced later.
 */
export function resetSequenceForTests(): void {
  // intentionally empty
}
```

- [ ] **Step 4: Run to verify passing**

```bash
pnpm -F @tw199501/specsnap-inspector-core test sequence.test.ts
```

Expected: PASS — all 8 tests green.

- [ ] **Step 5: Commit**

```bash
git add packages/inspector-core/src/sequence.ts packages/inspector-core/src/sequence.test.ts
git commit -m "feat(inspector-core): add daily sequence counter with localStorage"
```

### Task 2.4: Pub-sub store

**Files:**

- Create: `packages/inspector-core/src/store.ts`
- Create: `packages/inspector-core/src/store.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `packages/inspector-core/src/store.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { createStore } from './store.js';

describe('createStore', () => {
  it('starts with empty default state', () => {
    const store = createStore({ nextCaptureId: '20260420-01' });
    const snapshot = store.getSnapshot();
    expect(snapshot.frames).toEqual([]);
    expect(snapshot.session).toBeNull();
    expect(snapshot.visible).toBe(false);
    expect(snapshot.picking).toBe(false);
    expect(snapshot.nextCaptureId).toBe('20260420-01');
    expect(snapshot.lastSave).toBeNull();
  });

  it('setState produces a new snapshot object (referential inequality)', () => {
    const store = createStore({ nextCaptureId: '20260420-01' });
    const before = store.getSnapshot();
    store.setState({ visible: true });
    const after = store.getSnapshot();
    expect(after).not.toBe(before);
    expect(after.visible).toBe(true);
    expect(before.visible).toBe(false);
  });

  it('setState notifies all subscribers exactly once per change', () => {
    const store = createStore({ nextCaptureId: '20260420-01' });
    const listener = vi.fn();
    store.subscribe(listener);
    store.setState({ visible: true });
    expect(listener).toHaveBeenCalledTimes(1);
    store.setState({ picking: true });
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('setState with identical values does not notify', () => {
    const store = createStore({ nextCaptureId: '20260420-01' });
    const listener = vi.fn();
    store.subscribe(listener);
    store.setState({ visible: false }); // already false
    expect(listener).not.toHaveBeenCalled();
  });

  it('unsubscribe removes the listener', () => {
    const store = createStore({ nextCaptureId: '20260420-01' });
    const listener = vi.fn();
    const unsub = store.subscribe(listener);
    store.setState({ visible: true });
    expect(listener).toHaveBeenCalledTimes(1);
    unsub();
    store.setState({ visible: false });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('appendFrame adds an element + emits', () => {
    const store = createStore({ nextCaptureId: '20260420-01' });
    const el = document.createElement('div');
    store.appendFrame(el);
    expect(store.getSnapshot().frames).toEqual([el]);
  });

  it('clearFrames empties the frame list', () => {
    const store = createStore({ nextCaptureId: '20260420-01' });
    store.appendFrame(document.createElement('div'));
    store.appendFrame(document.createElement('span'));
    expect(store.getSnapshot().frames).toHaveLength(2);
    store.clearFrames();
    expect(store.getSnapshot().frames).toEqual([]);
    expect(store.getSnapshot().session).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
pnpm -F @tw199501/specsnap-inspector-core test store.test.ts
```

Expected: FAIL — `./store.js` unresolved.

- [ ] **Step 3: Implement `packages/inspector-core/src/store.ts`**

```ts
import type { InspectorSnapshot, Listener, SaveResult } from './types.js';

export interface StoreState {
  frames: HTMLElement[];
  session: InspectorSnapshot['session'];
  visible: boolean;
  picking: boolean;
  nextCaptureId: string;
  lastSave: SaveResult | null;
}

export interface Store {
  getSnapshot: () => InspectorSnapshot;
  setState: (partial: Partial<StoreState>) => void;
  subscribe: (listener: Listener) => () => void;
  appendFrame: (el: HTMLElement) => void;
  clearFrames: () => void;
}

export interface CreateStoreOptions {
  nextCaptureId: string;
}

/**
 * Minimal pub-sub store. Framework-agnostic; consumers (wrappers) bind to it
 * via `useSyncExternalStore` (React) or `ref + onMounted(subscribe)` (Vue).
 *
 * Implementation notes:
 * - setState does reference-equality comparison per field; if nothing changed,
 *   listeners are not notified. This matters for useSyncExternalStore.
 * - getSnapshot returns a NEW object whenever state has changed, but keeps
 *   the same object identity between changes (so React's bail-out works).
 */
export function createStore(opts: CreateStoreOptions): Store {
  let state: StoreState = {
    frames: [],
    session: null,
    visible: false,
    picking: false,
    nextCaptureId: opts.nextCaptureId,
    lastSave: null
  };
  let cachedSnapshot: InspectorSnapshot | null = null;
  const listeners = new Set<Listener>();

  function snapshot(): InspectorSnapshot {
    if (cachedSnapshot) return cachedSnapshot;
    cachedSnapshot = {
      frames: state.frames,
      session: state.session,
      visible: state.visible,
      picking: state.picking,
      nextCaptureId: state.nextCaptureId,
      lastSave: state.lastSave
    };
    return cachedSnapshot;
  }

  function invalidateAndEmit(): void {
    cachedSnapshot = null;
    for (const l of listeners) l();
  }

  function setState(partial: Partial<StoreState>): void {
    let changed = false;
    const next: StoreState = { ...state };
    for (const k of Object.keys(partial) as (keyof StoreState)[]) {
      const nextVal = partial[k];
      if (nextVal === undefined) continue;
      if (next[k] !== nextVal) {
        (next as Record<string, unknown>)[k] = nextVal;
        changed = true;
      }
    }
    if (!changed) return;
    state = next;
    invalidateAndEmit();
  }

  return {
    getSnapshot: snapshot,
    setState,
    subscribe(listener) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    appendFrame(el) {
      state = { ...state, frames: [...state.frames, el] };
      invalidateAndEmit();
    },
    clearFrames() {
      if (state.frames.length === 0 && state.session === null) return;
      state = { ...state, frames: [], session: null };
      invalidateAndEmit();
    }
  };
}
```

- [ ] **Step 4: Run to verify passing**

```bash
pnpm -F @tw199501/specsnap-inspector-core test store.test.ts
```

Expected: PASS — 7 tests green.

- [ ] **Step 5: Commit**

```bash
git add packages/inspector-core/src/store.ts packages/inspector-core/src/store.test.ts
git commit -m "feat(inspector-core): add pub-sub store for frames + panel state"
```

### Task 2.5: Element picker

This is the most delicate module. It owns `document.addEventListener('mousemove', 'click', 'keydown')`, the hover outline visual, and the scope containment check.

**Files:**

- Create: `packages/inspector-core/src/picker.ts`
- Create: `packages/inspector-core/src/picker.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `packages/inspector-core/src/picker.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createPicker } from './picker.js';

function resetDom(): void {
  document.body.replaceChildren();
}

describe('createPicker', () => {
  beforeEach(() => {
    resetDom();
  });

  afterEach(() => {
    resetDom();
  });

  it('does not attach listeners before start()', () => {
    const spy = vi.spyOn(document, 'addEventListener');
    createPicker({ onPick: vi.fn() });
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('start() attaches mousemove + click + keydown listeners', () => {
    const spy = vi.spyOn(document, 'addEventListener');
    const picker = createPicker({ onPick: vi.fn() });
    picker.start();
    const events = spy.mock.calls.map(([evt]) => evt);
    expect(events).toContain('mousemove');
    expect(events).toContain('click');
    expect(events).toContain('keydown');
    picker.stop();
    spy.mockRestore();
  });

  it('stop() removes all attached listeners', () => {
    const addSpy = vi.spyOn(document, 'addEventListener');
    const removeSpy = vi.spyOn(document, 'removeEventListener');
    const picker = createPicker({ onPick: vi.fn() });
    picker.start();
    const addedCount = addSpy.mock.calls.length;
    picker.stop();
    expect(removeSpy.mock.calls.length).toBe(addedCount);
    addSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it('clicking inside scope fires onPick with the clicked element', () => {
    const root = document.createElement('div');
    root.id = 'root';
    const child = document.createElement('span');
    root.appendChild(child);
    document.body.appendChild(root);

    const onPick = vi.fn();
    const picker = createPicker({ onPick, scope: () => root });
    picker.start();

    child.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(onPick).toHaveBeenCalledWith(child);
    picker.stop();
  });

  it('clicking outside scope does NOT fire onPick', () => {
    const root = document.createElement('div');
    const outside = document.createElement('span');
    document.body.appendChild(root);
    document.body.appendChild(outside);

    const onPick = vi.fn();
    const picker = createPicker({ onPick, scope: () => root });
    picker.start();

    outside.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(onPick).not.toHaveBeenCalled();
    picker.stop();
  });

  it('clicking elements in the exclude list does NOT fire onPick', () => {
    const panel = document.createElement('div');
    panel.className = 'specsnap-inspector-panel';
    const btn = document.createElement('button');
    panel.appendChild(btn);
    document.body.appendChild(panel);

    const onPick = vi.fn();
    const picker = createPicker({ onPick, excludeSelectors: ['.specsnap-inspector-panel'] });
    picker.start();

    btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(onPick).not.toHaveBeenCalled();
    picker.stop();
  });

  it('ESC keydown fires onCancel', () => {
    const onCancel = vi.fn();
    const picker = createPicker({ onPick: vi.fn(), onCancel });
    picker.start();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(onCancel).toHaveBeenCalledOnce();
    picker.stop();
  });

  it('click swallows default + propagation so the host page does not react', () => {
    const target = document.createElement('a');
    target.href = '#';
    document.body.appendChild(target);

    const picker = createPicker({ onPick: vi.fn() });
    picker.start();

    const evt = new MouseEvent('click', { bubbles: true, cancelable: true });
    target.dispatchEvent(evt);

    expect(evt.defaultPrevented).toBe(true);
    picker.stop();
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
pnpm -F @tw199501/specsnap-inspector-core test picker.test.ts
```

Expected: FAIL — `./picker.js` unresolved.

- [ ] **Step 3: Implement `packages/inspector-core/src/picker.ts`**

```ts
import type { ScopeInput } from './types.js';

export interface PickerOptions {
  /** Fired with the picked element. Does NOT stop the picker - caller decides. */
  onPick: (el: HTMLElement) => void;
  /** Fired when the user presses ESC. Does NOT stop the picker - caller decides. */
  onCancel?: () => void;
  /** Restrict picks to this region. `null` / undefined = whole document.body. */
  scope?: ScopeInput;
  /** CSS selectors whose elements (and descendants) are ignored even if inside scope. */
  excludeSelectors?: readonly string[];
}

export interface Picker {
  start: () => void;
  stop: () => void;
  isActive: () => boolean;
}

function resolveScope(scope: ScopeInput | undefined): HTMLElement {
  if (!scope) return document.body;
  if (typeof scope === 'function') return scope();
  return scope;
}

function matchesAny(el: Element, selectors: readonly string[]): boolean {
  for (const sel of selectors) {
    if (el.closest(sel)) return true;
  }
  return false;
}

/**
 * Framework-agnostic element picker. Attaches document-level listeners only
 * while active (start -> stop). Respects an optional scope and exclude list.
 *
 * Safety: all event handlers defer scope / exclude resolution to the *current*
 * opts values so callers can change them between start() and stop() — though
 * normally they wouldn't.
 */
export function createPicker(opts: PickerOptions): Picker {
  let active = false;

  function onClick(e: MouseEvent): void {
    if (!active) return;
    if (!(e.target instanceof HTMLElement)) return;

    const exclude = opts.excludeSelectors ?? [];
    if (exclude.length > 0 && matchesAny(e.target, exclude)) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    const scopeEl = resolveScope(opts.scope);
    if (!scopeEl.contains(e.target)) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    opts.onPick(e.target);
  }

  function onKeyDown(e: KeyboardEvent): void {
    if (!active) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      opts.onCancel?.();
    }
  }

  function onMouseMove(e: MouseEvent): void {
    // Reserved for hover outline rendering in wrapper layer.
    // The picker module itself stays visual-free.
    void e;
  }

  return {
    start(): void {
      if (active) return;
      active = true;
      document.addEventListener('mousemove', onMouseMove, true);
      document.addEventListener('click', onClick, true);
      document.addEventListener('keydown', onKeyDown, true);
    },
    stop(): void {
      if (!active) return;
      active = false;
      document.removeEventListener('mousemove', onMouseMove, true);
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('keydown', onKeyDown, true);
    },
    isActive(): boolean {
      return active;
    }
  };
}
```

- [ ] **Step 4: Run to verify passing**

```bash
pnpm -F @tw199501/specsnap-inspector-core test picker.test.ts
```

Expected: PASS — 8 tests green.

- [ ] **Step 5: Commit**

```bash
git add packages/inspector-core/src/picker.ts packages/inspector-core/src/picker.test.ts
git commit -m "feat(inspector-core): add framework-agnostic element picker"
```

### Task 2.6: Clipboard writer

**Files:**

- Create: `packages/inspector-core/src/clipboard.ts`
- Create: `packages/inspector-core/src/clipboard.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `packages/inspector-core/src/clipboard.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { copyTextToClipboard } from './clipboard.js';

describe('copyTextToClipboard', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('uses navigator.clipboard.writeText when available', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText }
    });

    await copyTextToClipboard('hello');

    expect(writeText).toHaveBeenCalledWith('hello');
  });

  it('throws with a specific error when clipboard API is unavailable', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: undefined
    });

    await expect(copyTextToClipboard('hello')).rejects.toThrow(/Clipboard API unavailable/);
  });

  it('re-throws underlying writeText rejection with context', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('permission denied'));
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText }
    });

    await expect(copyTextToClipboard('hello')).rejects.toThrow(/permission denied/);
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
pnpm -F @tw199501/specsnap-inspector-core test clipboard.test.ts
```

Expected: FAIL — `./clipboard.js` unresolved.

- [ ] **Step 3: Implement `packages/inspector-core/src/clipboard.ts`**

```ts
/**
 * Write text to the system clipboard using the async Clipboard API.
 * Throws a descriptive error if the API is unavailable (e.g. non-secure
 * context, older browsers) so callers can surface a UI message instead of
 * silently swallowing the failure.
 */
export async function copyTextToClipboard(text: string): Promise<void> {
  if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
    throw new Error('Clipboard API unavailable (non-secure context or unsupported browser)');
  }
  await navigator.clipboard.writeText(text);
}
```

- [ ] **Step 4: Run to verify passing**

```bash
pnpm -F @tw199501/specsnap-inspector-core test clipboard.test.ts
```

Expected: PASS — 3 tests green.

- [ ] **Step 5: Commit**

```bash
git add packages/inspector-core/src/clipboard.ts packages/inspector-core/src/clipboard.test.ts
git commit -m "feat(inspector-core): add copyTextToClipboard with explicit errors"
```

### Task 2.7: Storage — fs-access branch (port from playground)

The existing `apps/playground/fs-access.ts` is already well-tested. We port it verbatim into `inspector-core` and add a public alias name for use by the ladder.

**Files:**

- Create: `packages/inspector-core/src/storage/fs-access.ts`
- Create: `packages/inspector-core/src/storage/fs-access.test.ts` (ported tests)
- Note: `apps/playground/fs-access.ts` stays in place for Part 1; the playground migration in Part 2 Phase 5 replaces it with a re-export.

- [ ] **Step 1: Create the directory**

```bash
mkdir -p packages/inspector-core/src/storage
```

- [ ] **Step 2: Port `apps/playground/fs-access.ts` to `packages/inspector-core/src/storage/fs-access.ts`**

Copy the file contents verbatim from `apps/playground/fs-access.ts` to `packages/inspector-core/src/storage/fs-access.ts`. No behavioral change. The copy retains the IndexedDB folder-handle cache, `showDirectoryPicker` detection, `writeBundle(bundle, opts)` API, and the injectable `showDirectoryPicker` override for tests.

Then append at the bottom of the new file:

```ts
// Re-export with stable public names for the storage layer:
export { writeBundle as saveBundleToFsAccess };
export type { WriteResult as FsAccessWriteResult };
```

- [ ] **Step 3: Port the tests**

Copy `apps/playground/fs-access.test.ts` verbatim to `packages/inspector-core/src/storage/fs-access.test.ts`. The relative import path `./fs-access.js` works in both locations.

- [ ] **Step 4: Run the ported tests**

```bash
pnpm -F @tw199501/specsnap-inspector-core test fs-access
```

Expected: PASS — same tests as in playground, now running in the new package.

- [ ] **Step 5: Commit**

```bash
git add packages/inspector-core/src/storage
git commit -m "feat(inspector-core): port fs-access storage from playground"
```

### Task 2.8: Storage — ZIP fallback (fflate, dynamic-imported)

**Files:**

- Create: `packages/inspector-core/src/storage/zip-fallback.ts`
- Create: `packages/inspector-core/src/storage/zip-fallback.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `packages/inspector-core/src/storage/zip-fallback.test.ts`:

```ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { saveBundleAsZip } from './zip-fallback.js';
import type { SpecSnapBundle } from '@tw199501/specsnap-core';

function fakeBundle(): SpecSnapBundle {
  return {
    dirName: '20260420',
    captureId: '20260420-01',
    markdown: { filename: '20260420-01.md', content: '# hello' },
    images: [
      { filename: '20260420-01-1.png', blob: new Blob(['png-bytes'], { type: 'image/png' }) },
      { filename: '20260420-01-2.png', blob: new Blob(['png-bytes'], { type: 'image/png' }) }
    ]
  };
}

describe('saveBundleAsZip', () => {
  const origClick = HTMLAnchorElement.prototype.click;

  afterEach(() => {
    HTMLAnchorElement.prototype.click = origClick;
    delete (globalThis as unknown as { __importOverride?: unknown }).__importOverride;
  });

  it('creates a ZIP blob containing all bundle files under the dirName prefix', async () => {
    let capturedAnchor: HTMLAnchorElement | null = null;
    const clickSpy = vi.fn();
    HTMLAnchorElement.prototype.click = function () {
      capturedAnchor = this;
      clickSpy();
    };

    const result = await saveBundleAsZip(fakeBundle());

    expect(clickSpy).toHaveBeenCalledOnce();
    expect(capturedAnchor).not.toBeNull();
    expect(capturedAnchor!.download).toBe('20260420-01.zip');
    expect(result.strategy).toBe('zip');
    expect(result.fileCount).toBe(3); // 1 md + 2 png
    expect(result.location).toMatch(/20260420-01\.zip$/);
    expect(result.error).toBeNull();
  });

  it('returns strategy:"zip" with an error string when fflate import fails', async () => {
    (globalThis as unknown as { __importOverride: () => Promise<never> }).__importOverride =
      () => Promise.reject(new Error('module load failed'));

    const result = await saveBundleAsZip(fakeBundle());
    expect(result.strategy).toBe('zip');
    expect(result.error).toMatch(/module load failed|unavailable/);
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
pnpm -F @tw199501/specsnap-inspector-core test zip-fallback.test.ts
```

Expected: FAIL — file does not exist.

- [ ] **Step 3: Implement `packages/inspector-core/src/storage/zip-fallback.ts`**

```ts
import type { SpecSnapBundle } from '@tw199501/specsnap-core';
import type { SaveResult } from '../types.js';

/**
 * Test hook — if defined on globalThis, used INSTEAD of the real dynamic
 * import. Allows simulating module-load failure without network mocks.
 */
declare global {
  // eslint-disable-next-line no-var
  var __importOverride: (() => Promise<unknown>) | undefined;
}

interface FflateZip {
  zipSync: (input: Record<string, Uint8Array>, opts?: { level?: number }) => Uint8Array;
}

async function loadFflate(): Promise<FflateZip> {
  if (globalThis.__importOverride) {
    return (await globalThis.__importOverride()) as FflateZip;
  }
  return (await import('fflate')) as FflateZip;
}

async function blobToUint8(blob: Blob): Promise<Uint8Array> {
  const ab = await blob.arrayBuffer();
  return new Uint8Array(ab);
}

/**
 * Package the bundle into a single ZIP, trigger an `<a download>` click to save it.
 * Returns a SaveResult describing the outcome. Never throws — errors are reflected
 * in `result.error` so the caller can update the UI status line cleanly.
 */
export async function saveBundleAsZip(bundle: SpecSnapBundle): Promise<SaveResult> {
  try {
    const fflate = await loadFflate();

    const mdBytes = new TextEncoder().encode(bundle.markdown.content);
    const entries: Record<string, Uint8Array> = {};
    entries[`${bundle.dirName}/${bundle.markdown.filename}`] = mdBytes;
    for (const img of bundle.images) {
      entries[`${bundle.dirName}/${img.filename}`] = await blobToUint8(img.blob);
    }

    const zipped = fflate.zipSync(entries, { level: 6 });
    const zipBlob = new Blob([zipped], { type: 'application/zip' });
    const url = URL.createObjectURL(zipBlob);
    const zipName = `${bundle.captureId}.zip`;

    const a = document.createElement('a');
    a.href = url;
    a.download = zipName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return {
      strategy: 'zip',
      fileCount: 1 + bundle.images.length,
      location: zipName,
      error: null
    };
  }
  catch (err) {
    return {
      strategy: 'zip',
      fileCount: 0,
      location: null,
      error: err instanceof Error ? err.message : 'unknown zip-fallback error'
    };
  }
}
```

- [ ] **Step 4: Run to verify passing**

```bash
pnpm -F @tw199501/specsnap-inspector-core test zip-fallback.test.ts
```

Expected: PASS — 2 tests green.

- [ ] **Step 5: Commit**

```bash
git add packages/inspector-core/src/storage/zip-fallback.ts packages/inspector-core/src/storage/zip-fallback.test.ts
git commit -m "feat(inspector-core): add ZIP fallback storage via fflate"
```

### Task 2.9: Storage — individual-download fallback

Simplest fallback: create one `<a download>` per file. Used only when both fs-access and ZIP fail.

**Files:**

- Create: `packages/inspector-core/src/storage/individual-fallback.ts`
- Create: `packages/inspector-core/src/storage/individual-fallback.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { saveBundleAsIndividualFiles } from './individual-fallback.js';
import type { SpecSnapBundle } from '@tw199501/specsnap-core';

function fakeBundle(): SpecSnapBundle {
  return {
    dirName: '20260420',
    captureId: '20260420-01',
    markdown: { filename: '20260420-01.md', content: '# hello' },
    images: [
      { filename: '20260420-01-1.png', blob: new Blob(['x'], { type: 'image/png' }) }
    ]
  };
}

describe('saveBundleAsIndividualFiles', () => {
  const origClick = HTMLAnchorElement.prototype.click;

  afterEach(() => {
    HTMLAnchorElement.prototype.click = origClick;
  });

  it('triggers one download per file in the bundle', async () => {
    const clickSpy = vi.fn();
    HTMLAnchorElement.prototype.click = function () { clickSpy(); };

    const result = await saveBundleAsIndividualFiles(fakeBundle());

    // 1 markdown + 1 image = 2 clicks
    expect(clickSpy).toHaveBeenCalledTimes(2);
    expect(result.strategy).toBe('individual');
    expect(result.fileCount).toBe(2);
    expect(result.error).toBeNull();
  });
});
```

- [ ] **Step 2: Verify it fails**

```bash
pnpm -F @tw199501/specsnap-inspector-core test individual-fallback.test.ts
```

Expected: FAIL — file not found.

- [ ] **Step 3: Implement `packages/inspector-core/src/storage/individual-fallback.ts`**

```ts
import type { SpecSnapBundle } from '@tw199501/specsnap-core';
import type { SaveResult } from '../types.js';

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Last-resort storage — drops each bundle file as an individual download.
 * Some browsers rate-limit rapid `<a download>` clicks; we accept the risk
 * because this path is reached only when both fs-access AND ZIP failed.
 */
export async function saveBundleAsIndividualFiles(bundle: SpecSnapBundle): Promise<SaveResult> {
  try {
    const mdBlob = new Blob([bundle.markdown.content], { type: 'text/markdown' });
    downloadBlob(mdBlob, bundle.markdown.filename);
    for (const img of bundle.images) {
      downloadBlob(img.blob, img.filename);
    }
    return {
      strategy: 'individual',
      fileCount: 1 + bundle.images.length,
      location: 'browser downloads folder',
      error: null
    };
  }
  catch (err) {
    return {
      strategy: 'individual',
      fileCount: 0,
      location: null,
      error: err instanceof Error ? err.message : 'unknown individual-fallback error'
    };
  }
}
```

- [ ] **Step 4: Verify passing**

```bash
pnpm -F @tw199501/specsnap-inspector-core test individual-fallback.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/inspector-core/src/storage/individual-fallback.ts packages/inspector-core/src/storage/individual-fallback.test.ts
git commit -m "feat(inspector-core): add individual-file fallback storage"
```

### Task 2.10: Storage — unified `saveBundleWithLadder`

**Files:**

- Create: `packages/inspector-core/src/storage/save-bundle.ts`
- Create: `packages/inspector-core/src/storage/save-bundle.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect, vi } from 'vitest';
import { saveBundleWithLadder } from './save-bundle.js';
import type { SpecSnapBundle } from '@tw199501/specsnap-core';

function fakeBundle(): SpecSnapBundle {
  return {
    dirName: '20260420',
    captureId: '20260420-01',
    markdown: { filename: '20260420-01.md', content: '# hi' },
    images: []
  };
}

describe('saveBundleWithLadder', () => {
  it('uses onSave callback when provided and skips all built-in storage', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const result = await saveBundleWithLadder(fakeBundle(), {
      onSave,
      strategies: {
        fsAccess: vi.fn(),
        zip: vi.fn(),
        individual: vi.fn()
      }
    });
    expect(onSave).toHaveBeenCalledOnce();
    expect(result.strategy).toBe('callback');
    expect(result.error).toBeNull();
  });

  it('records the error when onSave rejects', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('boom'));
    const result = await saveBundleWithLadder(fakeBundle(), {
      onSave,
      strategies: {
        fsAccess: vi.fn(),
        zip: vi.fn(),
        individual: vi.fn()
      }
    });
    expect(result.strategy).toBe('callback');
    expect(result.error).toBe('boom');
  });

  it('tries fs-access first and stops on success', async () => {
    const fsAccess = vi.fn().mockResolvedValue({ strategy: 'fs-access', fileCount: 1, location: '/x', error: null });
    const zip = vi.fn();
    const individual = vi.fn();
    const result = await saveBundleWithLadder(fakeBundle(), {
      strategies: { fsAccess, zip, individual }
    });
    expect(fsAccess).toHaveBeenCalledOnce();
    expect(zip).not.toHaveBeenCalled();
    expect(individual).not.toHaveBeenCalled();
    expect(result.strategy).toBe('fs-access');
  });

  it('falls back to zip when fs-access is unavailable (returns null)', async () => {
    const fsAccess = vi.fn().mockResolvedValue(null);
    const zip = vi.fn().mockResolvedValue({ strategy: 'zip', fileCount: 1, location: 'a.zip', error: null });
    const individual = vi.fn();
    const result = await saveBundleWithLadder(fakeBundle(), {
      strategies: { fsAccess, zip, individual }
    });
    expect(fsAccess).toHaveBeenCalledOnce();
    expect(zip).toHaveBeenCalledOnce();
    expect(individual).not.toHaveBeenCalled();
    expect(result.strategy).toBe('zip');
  });

  it('falls through to individual when both fs-access and zip fail', async () => {
    const fsAccess = vi.fn().mockResolvedValue(null);
    const zip = vi.fn().mockResolvedValue({ strategy: 'zip', fileCount: 0, location: null, error: 'zip lib missing' });
    const individual = vi.fn().mockResolvedValue({ strategy: 'individual', fileCount: 1, location: 'downloads/', error: null });
    const result = await saveBundleWithLadder(fakeBundle(), {
      strategies: { fsAccess, zip, individual }
    });
    expect(individual).toHaveBeenCalledOnce();
    expect(result.strategy).toBe('individual');
  });
});
```

- [ ] **Step 2: Verify failure**

```bash
pnpm -F @tw199501/specsnap-inspector-core test save-bundle.test.ts
```

Expected: FAIL — file not found.

- [ ] **Step 3: Implement `packages/inspector-core/src/storage/save-bundle.ts`**

```ts
import type { SpecSnapBundle } from '@tw199501/specsnap-core';
import type { SaveResult } from '../types.js';

export interface StorageStrategies {
  /** Resolves to a SaveResult on success, or null when the strategy is unavailable (e.g. non-Chromium browser). */
  fsAccess: (bundle: SpecSnapBundle) => Promise<SaveResult | null>;
  zip: (bundle: SpecSnapBundle) => Promise<SaveResult>;
  individual: (bundle: SpecSnapBundle) => Promise<SaveResult>;
}

export interface SaveBundleOptions {
  onSave?: (bundle: SpecSnapBundle) => void | Promise<void>;
  strategies: StorageStrategies;
}

/**
 * Ladder:
 *   1. If onSave provided -> call it and return strategy:"callback"
 *   2. fsAccess -> if it returns a SaveResult with error === null, use it
 *   3. zip -> if it succeeds (error === null), use it
 *   4. individual -> always runs last
 *
 * Each strategy is responsible for never throwing — errors must be reflected
 * in result.error so the caller can update the status line without try/catch.
 */
export async function saveBundleWithLadder(
  bundle: SpecSnapBundle,
  opts: SaveBundleOptions
): Promise<SaveResult> {
  if (opts.onSave) {
    try {
      await opts.onSave(bundle);
      return {
        strategy: 'callback',
        fileCount: 1 + bundle.images.length,
        location: 'handled by host app',
        error: null
      };
    }
    catch (err) {
      return {
        strategy: 'callback',
        fileCount: 0,
        location: null,
        error: err instanceof Error ? err.message : 'onSave rejected'
      };
    }
  }

  const viaFs = await opts.strategies.fsAccess(bundle);
  if (viaFs && viaFs.error === null) return viaFs;

  const viaZip = await opts.strategies.zip(bundle);
  if (viaZip.error === null) return viaZip;

  return opts.strategies.individual(bundle);
}
```

- [ ] **Step 4: Verify passing**

```bash
pnpm -F @tw199501/specsnap-inspector-core test save-bundle.test.ts
```

Expected: PASS — 5 tests green.

- [ ] **Step 5: Commit**

```bash
git add packages/inspector-core/src/storage/save-bundle.ts packages/inspector-core/src/storage/save-bundle.test.ts
git commit -m "feat(inspector-core): add saveBundleWithLadder for strategy selection"
```

### Task 2.11: `createInspector` factory — wires everything together

This is the core API that wrappers consume. It instantiates the store, picker, sequence counter, and storage, and returns an `InspectorHandle`.

**Files:**

- Create: `packages/inspector-core/src/create-inspector.ts`
- Create: `packages/inspector-core/src/create-inspector.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createInspector } from './create-inspector.js';

function resetDom(): void {
  document.body.replaceChildren();
}

describe('createInspector', () => {
  beforeEach(() => {
    resetDom();
    localStorage.clear();
  });

  it('returns a handle with all documented imperative methods', () => {
    const inspector = createInspector();
    expect(typeof inspector.open).toBe('function');
    expect(typeof inspector.close).toBe('function');
    expect(typeof inspector.toggle).toBe('function');
    expect(typeof inspector.startPicker).toBe('function');
    expect(typeof inspector.stopPicker).toBe('function');
    expect(typeof inspector.clearFrames).toBe('function');
    expect(typeof inspector.copyMarkdown).toBe('function');
    expect(typeof inspector.saveBundle).toBe('function');
    expect(typeof inspector.getSnapshot).toBe('function');
    expect(typeof inspector.subscribe).toBe('function');
    expect(typeof inspector.destroy).toBe('function');
    inspector.destroy();
  });

  it('open/close toggles visible state and notifies subscribers', () => {
    const inspector = createInspector();
    const listener = vi.fn();
    inspector.subscribe(listener);

    expect(inspector.getSnapshot().visible).toBe(false);
    inspector.open();
    expect(inspector.getSnapshot().visible).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);
    inspector.close();
    expect(inspector.getSnapshot().visible).toBe(false);
    expect(listener).toHaveBeenCalledTimes(2);
    inspector.destroy();
  });

  it('startPicker + simulated click appends a frame and fires onCapture', async () => {
    const onCapture = vi.fn();
    const target = document.createElement('section');
    document.body.appendChild(target);

    const inspector = createInspector({ onCapture });
    inspector.startPicker();

    target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

    await Promise.resolve();

    expect(inspector.getSnapshot().frames).toContain(target);
    expect(onCapture).toHaveBeenCalledOnce();
    inspector.destroy();
  });

  it('clearFrames empties frames and notifies', () => {
    const inspector = createInspector();
    const listener = vi.fn();
    inspector.subscribe(listener);

    const el = document.createElement('div');
    document.body.appendChild(el);
    inspector.startPicker();
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    listener.mockClear();

    inspector.clearFrames();
    expect(inspector.getSnapshot().frames).toEqual([]);
    expect(listener).toHaveBeenCalled();
    inspector.destroy();
  });

  it('nextCaptureId in the initial snapshot reflects today', () => {
    const inspector = createInspector();
    const snap = inspector.getSnapshot();
    expect(snap.nextCaptureId).toMatch(/^\d{8}-\d{2}$/);
    inspector.destroy();
  });

  it('destroy() stops the picker and removes all listeners', () => {
    const inspector = createInspector();
    inspector.startPicker();
    const removeSpy = vi.spyOn(document, 'removeEventListener');
    inspector.destroy();
    expect(removeSpy).toHaveBeenCalled();
    removeSpy.mockRestore();
  });

  it('scope restricts the picker', () => {
    const root = document.createElement('div');
    const inside = document.createElement('button');
    const outside = document.createElement('button');
    root.appendChild(inside);
    document.body.appendChild(root);
    document.body.appendChild(outside);

    const inspector = createInspector({ scope: root });
    inspector.startPicker();

    outside.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(inspector.getSnapshot().frames).toEqual([]);

    inside.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(inspector.getSnapshot().frames).toEqual([inside]);

    inspector.destroy();
  });
});
```

- [ ] **Step 2: Verify failure**

```bash
pnpm -F @tw199501/specsnap-inspector-core test create-inspector.test.ts
```

Expected: FAIL — `./create-inspector.js` unresolved.

- [ ] **Step 3: Implement `packages/inspector-core/src/create-inspector.ts`**

```ts
import { captureSession, toMarkdown, toSpecSnapBundle } from '@tw199501/specsnap-core';
import { createStore } from './store.js';
import { createPicker } from './picker.js';
import { getNextCaptureId, commitSequence } from './sequence.js';
import { copyTextToClipboard } from './clipboard.js';
import { saveBundleToFsAccess } from './storage/fs-access.js';
import { saveBundleAsZip } from './storage/zip-fallback.js';
import { saveBundleAsIndividualFiles } from './storage/individual-fallback.js';
import { saveBundleWithLadder } from './storage/save-bundle.js';
import type {
  InspectorOptions,
  InspectorHandle,
  InspectorSnapshot,
  SaveResult
} from './types.js';

const DEFAULT_SEQUENCE_KEY = 'specsnap:sequence';

function getLocalStorageSafely(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  }
  catch {
    return null;
  }
}

/**
 * Factory for the headless Inspector. Wrappers (Vue / React / vanilla mount)
 * create one instance per component mount and destroy it on unmount.
 *
 * This function does NOT render anything — it exposes state and imperative
 * methods. The wrapper layer is responsible for rendering the panel,
 * trigger button, and frame list.
 */
export function createInspector(options: InspectorOptions = {}): InspectorHandle {
  if (typeof window === 'undefined') {
    throw new Error('SpecSnap Inspector requires a browser environment (typeof window === "undefined")');
  }

  const storage = getLocalStorageSafely();
  const sequenceKey = options.sequenceStorageKey ?? DEFAULT_SEQUENCE_KEY;

  function computeNextId(): string {
    const now = new Date();
    const { captureId } = getNextCaptureId({ date: now, storage, key: sequenceKey });
    return captureId;
  }

  const store = createStore({ nextCaptureId: computeNextId() });

  const excludeSelectors = ['.specsnap-inspector-panel', '.specsnap-inspector-trigger'];

  const picker = createPicker({
    scope: options.scope ?? null,
    excludeSelectors,
    onPick(el) {
      store.appendFrame(el);
      const frames = store.getSnapshot().frames;
      const session = captureSession(frames);
      store.setState({ session });
      options.onCapture?.({ frameIndex: frames.length, session });
    },
    onCancel() {
      picker.stop();
      store.setState({ picking: false });
    }
  });

  function open(): void {
    if (store.getSnapshot().visible) return;
    store.setState({ visible: true });
    options.onOpen?.();
  }

  function close(): void {
    if (!store.getSnapshot().visible) return;
    if (picker.isActive()) {
      picker.stop();
      store.setState({ picking: false });
    }
    store.setState({ visible: false });
    options.onClose?.();
  }

  function toggle(): void {
    if (store.getSnapshot().visible) close();
    else open();
  }

  function startPicker(): void {
    if (picker.isActive()) return;
    picker.start();
    store.setState({ picking: true });
  }

  function stopPicker(): void {
    if (!picker.isActive()) return;
    picker.stop();
    store.setState({ picking: false });
  }

  function clearFrames(): void {
    store.clearFrames();
    options.onClear?.();
  }

  async function copyMarkdown(): Promise<void> {
    const session = store.getSnapshot().session;
    if (!session) return;
    const md = toMarkdown(session);
    const joined = md.join('\n\n━━━━━\n\n');
    await copyTextToClipboard(joined);
    options.onCopy?.(joined);
  }

  async function saveBundle(): Promise<SaveResult> {
    const session = store.getSnapshot().session;
    if (!session) {
      const empty: SaveResult = { strategy: 'callback', fileCount: 0, location: null, error: 'No frames to save' };
      store.setState({ lastSave: empty });
      return empty;
    }

    const now = new Date();
    const bundle = await toSpecSnapBundle(session, { date: now });

    const result = await saveBundleWithLadder(bundle, {
      onSave: options.onSave,
      strategies: {
        fsAccess: async (b) => {
          try {
            const r = await saveBundleToFsAccess(b, {});
            if (!r) return null;
            return {
              strategy: 'fs-access',
              fileCount: r.fileCount,
              location: r.where,
              error: null
            };
          }
          catch {
            return null;
          }
        },
        zip: saveBundleAsZip,
        individual: saveBundleAsIndividualFiles
      }
    });

    if (result.error === null) {
      commitSequence({
        sequence: Number(bundle.captureId.slice(-2)),
        date: now,
        storage,
        key: sequenceKey
      });
      store.setState({ nextCaptureId: computeNextId() });
    }
    store.setState({ lastSave: result });
    return result;
  }

  function destroy(): void {
    if (picker.isActive()) picker.stop();
  }

  return {
    open,
    close,
    toggle,
    startPicker,
    stopPicker,
    clearFrames,
    copyMarkdown,
    saveBundle,
    getSnapshot: (): InspectorSnapshot => store.getSnapshot(),
    subscribe: (listener) => store.subscribe(listener),
    destroy
  };
}
```

- [ ] **Step 4: Verify passing**

```bash
pnpm -F @tw199501/specsnap-inspector-core test create-inspector.test.ts
```

Expected: PASS — 7 tests green.

- [ ] **Step 5: Commit**

```bash
git add packages/inspector-core/src/create-inspector.ts packages/inspector-core/src/create-inspector.test.ts
git commit -m "feat(inspector-core): add createInspector factory wiring the full pipeline"
```

### Task 2.12: vanilla `mount()` convenience helper

Per Open Question #5 (resolved "yes") in the spec, ship a one-liner vanilla mount helper. The playground will use it in Part 2 Phase 5.

**Files:**

- Create: `packages/inspector-core/src/mount.ts`
- Create: `packages/inspector-core/src/mount.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect, vi } from 'vitest';
import { mount } from './mount.js';

describe('mount', () => {
  it('returns an InspectorHandle and calls onReady with it', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const onReady = vi.fn();

    const handle = mount(container, { onReady });

    expect(typeof handle.open).toBe('function');
    expect(onReady).toHaveBeenCalledWith(handle);
    handle.destroy();
  });

  it('destroy() leaves the container untouched (renderer is Part 2)', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const handle = mount(container);

    handle.open();
    handle.close();
    handle.destroy();

    // Part 1 mount does not render anything into the container.
    expect(container.children.length).toBe(0);
  });
});
```

- [ ] **Step 2: Verify failure**

```bash
pnpm -F @tw199501/specsnap-inspector-core test mount.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement `packages/inspector-core/src/mount.ts`**

```ts
import { createInspector } from './create-inspector.js';
import type { InspectorOptions, InspectorHandle } from './types.js';

export interface MountOptions extends InspectorOptions {
  /** Called once the inspector is ready; receives the handle so consumers can wire keyboard shortcuts, etc. */
  onReady?: (handle: InspectorHandle) => void;
}

/**
 * Vanilla convenience: attach an Inspector to a container element. Useful for
 * framework-less pages, bookmarklets, and the playground's vanilla demo.
 *
 * In Part 1 this is a thin shim over `createInspector` — it does NOT render
 * the panel or trigger. Those are wrappers' responsibility (Part 2 Phase 5
 * extends this with a minimal vanilla renderer).
 */
export function mount(container: HTMLElement, options: MountOptions = {}): InspectorHandle {
  void container; // container reserved for the vanilla renderer added in Part 2
  const handle = createInspector(options);
  options.onReady?.(handle);
  return handle;
}
```

- [ ] **Step 4: Verify passing**

```bash
pnpm -F @tw199501/specsnap-inspector-core test mount.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/inspector-core/src/mount.ts packages/inspector-core/src/mount.test.ts
git commit -m "feat(inspector-core): add vanilla mount() helper (renderer added in Part 2)"
```

### Task 2.13: Public barrel

**Files:**

- Modify: `packages/inspector-core/src/index.ts`

- [ ] **Step 1: Replace the empty barrel with the complete public surface**

```ts
// Factory + vanilla mount
export { createInspector } from './create-inspector.js';
export { mount, type MountOptions } from './mount.js';

// Types
export type {
  InspectorOptions,
  InspectorSnapshot,
  InspectorHandle,
  PanelPosition,
  ScopeInput,
  StorageStrategy,
  SaveResult,
  Listener,
  Session,
  SpecSnapBundle
} from './types.js';

// Sequence utilities — exported so wrappers can show `next: YYYYMMDD-NN` without duplicating logic
export {
  formatDateYYYYMMDD,
  getNextCaptureId,
  commitSequence
} from './sequence.js';

// Storage building blocks — exported so advanced consumers can compose their own ladders
export { saveBundleWithLadder } from './storage/save-bundle.js';
export type { StorageStrategies, SaveBundleOptions } from './storage/save-bundle.js';
```

- [ ] **Step 2: Run the full package test suite**

```bash
pnpm -F @tw199501/specsnap-inspector-core test
```

Expected: All tests PASS (types, sequence, store, picker, clipboard, fs-access, zip-fallback, individual-fallback, save-bundle, create-inspector, mount).

- [ ] **Step 3: Run tsc + build**

```bash
pnpm -F @tw199501/specsnap-inspector-core check && pnpm -F @tw199501/specsnap-inspector-core build
```

Expected: PASS. `dist/index.mjs` + `.cjs` + `.d.ts` exist and export the full public surface.

- [ ] **Step 4: Verify boundary rule still holds**

```bash
pnpm depcruise
```

Expected: No violations. inspector-core does NOT import vue/react/react-dom.

- [ ] **Step 5: Commit**

```bash
git add packages/inspector-core/src/index.ts
git commit -m "feat(inspector-core): export public barrel"
```

### Task 2.14: End-to-end integration test

Tests multiple modules together to catch wiring bugs the isolated tests missed.

**Files:**

- Create: `packages/inspector-core/src/integration.test.ts`

- [ ] **Step 1: Write the test**

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createInspector } from './create-inspector.js';

function resetDom(): void {
  document.body.replaceChildren();
}

describe('inspector-core integration', () => {
  beforeEach(() => {
    resetDom();
    localStorage.clear();
  });

  it('full flow: open -> pick two elements -> copyMarkdown -> clear', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText }
    });

    const onCapture = vi.fn();
    const onCopy = vi.fn();
    const onClear = vi.fn();

    const inspector = createInspector({ onCapture, onCopy, onClear });

    const a = document.createElement('article');
    const b = document.createElement('section');
    document.body.appendChild(a);
    document.body.appendChild(b);

    inspector.open();
    inspector.startPicker();

    a.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    b.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

    expect(inspector.getSnapshot().frames).toEqual([a, b]);
    expect(onCapture).toHaveBeenCalledTimes(2);

    await inspector.copyMarkdown();
    expect(writeText).toHaveBeenCalledOnce();
    expect(onCopy).toHaveBeenCalledOnce();
    expect((writeText.mock.calls[0]![0] as string).length).toBeGreaterThan(0);

    inspector.clearFrames();
    expect(inspector.getSnapshot().frames).toEqual([]);
    expect(onClear).toHaveBeenCalledOnce();

    inspector.destroy();
  });

  it('destroy stops the picker even if open is never called', () => {
    const inspector = createInspector();
    inspector.startPicker();
    expect(inspector.getSnapshot().picking).toBe(true);
    inspector.destroy();
  });

  it('visibility changes notify subscribers exactly once per transition', () => {
    const inspector = createInspector();
    const listener = vi.fn();
    inspector.subscribe(listener);

    inspector.open();
    inspector.open(); // no-op
    inspector.close();
    inspector.close(); // no-op

    expect(listener).toHaveBeenCalledTimes(2); // once for open, once for close
    inspector.destroy();
  });
});
```

- [ ] **Step 2: Run it**

```bash
pnpm -F @tw199501/specsnap-inspector-core test integration.test.ts
```

Expected: PASS — 3 tests green. If anything fails here, treat the failure as a spec gap — wiring bugs in create-inspector tend to surface here first.

- [ ] **Step 3: Commit**

```bash
git add packages/inspector-core/src/integration.test.ts
git commit -m "test(inspector-core): end-to-end integration smoke covering the full flow"
```

### Task 2.15: Package README

Every published package needs a README.

**Files:**

- Create: `packages/inspector-core/README.md`

- [ ] **Step 1: Write the README**

````markdown
# @tw199501/specsnap-inspector-core

Framework-agnostic core that powers [`@tw199501/specsnap-inspector-vue`](../inspector-vue) and [`@tw199501/specsnap-inspector-react`](../inspector-react). Exposes `createInspector()` — a headless factory that owns element-picker state, the frame list, daily sequence counter, clipboard, and a three-step storage ladder (File System Access → ZIP → individual downloads).

## Install

```bash
pnpm add @tw199501/specsnap-inspector-core @tw199501/specsnap-core
```

## Usage (vanilla)

```ts
import { createInspector } from '@tw199501/specsnap-inspector-core';

const inspector = createInspector({
  scope: document.querySelector('#app')!,
  onSave: async (bundle) => {
    await fetch('/api/specsnap', { method: 'POST', body: bundle.markdown.content });
  }
});

// Wire your own button
document.querySelector('#my-trigger')!.addEventListener('click', () => inspector.toggle());
```

## Options

See [`InspectorOptions`](./src/types.ts) for the full shape. Every field is optional — zero-config usage defaults to picker-on-document-body + fs-access storage.

## Storage ladder

When `onSave` is not provided, `saveBundle()` tries strategies in order:

1. **File System Access** — direct write to `specsnap/YYYYMMDD/` (Chromium only).
2. **ZIP download** — one `${captureId}.zip` via `fflate` (all modern browsers).
3. **Individual downloads** — one `<a download>` click per file (last resort).

## Framework wrappers

- [`@tw199501/specsnap-inspector-vue`](../inspector-vue) — drop-in Vue 3 component.
- [`@tw199501/specsnap-inspector-react`](../inspector-react) — drop-in React 18 component.

## License

MIT © tw199501
````

- [ ] **Step 2: Verify line endings**

```bash
pnpm check:eol
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add packages/inspector-core/README.md
git commit -m "docs(inspector-core): add package README"
```

---

## Phase 2 complete — checkpoint before Part 2

At this point, running `pnpm build && pnpm test && pnpm check && pnpm depcruise` from the repo root should be green across all three packages (`specsnap-core`, `inspector-core`, and the playground). inspector-core is functionally complete; what's missing is:

- Vue and React wrappers (Part 2 Phases 3–4)
- Playground migration to use inspector-core instead of its own hand-rolled logic (Part 2 Phase 5)
- README/CLAUDE.md updates (Part 2 Phase 6)
- Coordinated 0.0.7 release (Part 2 Phase 7)

**Before starting Part 2, verify the following:**

- [ ] `pnpm -F @tw199501/specsnap-inspector-core test` reports ~40+ tests, all green.
- [ ] `pnpm -F @tw199501/specsnap-inspector-core build` produces `dist/index.mjs`, `dist/index.cjs`, `dist/index.d.ts` (each ~a few KB gzipped).
- [ ] `pnpm depcruise` exits 0 — inspector-core has NOT leaked a `vue` or `react` import.
- [ ] Phase 0 outcome doc reflects the actual build choice and any deviations.

**If any of these fail, fix before Part 2.** Part 2 tasks assume Part 1 is clean.

---

## Self-review notes (writing-plans step)

Cross-checked against the spec's decisions:
- D1 (three packages): ✅ inspector-core scaffolded in Phase 2; inspector-vue/react in Part 2.
- D2 (batteries + escape hatch): ✅ saveBundleWithLadder + onSave override implemented (Task 2.10).
- D3 (trigger default): deferred to wrapper layer (Part 2) — correct, because the trigger button is rendering.
- D4 (picker scope default document.body): ✅ Task 2.5 + 2.11.
- D5 (panel position default bottom-right): deferred to wrapper layer.
- D6 (versioning lockstep): ✅ changesets config with `fixed` array (Task 1.1).
- D7 (playground upgrades): deferred to Part 2 Phase 5.

Type consistency check: `InspectorHandle` methods (Task 2.2 types) match `createInspector` return (Task 2.11). `StorageStrategy` values (`'fs-access' | 'zip' | 'individual' | 'callback'`) match all four implementation files in Phase 2 storage tasks. `SaveResult` shape is identical across all strategy implementations.

Placeholder scan: no TODOs, no "similar to Task N" without code, every code block is self-contained.

Coverage: every "file to create" in the Part 1 File Structure section has a corresponding numbered task.

---

**Next:** Part 2 plan covers Phases 3–7 (Vue wrapper, React wrapper, playground migration, docs, release). Will be written to `docs/superpower/plan/2026-04-20-v007-inspector-packages-plan-part-2.md`.
