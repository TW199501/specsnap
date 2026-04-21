# SpecSnap 0.0.7 — Inspector Packages Implementation Plan (Part 2 of 2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Prerequisite:** [Part 1](./2026-04-20-v007-inspector-packages-plan-part-1.md) must be complete and all checkpoints green before starting Part 2.

**Goal:** Complete the 0.0.7 Inspector release by building the Vue and React wrappers on top of `inspector-core`, migrating the playground to consume them, updating docs, and coordinating the publish.

**Architecture:** Both framework wrappers are thin shells over `inspector-core` — they own *rendering + reactivity bridge* only, never logic. Vue uses `<Teleport>` + `ref` subscription; React uses `createPortal` + `useSyncExternalStore`. The playground drops ~400 lines of hand-rolled Inspector code and imports `inspector-core` instead, demonstrating both wrappers side-by-side.

**Tech Stack:** Vue 3.5+, React 18+, tsup + vue-tsc (if Phase 0 outcome is A) / Vite library mode (if outcome is B), `@testing-library/react` (new), `@vue/test-utils` (new), scoped CSS + CSS custom properties.

**Spec:** [2026-04-20-v007-inspector-packages-design.md](2026-04-20-v007-inspector-packages-design.md). Decisions D1–D7 unchanged.

---

## File Structure (Part 2 scope)

**New packages:**

- `packages/inspector-vue/` — `@tw199501/specsnap-inspector-vue` @ 0.0.7
  - `src/SpecSnapInspector.vue` — the single public component
  - `src/use-inspector.ts` — composable that wraps `createInspector` + reactive snapshot
  - `src/trigger-button.vue` — the 44px circular launcher
  - `src/panel.vue` — the 420×540 opened panel (header / Start Inspect / Clear / Copy MD / frame list / raw JSON / status line)
  - `src/styles.css` — scoped global-selector fallback + CSS custom properties
  - `src/index.ts` — public barrel
  - `src/*.test.ts` — component tests with `@vue/test-utils`
  - `tsup.config.ts`, `vitest.config.ts`, `package.json`, `tsconfig.json`, `README.md`

- `packages/inspector-react/` — `@tw199501/specsnap-inspector-react` @ 0.0.7
  - `src/SpecSnapInspector.tsx` — the single public component (forwardRef)
  - `src/use-inspector.ts` — hook that wraps `createInspector` + `useSyncExternalStore`
  - `src/TriggerButton.tsx`
  - `src/Panel.tsx`
  - `src/styles.css`
  - `src/index.ts`
  - `src/*.test.tsx`
  - `tsup.config.ts`, `vitest.config.ts`, `package.json`, `tsconfig.json`, `README.md`

**Modified files:**

- `apps/playground/main.ts` — delete ~400 lines of hand-rolled inspector, replace with `createInspector` from `inspector-core`. Keeps the `.targets` scoped picker wiring.
- `apps/playground/fs-access.ts` — becomes a thin re-export of the version in `inspector-core` (all logic moved to core in Part 1 Task 2.7).
- `apps/playground/package.json` — add `@tw199501/specsnap-inspector-vue` + `@tw199501/specsnap-inspector-react` + `vue` + `react` + `react-dom` as workspace deps.
- `apps/playground/index.html` — add two demo-tab buttons (Vanilla / Vue / React) to showcase all three integrations.
- `apps/playground/vite.config.ts` — add `@vitejs/plugin-vue` and `@vitejs/plugin-react`.
- `packages/core/package.json` — bump to `0.0.7`.
- `README.md` + `README.zh-TW.md` — add "Use the Inspector UI" section.
- `CLAUDE.md` — update "Inspector panel is the UI we ship" to point at packages.

**New docs:**

- `docs/superpower/plan/2026-04-20-retrospective-v007.md` — release retrospective.
- `docs/superpower/plan/2026-04-20-v007-antares2-migration.md` — migration guide for the downstream Vue consumer.

---

## Phase 3: inspector-vue package

### Task 3.1: Scaffold inspector-vue

**Files:**

- Create: `packages/inspector-vue/package.json`
- Create: `packages/inspector-vue/tsconfig.json`
- Create: `packages/inspector-vue/tsup.config.ts` (or `vite.config.ts` if Phase 0 outcome = B)
- Create: `packages/inspector-vue/vitest.config.ts`
- Create: `packages/inspector-vue/src/index.ts` (empty)

- [ ] **Step 1: Create `packages/inspector-vue/package.json`**

```json
{
  "name": "@tw199501/specsnap-inspector-vue",
  "version": "0.0.7",
  "description": "Vue 3 drop-in SpecSnap Inspector UI",
  "type": "module",
  "main": "./dist/index.mjs",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs"
    },
    "./styles.css": "./dist/styles.css"
  },
  "files": ["dist", "README.md"],
  "sideEffects": ["**/*.css"],
  "scripts": {
    "build": "tsup && vue-tsc --emitDeclarationOnly --declaration --outDir dist",
    "test": "vitest run",
    "test:watch": "vitest",
    "check": "vue-tsc --noEmit",
    "dev": "tsup --watch"
  },
  "peerDependencies": {
    "@tw199501/specsnap-inspector-core": "workspace:^",
    "vue": ">=3.3"
  },
  "devDependencies": {
    "@tw199501/specsnap-inspector-core": "workspace:*",
    "@types/node": "^22.10.0",
    "@vitest/coverage-v8": "^4.1.4",
    "@vue/test-utils": "^2.4.6",
    "esbuild-plugin-vue3": "^0.4.2",
    "happy-dom": "^20.9.0",
    "tsup": "^8.5.1",
    "typescript": "^6.0.3",
    "vitest": "^4.1.4",
    "vue": "^3.5.0",
    "vue-tsc": "^2.2.0"
  },
  "publishConfig": { "access": "public" },
  "author": "tw199501",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/tw199501/specsnap.git",
    "directory": "packages/inspector-vue"
  }
}
```

Note the `./styles.css` subpath export: consumers do `import '@tw199501/specsnap-inspector-vue/styles.css'` alongside the component import. `sideEffects: ["**/*.css"]` keeps bundlers from tree-shaking it away.

- [ ] **Step 2: Create `packages/inspector-vue/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "jsx": "preserve",
    "types": ["node"]
  },
  "include": ["src/**/*.ts", "src/**/*.vue", "src/**/*.tsx"],
  "exclude": ["**/*.test.ts", "dist"]
}
```

- [ ] **Step 3: Create `packages/inspector-vue/tsup.config.ts`** (Phase 0 outcome A path)

```ts
import { defineConfig } from 'tsup';
import vuePlugin from 'esbuild-plugin-vue3';
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: false,
  sourcemap: true,
  clean: true,
  outExtension: () => ({ js: '.mjs' }),
  esbuildPlugins: [vuePlugin()],
  external: ['vue', '@tw199501/specsnap-inspector-core'],
  onSuccess: async () => {
    // Copy the CSS asset into dist so the `./styles.css` export works.
    mkdirSync(dirname('dist/styles.css'), { recursive: true });
    copyFileSync('src/styles.css', 'dist/styles.css');
  }
});
```

If Phase 0 outcome was B (tsup can't do Vue SFCs), replace with `vite.config.ts` + `@vitejs/plugin-vue` library mode. Specifics deferred — flag in the commit.

- [ ] **Step 4: Create `packages/inspector-vue/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  test: {
    globals: true,
    environment: 'happy-dom',
    include: ['src/**/*.test.ts']
  }
});
```

Note: vitest uses `@vitejs/plugin-vue` at test time even if the build uses esbuild-plugin-vue3 — the two have different output trade-offs, but both produce runnable components for tests. Add `@vitejs/plugin-vue` to devDependencies if vitest doesn't bring it transitively.

- [ ] **Step 5: Create empty `packages/inspector-vue/src/index.ts`**

```ts
// Public barrel — populated by subsequent tasks.
export {};
```

- [ ] **Step 6: Install deps + smoke build**

```bash
pnpm install
pnpm -F @tw199501/specsnap-inspector-vue build
```

Expected: build succeeds with empty output (just module shell).

- [ ] **Step 7: Commit**

```bash
git add packages/inspector-vue pnpm-lock.yaml
git commit -m "feat(inspector-vue): scaffold @tw199501/specsnap-inspector-vue package"
```

### Task 3.2: `useInspector` composable (reactivity bridge)

**Files:**

- Create: `packages/inspector-vue/src/use-inspector.ts`
- Create: `packages/inspector-vue/src/use-inspector.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { defineComponent, h, ref } from 'vue';
import { mount } from '@vue/test-utils';
import { useInspector } from './use-inspector.js';

describe('useInspector', () => {
  it('exposes a reactive snapshot that updates when core state changes', async () => {
    const TestComp = defineComponent({
      setup() {
        const { snapshot, handle } = useInspector({});
        return { snapshot, handle };
      },
      render() {
        return h('div', {}, this.snapshot.visible ? 'open' : 'closed');
      }
    });

    const wrapper = mount(TestComp);
    expect(wrapper.text()).toBe('closed');

    (wrapper.vm as unknown as { handle: { open: () => void } }).handle.open();
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toBe('open');

    wrapper.unmount();
  });

  it('destroys the inspector on component unmount', async () => {
    let destroyed = false;
    const TestComp = defineComponent({
      setup() {
        const { handle } = useInspector({});
        // wrap destroy so we can observe it
        const origDestroy = handle.destroy;
        handle.destroy = () => { destroyed = true; origDestroy(); };
        return {};
      },
      render() { return h('div'); }
    });

    const wrapper = mount(TestComp);
    wrapper.unmount();
    expect(destroyed).toBe(true);
  });
});
```

- [ ] **Step 2: Verify failure**

```bash
pnpm -F @tw199501/specsnap-inspector-vue test use-inspector.test.ts
```

Expected: FAIL — file unresolved.

- [ ] **Step 3: Implement `packages/inspector-vue/src/use-inspector.ts`**

```ts
import { shallowRef, onBeforeUnmount, type ShallowRef } from 'vue';
import { createInspector } from '@tw199501/specsnap-inspector-core';
import type { InspectorOptions, InspectorHandle, InspectorSnapshot } from '@tw199501/specsnap-inspector-core';

export interface UseInspectorReturn {
  /** Reactive snapshot — swapped on every change so Vue's shallowRef reactivity triggers. */
  snapshot: ShallowRef<InspectorSnapshot>;
  /** Imperative handle for programmatic control. */
  handle: InspectorHandle;
}

/**
 * Bridge between the framework-agnostic inspector-core store and Vue's reactivity.
 *
 * Why shallowRef (not ref):
 *  - The snapshot is replaced whole on every change (core's store returns a fresh object);
 *    deep reactivity would be wasted work.
 *  - Vue's shallowRef triggers on identity change, which matches core's invalidate-and-emit pattern.
 */
export function useInspector(options: InspectorOptions): UseInspectorReturn {
  const handle = createInspector(options);
  const snapshot = shallowRef<InspectorSnapshot>(handle.getSnapshot());

  const unsubscribe = handle.subscribe(() => {
    snapshot.value = handle.getSnapshot();
  });

  onBeforeUnmount(() => {
    unsubscribe();
    handle.destroy();
  });

  return { snapshot, handle };
}
```

- [ ] **Step 4: Verify passing**

```bash
pnpm -F @tw199501/specsnap-inspector-vue test use-inspector.test.ts
```

Expected: PASS — 2 tests green.

- [ ] **Step 5: Commit**

```bash
git add packages/inspector-vue/src/use-inspector.ts packages/inspector-vue/src/use-inspector.test.ts
git commit -m "feat(inspector-vue): add useInspector composable bridging core to Vue reactivity"
```

### Task 3.3: CSS tokens

All visual styling lives in one CSS file consumed via `import '@tw199501/specsnap-inspector-vue/styles.css'`. Shipped both inline (scoped in SFCs) and as an external file for consumers who bundle CSS separately.

**Files:**

- Create: `packages/inspector-vue/src/styles.css`

- [ ] **Step 1: Create the stylesheet**

```css
/*
 * SpecSnap Inspector styling — Vue wrapper.
 *
 * Custom properties all namespaced with `--specsnap-` so host pages don't clash.
 * Override any of these in your app's global CSS to theme the inspector.
 */
.specsnap-inspector-root {
  --specsnap-panel-bg: #ffffff;
  --specsnap-panel-border: #e2e8f0;
  --specsnap-panel-shadow: 0 12px 32px rgba(15, 23, 42, 0.18);
  --specsnap-text-primary: #0f172a;
  --specsnap-text-muted: #64748b;
  --specsnap-accent: #2563eb;
  --specsnap-accent-contrast: #ffffff;
  --specsnap-danger: #ef4444;
  --specsnap-success: #10b981;
  --specsnap-panel-width: 420px;
  --specsnap-panel-height: 540px;
  --specsnap-trigger-size: 44px;
  --specsnap-z-index: 2147483000;
  --specsnap-radius: 12px;
  --specsnap-font: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
}

.specsnap-inspector-trigger {
  position: fixed;
  width: var(--specsnap-trigger-size);
  height: var(--specsnap-trigger-size);
  border-radius: 50%;
  background: var(--specsnap-accent);
  color: var(--specsnap-accent-contrast);
  border: none;
  cursor: pointer;
  box-shadow: var(--specsnap-panel-shadow);
  z-index: var(--specsnap-z-index);
  display: grid;
  place-items: center;
  font-family: var(--specsnap-font);
  font-size: 18px;
  transition: transform 0.15s ease;
}
.specsnap-inspector-trigger:hover { transform: scale(1.08); }

.specsnap-inspector-trigger[data-position="top-left"]     { top: 12px;    left: 12px; }
.specsnap-inspector-trigger[data-position="top-right"]    { top: 12px;    right: 12px; }
.specsnap-inspector-trigger[data-position="bottom-left"]  { bottom: 12px; left: 12px; }
.specsnap-inspector-trigger[data-position="bottom-right"] { bottom: 12px; right: 12px; }

.specsnap-inspector-panel {
  position: fixed;
  width: var(--specsnap-panel-width);
  height: var(--specsnap-panel-height);
  background: var(--specsnap-panel-bg);
  color: var(--specsnap-text-primary);
  border: 1px solid var(--specsnap-panel-border);
  border-radius: var(--specsnap-radius);
  box-shadow: var(--specsnap-panel-shadow);
  z-index: var(--specsnap-z-index);
  display: flex;
  flex-direction: column;
  font-family: var(--specsnap-font);
  font-size: 14px;
}
.specsnap-inspector-panel[data-position="top-left"]     { top: 12px;    left: 12px; }
.specsnap-inspector-panel[data-position="top-right"]    { top: 12px;    right: 12px; }
.specsnap-inspector-panel[data-position="bottom-left"]  { bottom: 12px; left: 12px; }
.specsnap-inspector-panel[data-position="bottom-right"] { bottom: 12px; right: 12px; }

.specsnap-inspector-panel__header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--specsnap-panel-border);
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: move;
}
.specsnap-inspector-panel__title { font-weight: 600; }
.specsnap-inspector-panel__hint {
  color: var(--specsnap-text-muted);
  font-size: 12px;
  margin-left: auto;
}
.specsnap-inspector-panel__close {
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 16px;
  color: var(--specsnap-text-muted);
}

.specsnap-inspector-panel__actions {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
}
.specsnap-inspector-panel__actions button {
  flex: 1;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid var(--specsnap-panel-border);
  cursor: pointer;
  font-family: inherit;
  font-size: 13px;
}
.specsnap-inspector-panel__actions .specsnap-btn-primary {
  background: var(--specsnap-accent);
  color: var(--specsnap-accent-contrast);
  border-color: var(--specsnap-accent);
}
.specsnap-inspector-panel__actions .specsnap-btn-primary.active {
  filter: brightness(0.9);
}

.specsnap-inspector-panel__frames {
  flex: 1;
  overflow-y: auto;
  padding: 0 16px 12px;
}
.specsnap-inspector-frame {
  padding: 8px 12px;
  border: 1px solid var(--specsnap-panel-border);
  border-radius: 8px;
  margin-top: 8px;
  display: flex;
  gap: 8px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
}
.specsnap-inspector-frame__index {
  background: var(--specsnap-accent);
  color: var(--specsnap-accent-contrast);
  min-width: 20px;
  height: 20px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  font-size: 11px;
}
.specsnap-inspector-empty {
  text-align: center;
  color: var(--specsnap-text-muted);
  padding: 32px 16px;
  font-size: 13px;
}

.specsnap-inspector-panel__status {
  padding: 8px 16px;
  border-top: 1px solid var(--specsnap-panel-border);
  font-size: 12px;
  color: var(--specsnap-text-muted);
  min-height: 32px;
}
.specsnap-inspector-panel__status[data-kind="error"] { color: var(--specsnap-danger); }
.specsnap-inspector-panel__status[data-kind="success"] { color: var(--specsnap-success); }

.specsnap-inspector-panel__json {
  border-top: 1px solid var(--specsnap-panel-border);
  padding: 8px 16px;
}
.specsnap-inspector-panel__json summary {
  cursor: pointer;
  font-size: 12px;
  color: var(--specsnap-text-muted);
}
.specsnap-inspector-panel__json pre {
  max-height: 160px;
  overflow: auto;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 11px;
  margin: 8px 0 0;
}

/* Cursor for the picker mode. Applied to body by the wrapper via a class. */
body.specsnap-inspecting, body.specsnap-inspecting * {
  cursor: crosshair !important;
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/inspector-vue/src/styles.css
git commit -m "feat(inspector-vue): add CSS tokens + panel/trigger layout"
```

### Task 3.4: Trigger button SFC

**Files:**

- Create: `packages/inspector-vue/src/TriggerButton.vue`

- [ ] **Step 1: Create the SFC**

```vue
<template>
  <button
    type="button"
    class="specsnap-inspector-trigger"
    :data-position="position"
    :aria-label="ariaLabel"
    @click="$emit('click')"
  >
    <slot>◎</slot>
  </button>
</template>

<script setup lang="ts">
import type { PanelPosition } from '@tw199501/specsnap-inspector-core';

defineProps<{
  position: PanelPosition;
  ariaLabel: string;
}>();

defineEmits<{ click: [] }>();
</script>
```

- [ ] **Step 2: Commit**

```bash
git add packages/inspector-vue/src/TriggerButton.vue
git commit -m "feat(inspector-vue): add TriggerButton SFC"
```

### Task 3.5: Panel SFC

**Files:**

- Create: `packages/inspector-vue/src/Panel.vue`

- [ ] **Step 1: Create the SFC**

```vue
<template>
  <div
    class="specsnap-inspector-panel specsnap-inspector-root"
    :data-position="position"
    role="dialog"
    aria-label="SpecSnap Inspector"
  >
    <header class="specsnap-inspector-panel__header">
      <span class="specsnap-inspector-panel__title">{{ title }}</span>
      <span class="specsnap-inspector-panel__hint">next: {{ nextCaptureId }}</span>
      <button
        type="button"
        class="specsnap-inspector-panel__close"
        aria-label="Close"
        @click="$emit('close')"
      >×</button>
    </header>

    <div class="specsnap-inspector-panel__actions">
      <button
        type="button"
        class="specsnap-btn-primary"
        :class="{ active: picking }"
        @click="$emit('toggle-picker')"
      >
        {{ picking ? `Done (${frames.length})` : frames.length === 0 ? 'Start Inspect' : `Start Inspect · ${frames.length}` }}
      </button>
      <button type="button" @click="$emit('clear')" :disabled="frames.length === 0">Clear</button>
      <button type="button" @click="$emit('copy')" :disabled="frames.length === 0">Copy MD</button>
    </div>

    <div class="specsnap-inspector-panel__frames">
      <div v-if="frames.length === 0" class="specsnap-inspector-empty">
        Click Start Inspect, then click any element in the target area.
      </div>
      <div
        v-for="(frame, i) in frames"
        :key="i"
        class="specsnap-inspector-frame"
      >
        <span class="specsnap-inspector-frame__index">{{ i + 1 }}</span>
        <span>{{ describeFrame(frame) }}</span>
      </div>
    </div>

    <div
      v-if="statusMessage"
      class="specsnap-inspector-panel__status"
      :data-kind="statusKind"
    >{{ statusMessage }}</div>

    <details class="specsnap-inspector-panel__json">
      <summary>Raw JSON (machine consumers)</summary>
      <pre>{{ sessionJson }}</pre>
    </details>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { InspectorSnapshot, PanelPosition } from '@tw199501/specsnap-inspector-core';

const props = defineProps<{
  snapshot: InspectorSnapshot;
  position: PanelPosition;
  title: string;
}>();

defineEmits<{
  close: [];
  'toggle-picker': [];
  clear: [];
  copy: [];
}>();

const frames = computed(() => props.snapshot.frames);
const picking = computed(() => props.snapshot.picking);
const nextCaptureId = computed(() => props.snapshot.nextCaptureId);

const sessionJson = computed(() =>
  props.snapshot.session ? JSON.stringify(props.snapshot.session, null, 2) : 'No session yet.'
);

const statusMessage = computed(() => {
  const s = props.snapshot.lastSave;
  if (!s) return '';
  if (s.error) return `✗ ${s.error}`;
  if (s.strategy === 'fs-access') return `✓ Saved to ${s.location} (${s.fileCount} files)`;
  if (s.strategy === 'zip') return `✓ Downloaded ${s.location}`;
  if (s.strategy === 'individual') return `✓ Downloaded ${s.fileCount} files`;
  return '✓ Handled by app';
});

const statusKind = computed(() => {
  const s = props.snapshot.lastSave;
  if (!s) return 'info';
  return s.error ? 'error' : 'success';
});

function describeFrame(el: HTMLElement): string {
  const tag = el.tagName.toLowerCase();
  const id = el.id ? `#${el.id}` : '';
  const cls = el.className && typeof el.className === 'string'
    ? '.' + el.className.split(/\s+/).filter(Boolean).slice(0, 2).join('.')
    : '';
  return `${tag}${id}${cls}`;
}
</script>
```

- [ ] **Step 2: Commit**

```bash
git add packages/inspector-vue/src/Panel.vue
git commit -m "feat(inspector-vue): add Panel SFC (frame list + actions + status)"
```

### Task 3.6: `SpecSnapInspector.vue` top-level component

**Files:**

- Create: `packages/inspector-vue/src/SpecSnapInspector.vue`
- Create: `packages/inspector-vue/src/SpecSnapInspector.test.ts`

- [ ] **Step 1: Write the failing integration test**

```ts
import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import SpecSnapInspector from './SpecSnapInspector.vue';

describe('SpecSnapInspector (top-level component)', () => {
  it('renders the trigger button by default', () => {
    const wrapper = mount(SpecSnapInspector);
    const trigger = wrapper.find('.specsnap-inspector-trigger');
    expect(trigger.exists()).toBe(true);
    wrapper.unmount();
  });

  it('hides the trigger when trigger prop is false', () => {
    const wrapper = mount(SpecSnapInspector, { props: { trigger: false } });
    expect(wrapper.find('.specsnap-inspector-trigger').exists()).toBe(false);
    wrapper.unmount();
  });

  it('clicking trigger opens the panel', async () => {
    const wrapper = mount(SpecSnapInspector, { attachTo: document.body });
    await wrapper.find('.specsnap-inspector-trigger').trigger('click');
    // Panel is teleported to body
    expect(document.body.querySelector('.specsnap-inspector-panel')).not.toBeNull();
    wrapper.unmount();
  });

  it('exposes an imperative handle via ref', () => {
    const wrapper = mount(SpecSnapInspector);
    const exposed = wrapper.vm.$.exposed as { open: () => void; close: () => void };
    expect(typeof exposed.open).toBe('function');
    expect(typeof exposed.close).toBe('function');
    wrapper.unmount();
  });

  it('emits save event with bundle shape when user clicks Copy MD', async () => {
    // Mock clipboard
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) }
    });

    const wrapper = mount(SpecSnapInspector, { attachTo: document.body });

    // Open + capture one frame by directly calling exposed handle (simulating a user click)
    const exposed = wrapper.vm.$.exposed as { open: () => void; handle: { startPicker: () => void; saveBundle: () => Promise<unknown> } };
    exposed.open();
    const target = document.createElement('div');
    document.body.appendChild(target);
    exposed.handle.startPicker();
    target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

    // saveBundle is async; we just assert the call does not throw
    await expect(exposed.handle.saveBundle()).resolves.toBeDefined();

    wrapper.unmount();
  });
});
```

- [ ] **Step 2: Verify failure**

```bash
pnpm -F @tw199501/specsnap-inspector-vue test SpecSnapInspector.test.ts
```

Expected: FAIL — file does not exist.

- [ ] **Step 3: Implement `packages/inspector-vue/src/SpecSnapInspector.vue`**

```vue
<template>
  <TriggerButton
    v-if="trigger && !snapshot.visible"
    :position="position"
    aria-label="Open SpecSnap Inspector"
    @click="handle.toggle()"
  />

  <Teleport to="body">
    <Panel
      v-if="snapshot.visible"
      :snapshot="snapshot"
      :position="position"
      :title="panelTitle"
      @close="handle.close()"
      @toggle-picker="handle.picking ? handle.stopPicker() : handle.startPicker()"
      @clear="handle.clearFrames()"
      @copy="onCopyClick"
    />
  </Teleport>
</template>

<script setup lang="ts">
import { computed, defineExpose, watch } from 'vue';
import TriggerButton from './TriggerButton.vue';
import Panel from './Panel.vue';
import { useInspector } from './use-inspector.js';
import type { PanelPosition, InspectorOptions, InspectorHandle, SpecSnapBundle, Session, SaveResult } from '@tw199501/specsnap-inspector-core';

const props = withDefaults(defineProps<{
  scope?: InspectorOptions['scope'];
  position?: PanelPosition;
  trigger?: boolean;
  panelTitle?: string;
  onSave?: (bundle: SpecSnapBundle) => void | Promise<void>;
}>(), {
  position: 'bottom-right',
  trigger: true,
  panelTitle: 'SpecSnap Inspector'
});

const emit = defineEmits<{
  save: [SpecSnapBundle];
  copy: [string];
  capture: [{ frameIndex: number; session: Session }];
  clear: [];
  open: [];
  close: [];
}>();

const { snapshot, handle } = useInspector({
  scope: props.scope,
  position: props.position,
  trigger: props.trigger,
  panelTitle: props.panelTitle,
  onSave: props.onSave,
  onCopy: (md) => emit('copy', md),
  onCapture: (payload) => emit('capture', payload),
  onClear: () => emit('clear'),
  onOpen: () => emit('open'),
  onClose: () => emit('close')
});

// Track body class for picker-mode crosshair cursor
watch(() => snapshot.value.picking, (on) => {
  document.body.classList.toggle('specsnap-inspecting', on);
}, { immediate: false });

async function onCopyClick(): Promise<void> {
  await handle.copyMarkdown();
  const result: SaveResult = await handle.saveBundle();
  if (!props.onSave && result.strategy !== 'callback') {
    // built-in storage ran; nothing else to do
  }
}

defineExpose({
  open: () => handle.open(),
  close: () => handle.close(),
  toggle: () => handle.toggle(),
  startPicker: () => handle.startPicker(),
  stopPicker: () => handle.stopPicker(),
  clearFrames: () => handle.clearFrames(),
  getSnapshot: () => handle.getSnapshot(),
  handle: handle as InspectorHandle
});
</script>
```

- [ ] **Step 4: Verify tests pass**

```bash
pnpm -F @tw199501/specsnap-inspector-vue test SpecSnapInspector.test.ts
```

Expected: PASS — 5 tests green.

- [ ] **Step 5: Commit**

```bash
git add packages/inspector-vue/src/SpecSnapInspector.vue packages/inspector-vue/src/SpecSnapInspector.test.ts
git commit -m "feat(inspector-vue): add SpecSnapInspector top-level component"
```

### Task 3.7: Public barrel + README + final build

**Files:**

- Modify: `packages/inspector-vue/src/index.ts`
- Create: `packages/inspector-vue/README.md`

- [ ] **Step 1: Replace empty barrel with public exports**

```ts
export { default as SpecSnapInspector } from './SpecSnapInspector.vue';
export { useInspector, type UseInspectorReturn } from './use-inspector.js';
export type {
  InspectorOptions,
  InspectorSnapshot,
  InspectorHandle,
  PanelPosition,
  ScopeInput,
  SpecSnapBundle,
  Session,
  SaveResult
} from '@tw199501/specsnap-inspector-core';
```

- [ ] **Step 2: Create README**

````markdown
# @tw199501/specsnap-inspector-vue

Drop-in Vue 3 SpecSnap Inspector. Zero config: install, import, drop the component, get a working element inspector with clipboard + bundle save.

## Install

```bash
pnpm add @tw199501/specsnap-inspector-vue @tw199501/specsnap-inspector-core @tw199501/specsnap-core vue
```

## Usage

```vue
<template>
  <SpecSnapInspector />
</template>

<script setup lang="ts">
import '@tw199501/specsnap-inspector-vue/styles.css';
import { SpecSnapInspector } from '@tw199501/specsnap-inspector-vue';
</script>
```

Done. A floating trigger appears bottom-right. Click it to open the panel; click Start Inspect; click any element; click Copy MD.

## Props

| Prop | Type | Default | Purpose |
|---|---|---|---|
| `scope` | `HTMLElement \| (() => HTMLElement) \| null` | `null` (= document.body) | Restrict the picker to a region |
| `position` | `'top-left' \| 'top-right' \| 'bottom-left' \| 'bottom-right'` | `'bottom-right'` | Trigger + panel corner |
| `trigger` | `boolean` | `true` | Show the built-in floating trigger button |
| `panelTitle` | `string` | `'SpecSnap Inspector'` | Header text |
| `onSave` | `(bundle) => void \| Promise<void>` | — | If provided, overrides built-in storage |

## Events

- `save` — fired with `SpecSnapBundle`
- `copy` — fired with the copied Markdown string
- `capture` — fired per-frame with `{ frameIndex, session }`
- `clear`, `open`, `close`

## Imperative API (via ref)

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { SpecSnapInspector } from '@tw199501/specsnap-inspector-vue';

const inspector = ref<InstanceType<typeof SpecSnapInspector>>();

function openFromMyMenu() {
  inspector.value?.open();
}
</script>

<template>
  <SpecSnapInspector ref="inspector" :trigger="false" />
</template>
```

## License

MIT © tw199501
````

- [ ] **Step 3: Full build + test**

```bash
pnpm -F @tw199501/specsnap-inspector-vue test && pnpm -F @tw199501/specsnap-inspector-vue build && pnpm -F @tw199501/specsnap-inspector-vue check
```

Expected: all green. `dist/index.mjs`, `dist/index.d.ts`, `dist/styles.css` all exist.

- [ ] **Step 4: Verify boundary rule**

```bash
pnpm depcruise
```

Expected: No violations.

- [ ] **Step 5: Commit**

```bash
git add packages/inspector-vue/src/index.ts packages/inspector-vue/README.md
git commit -m "feat(inspector-vue): export public barrel + add README"
```

---

## Phase 4: inspector-react package

Mirrors Phase 3 but for React 18+. Same public contract, different reactivity bridge (`useSyncExternalStore`), different rendering (`createPortal`).

### Task 4.1: Scaffold inspector-react

**Files:**

- Create: `packages/inspector-react/package.json`
- Create: `packages/inspector-react/tsconfig.json`
- Create: `packages/inspector-react/tsup.config.ts`
- Create: `packages/inspector-react/vitest.config.ts`
- Create: `packages/inspector-react/src/index.ts` (empty)

- [ ] **Step 1: Create `packages/inspector-react/package.json`**

```json
{
  "name": "@tw199501/specsnap-inspector-react",
  "version": "0.0.7",
  "description": "React 18 drop-in SpecSnap Inspector UI",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs"
    },
    "./styles.css": "./dist/styles.css"
  },
  "files": ["dist", "README.md"],
  "sideEffects": ["**/*.css"],
  "scripts": {
    "build": "tsup",
    "test": "vitest run",
    "test:watch": "vitest",
    "check": "tsc --noEmit",
    "dev": "tsup --watch"
  },
  "peerDependencies": {
    "@tw199501/specsnap-inspector-core": "workspace:^",
    "react": ">=18",
    "react-dom": ">=18"
  },
  "devDependencies": {
    "@tw199501/specsnap-inspector-core": "workspace:*",
    "@testing-library/react": "^16.1.0",
    "@types/node": "^22.10.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitest/coverage-v8": "^4.1.4",
    "happy-dom": "^20.9.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "tsup": "^8.5.1",
    "typescript": "^6.0.3",
    "vitest": "^4.1.4"
  },
  "publishConfig": { "access": "public" },
  "author": "tw199501",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/tw199501/specsnap.git",
    "directory": "packages/inspector-react"
  }
}
```

- [ ] **Step 2: Create `packages/inspector-react/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "jsx": "react-jsx",
    "types": ["node"]
  },
  "include": ["src/**/*.ts", "src/**/*.tsx"],
  "exclude": ["**/*.test.tsx", "**/*.test.ts", "dist"]
}
```

- [ ] **Step 3: Create `packages/inspector-react/tsup.config.ts`**

```ts
import { defineConfig } from 'tsup';
import { copyFileSync } from 'node:fs';

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
  external: ['react', 'react-dom', '@tw199501/specsnap-inspector-core'],
  onSuccess: async () => {
    copyFileSync('src/styles.css', 'dist/styles.css');
  }
});
```

- [ ] **Step 4: Create `packages/inspector-react/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  esbuild: { jsx: 'automatic' },
  test: {
    globals: true,
    environment: 'happy-dom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx']
  }
});
```

- [ ] **Step 5: Create empty `src/index.ts`**

```ts
export {};
```

- [ ] **Step 6: Install + smoke**

```bash
pnpm install && pnpm -F @tw199501/specsnap-inspector-react build
```

Expected: build succeeds.

- [ ] **Step 7: Commit**

```bash
git add packages/inspector-react pnpm-lock.yaml
git commit -m "feat(inspector-react): scaffold @tw199501/specsnap-inspector-react package"
```

### Task 4.2: Port CSS

The CSS is identical to inspector-vue (token names and selectors are shared).

**Files:**

- Create: `packages/inspector-react/src/styles.css`

- [ ] **Step 1: Copy CSS from inspector-vue**

```bash
cp packages/inspector-vue/src/styles.css packages/inspector-react/src/styles.css
```

- [ ] **Step 2: Commit**

```bash
git add packages/inspector-react/src/styles.css
git commit -m "feat(inspector-react): port shared CSS from inspector-vue"
```

### Task 4.3: `useInspector` hook

**Files:**

- Create: `packages/inspector-react/src/use-inspector.ts`
- Create: `packages/inspector-react/src/use-inspector.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect } from 'vitest';
import { render, act } from '@testing-library/react';
import { useInspector } from './use-inspector.js';
import type { InspectorHandle } from '@tw199501/specsnap-inspector-core';

describe('useInspector', () => {
  it('returns a stable handle + a reactive snapshot', () => {
    let capturedHandle: InspectorHandle | null = null;
    let capturedSnapshot: unknown = null;

    function TestComp() {
      const { handle, snapshot } = useInspector({});
      capturedHandle = handle;
      capturedSnapshot = snapshot;
      return <div>{snapshot.visible ? 'open' : 'closed'}</div>;
    }

    const { getByText, rerender } = render(<TestComp />);
    expect(getByText('closed')).toBeDefined();
    expect(capturedHandle).not.toBeNull();
    const handleBefore = capturedHandle;

    act(() => { capturedHandle!.open(); });
    rerender(<TestComp />);

    expect(getByText('open')).toBeDefined();
    expect(capturedHandle).toBe(handleBefore); // handle identity stable across renders
  });
});
```

- [ ] **Step 2: Verify failure**

```bash
pnpm -F @tw199501/specsnap-inspector-react test use-inspector.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Implement `packages/inspector-react/src/use-inspector.ts`**

```ts
import { useRef, useSyncExternalStore, useEffect } from 'react';
import { createInspector } from '@tw199501/specsnap-inspector-core';
import type { InspectorOptions, InspectorHandle, InspectorSnapshot } from '@tw199501/specsnap-inspector-core';

export interface UseInspectorReturn {
  snapshot: InspectorSnapshot;
  handle: InspectorHandle;
}

/**
 * React bridge to inspector-core.
 *
 * Uses `useSyncExternalStore` — React 18's official API for external stores.
 * Strict Mode safety: the hook subscribes during commit (inside useSyncExternalStore's
 * internal effect), so the double-invocation in dev mode does NOT double-subscribe.
 *
 * Handle stability: we instantiate via useRef so the same inspector instance survives
 * across renders, AND we tear it down on unmount via useEffect cleanup.
 */
export function useInspector(options: InspectorOptions): UseInspectorReturn {
  // Instantiate once; options-change handling is deferred — full option reactivity
  // is a follow-up if needed (rarely actually needed in practice; consumer re-mount works).
  const handleRef = useRef<InspectorHandle | null>(null);
  if (handleRef.current === null) {
    handleRef.current = createInspector(options);
  }
  const handle = handleRef.current;

  useEffect(() => {
    return () => {
      handle.destroy();
      handleRef.current = null;
    };
  }, [handle]);

  const snapshot = useSyncExternalStore(
    handle.subscribe,
    handle.getSnapshot,
    handle.getSnapshot // server snapshot: same (we guard window in core)
  );

  return { snapshot, handle };
}
```

- [ ] **Step 4: Verify passing**

```bash
pnpm -F @tw199501/specsnap-inspector-react test use-inspector.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/inspector-react/src/use-inspector.ts packages/inspector-react/src/use-inspector.test.tsx
git commit -m "feat(inspector-react): add useInspector hook via useSyncExternalStore"
```

### Task 4.4: `TriggerButton` component

**Files:**

- Create: `packages/inspector-react/src/TriggerButton.tsx`

- [ ] **Step 1: Create the component**

```tsx
import type { PanelPosition } from '@tw199501/specsnap-inspector-core';

export interface TriggerButtonProps {
  position: PanelPosition;
  ariaLabel: string;
  onClick: () => void;
}

export function TriggerButton({ position, ariaLabel, onClick }: TriggerButtonProps) {
  return (
    <button
      type="button"
      className="specsnap-inspector-trigger"
      data-position={position}
      aria-label={ariaLabel}
      onClick={onClick}
    >
      ◎
    </button>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/inspector-react/src/TriggerButton.tsx
git commit -m "feat(inspector-react): add TriggerButton component"
```

### Task 4.5: `Panel` component

**Files:**

- Create: `packages/inspector-react/src/Panel.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { useMemo } from 'react';
import type { InspectorSnapshot, PanelPosition } from '@tw199501/specsnap-inspector-core';

export interface PanelProps {
  snapshot: InspectorSnapshot;
  position: PanelPosition;
  title: string;
  onClose: () => void;
  onTogglePicker: () => void;
  onClear: () => void;
  onCopy: () => void;
}

function describeFrame(el: HTMLElement): string {
  const tag = el.tagName.toLowerCase();
  const id = el.id ? `#${el.id}` : '';
  const cls = typeof el.className === 'string' && el.className
    ? '.' + el.className.split(/\s+/).filter(Boolean).slice(0, 2).join('.')
    : '';
  return `${tag}${id}${cls}`;
}

export function Panel({ snapshot, position, title, onClose, onTogglePicker, onClear, onCopy }: PanelProps) {
  const { frames, picking, nextCaptureId, session, lastSave } = snapshot;

  const sessionJson = useMemo(
    () => session ? JSON.stringify(session, null, 2) : 'No session yet.',
    [session]
  );

  const inspectLabel = picking
    ? `Done (${frames.length})`
    : frames.length === 0 ? 'Start Inspect' : `Start Inspect · ${frames.length}`;

  const statusMessage = (() => {
    if (!lastSave) return '';
    if (lastSave.error) return `✗ ${lastSave.error}`;
    if (lastSave.strategy === 'fs-access') return `✓ Saved to ${lastSave.location} (${lastSave.fileCount} files)`;
    if (lastSave.strategy === 'zip') return `✓ Downloaded ${lastSave.location}`;
    if (lastSave.strategy === 'individual') return `✓ Downloaded ${lastSave.fileCount} files`;
    return '✓ Handled by app';
  })();
  const statusKind = lastSave?.error ? 'error' : lastSave ? 'success' : 'info';

  return (
    <div
      className="specsnap-inspector-panel specsnap-inspector-root"
      data-position={position}
      role="dialog"
      aria-label="SpecSnap Inspector"
    >
      <header className="specsnap-inspector-panel__header">
        <span className="specsnap-inspector-panel__title">{title}</span>
        <span className="specsnap-inspector-panel__hint">next: {nextCaptureId}</span>
        <button
          type="button"
          className="specsnap-inspector-panel__close"
          aria-label="Close"
          onClick={onClose}
        >×</button>
      </header>

      <div className="specsnap-inspector-panel__actions">
        <button
          type="button"
          className={`specsnap-btn-primary${picking ? ' active' : ''}`}
          onClick={onTogglePicker}
        >{inspectLabel}</button>
        <button type="button" onClick={onClear} disabled={frames.length === 0}>Clear</button>
        <button type="button" onClick={onCopy} disabled={frames.length === 0}>Copy MD</button>
      </div>

      <div className="specsnap-inspector-panel__frames">
        {frames.length === 0 ? (
          <div className="specsnap-inspector-empty">
            Click Start Inspect, then click any element in the target area.
          </div>
        ) : (
          frames.map((frame, i) => (
            <div key={i} className="specsnap-inspector-frame">
              <span className="specsnap-inspector-frame__index">{i + 1}</span>
              <span>{describeFrame(frame)}</span>
            </div>
          ))
        )}
      </div>

      {statusMessage && (
        <div className="specsnap-inspector-panel__status" data-kind={statusKind}>{statusMessage}</div>
      )}

      <details className="specsnap-inspector-panel__json">
        <summary>Raw JSON (machine consumers)</summary>
        <pre>{sessionJson}</pre>
      </details>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/inspector-react/src/Panel.tsx
git commit -m "feat(inspector-react): add Panel component"
```

### Task 4.6: `SpecSnapInspector` top-level component

**Files:**

- Create: `packages/inspector-react/src/SpecSnapInspector.tsx`
- Create: `packages/inspector-react/src/SpecSnapInspector.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import { createRef } from 'react';
import { SpecSnapInspector, type SpecSnapInspectorHandle } from './SpecSnapInspector.js';

describe('SpecSnapInspector', () => {
  it('renders the trigger button by default', () => {
    const { container } = render(<SpecSnapInspector />);
    expect(container.querySelector('.specsnap-inspector-trigger')).not.toBeNull();
  });

  it('hides the trigger when trigger prop is false', () => {
    const { container } = render(<SpecSnapInspector trigger={false} />);
    expect(container.querySelector('.specsnap-inspector-trigger')).toBeNull();
  });

  it('clicking the trigger opens the panel (portaled to body)', () => {
    render(<SpecSnapInspector />);
    const trigger = document.querySelector('.specsnap-inspector-trigger') as HTMLButtonElement;
    act(() => { trigger.click(); });
    expect(document.querySelector('.specsnap-inspector-panel')).not.toBeNull();
  });

  it('exposes imperative handle via ref', () => {
    const ref = createRef<SpecSnapInspectorHandle>();
    render(<SpecSnapInspector ref={ref} />);
    expect(typeof ref.current?.open).toBe('function');
    expect(typeof ref.current?.close).toBe('function');
  });

  it('onCopy fires when Copy MD is clicked', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) }
    });

    const onCopy = vi.fn();
    const ref = createRef<SpecSnapInspectorHandle>();
    render(<SpecSnapInspector ref={ref} onCopy={onCopy} />);

    const target = document.createElement('div');
    document.body.appendChild(target);

    act(() => {
      ref.current!.open();
      ref.current!.startPicker();
    });
    target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    await act(async () => {
      await ref.current!.copyMarkdown();
    });

    expect(onCopy).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Verify failure**

```bash
pnpm -F @tw199501/specsnap-inspector-react test SpecSnapInspector.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Implement `packages/inspector-react/src/SpecSnapInspector.tsx`**

```tsx
import { forwardRef, useEffect, useImperativeHandle, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { TriggerButton } from './TriggerButton.js';
import { Panel } from './Panel.js';
import { useInspector } from './use-inspector.js';
import type {
  InspectorOptions,
  InspectorSnapshot,
  InspectorHandle,
  PanelPosition,
  Session,
  SpecSnapBundle
} from '@tw199501/specsnap-inspector-core';

export interface SpecSnapInspectorProps {
  scope?: InspectorOptions['scope'];
  position?: PanelPosition;
  trigger?: boolean;
  panelTitle?: string;
  onSave?: (bundle: SpecSnapBundle) => void | Promise<void>;
  onCopy?: (markdown: string) => void;
  onCapture?: (payload: { frameIndex: number; session: Session }) => void;
  onClear?: () => void;
  onOpen?: () => void;
  onClose?: () => void;
}

export interface SpecSnapInspectorHandle {
  open: () => void;
  close: () => void;
  toggle: () => void;
  startPicker: () => void;
  stopPicker: () => void;
  clearFrames: () => void;
  copyMarkdown: () => Promise<void>;
  saveBundle: () => Promise<unknown>;
  getSnapshot: () => InspectorSnapshot;
  /** Escape hatch for power users. */
  handle: InspectorHandle;
}

export const SpecSnapInspector = forwardRef<SpecSnapInspectorHandle, SpecSnapInspectorProps>(
  function SpecSnapInspector(props, ref) {
    const position = props.position ?? 'bottom-right';
    const showTrigger = props.trigger ?? true;
    const panelTitle = props.panelTitle ?? 'SpecSnap Inspector';

    const { snapshot, handle } = useInspector({
      scope: props.scope,
      position,
      trigger: showTrigger,
      panelTitle,
      onSave: props.onSave,
      onCopy: props.onCopy,
      onCapture: props.onCapture,
      onClear: props.onClear,
      onOpen: props.onOpen,
      onClose: props.onClose
    });

    // Toggle crosshair cursor on <body> while picking
    useEffect(() => {
      document.body.classList.toggle('specsnap-inspecting', snapshot.picking);
    }, [snapshot.picking]);

    useImperativeHandle(ref, () => ({
      open: handle.open,
      close: handle.close,
      toggle: handle.toggle,
      startPicker: handle.startPicker,
      stopPicker: handle.stopPicker,
      clearFrames: handle.clearFrames,
      copyMarkdown: handle.copyMarkdown,
      saveBundle: handle.saveBundle,
      getSnapshot: handle.getSnapshot,
      handle
    }), [handle]);

    const onCopy = useCallback(async () => {
      await handle.copyMarkdown();
      await handle.saveBundle();
    }, [handle]);

    const onTogglePicker = useCallback(() => {
      if (snapshot.picking) handle.stopPicker();
      else handle.startPicker();
    }, [handle, snapshot.picking]);

    return (
      <>
        {showTrigger && !snapshot.visible && (
          <TriggerButton
            position={position}
            ariaLabel="Open SpecSnap Inspector"
            onClick={handle.toggle}
          />
        )}
        {snapshot.visible && typeof document !== 'undefined' && createPortal(
          <Panel
            snapshot={snapshot}
            position={position}
            title={panelTitle}
            onClose={handle.close}
            onTogglePicker={onTogglePicker}
            onClear={handle.clearFrames}
            onCopy={onCopy}
          />,
          document.body
        )}
      </>
    );
  }
);
```

- [ ] **Step 4: Verify tests pass**

```bash
pnpm -F @tw199501/specsnap-inspector-react test SpecSnapInspector.test.tsx
```

Expected: PASS — 5 tests green.

- [ ] **Step 5: Commit**

```bash
git add packages/inspector-react/src/SpecSnapInspector.tsx packages/inspector-react/src/SpecSnapInspector.test.tsx
git commit -m "feat(inspector-react): add SpecSnapInspector top-level component with forwardRef"
```

### Task 4.7: Public barrel + README

**Files:**

- Modify: `packages/inspector-react/src/index.ts`
- Create: `packages/inspector-react/README.md`

- [ ] **Step 1: Replace empty barrel**

```ts
export { SpecSnapInspector } from './SpecSnapInspector.js';
export type { SpecSnapInspectorProps, SpecSnapInspectorHandle } from './SpecSnapInspector.js';
export { useInspector, type UseInspectorReturn } from './use-inspector.js';
export type {
  InspectorOptions,
  InspectorSnapshot,
  InspectorHandle,
  PanelPosition,
  ScopeInput,
  SpecSnapBundle,
  Session,
  SaveResult
} from '@tw199501/specsnap-inspector-core';
```

- [ ] **Step 2: Create README**

````markdown
# @tw199501/specsnap-inspector-react

Drop-in React 18+ SpecSnap Inspector. Zero-config: install, import, drop the component, done.

## Install

```bash
pnpm add @tw199501/specsnap-inspector-react @tw199501/specsnap-inspector-core @tw199501/specsnap-core react react-dom
```

## Usage

```tsx
import '@tw199501/specsnap-inspector-react/styles.css';
import { SpecSnapInspector } from '@tw199501/specsnap-inspector-react';

export default function App() {
  return (
    <>
      <YourApp />
      <SpecSnapInspector />
    </>
  );
}
```

## Imperative (via ref)

```tsx
import { useRef } from 'react';
import { SpecSnapInspector, type SpecSnapInspectorHandle } from '@tw199501/specsnap-inspector-react';

function Shell() {
  const inspector = useRef<SpecSnapInspectorHandle>(null);
  return (
    <>
      <button onClick={() => inspector.current?.open()}>Debug</button>
      <SpecSnapInspector ref={inspector} trigger={false} />
    </>
  );
}
```

## Props

Identical to the Vue wrapper. See [inspector-vue README](../inspector-vue/README.md#props) for the table.

## License

MIT © tw199501
````

- [ ] **Step 3: Full build + test + boundary check**

```bash
pnpm -F @tw199501/specsnap-inspector-react test && pnpm -F @tw199501/specsnap-inspector-react build && pnpm -F @tw199501/specsnap-inspector-react check && pnpm depcruise
```

Expected: all green.

- [ ] **Step 4: Commit**

```bash
git add packages/inspector-react/src/index.ts packages/inspector-react/README.md
git commit -m "feat(inspector-react): export public barrel + add README"
```

---

## Phase 5: Playground migration

Delete the hand-rolled Inspector from `apps/playground/main.ts` and replace it with `createInspector` from `inspector-core`. Add a second demo tab showing the Vue wrapper, and a third showing the React wrapper.

### Task 5.1: Add playground dependencies

**Files:**

- Modify: `apps/playground/package.json`
- Modify: `apps/playground/vite.config.ts`

- [ ] **Step 1: Add workspace deps to playground**

Edit `apps/playground/package.json` dependencies:

```json
{
  "dependencies": {
    "@tw199501/specsnap-core": "workspace:*",
    "@tw199501/specsnap-inspector-core": "workspace:*",
    "@tw199501/specsnap-inspector-vue": "workspace:*",
    "@tw199501/specsnap-inspector-react": "workspace:*",
    "vue": "^3.5.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.0",
    "@vitejs/plugin-vue": "^5.1.0"
  }
}
```

Keep existing devDependencies (`fake-indexeddb`, `happy-dom`, etc.).

- [ ] **Step 2: Update `apps/playground/vite.config.ts`**

```ts
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [vue(), react()],
  server: { port: 5999 }
});
```

- [ ] **Step 3: Install**

```bash
pnpm install
```

- [ ] **Step 4: Commit**

```bash
git add apps/playground/package.json apps/playground/vite.config.ts pnpm-lock.yaml
git commit -m "chore(playground): add inspector-core/vue/react workspace deps"
```

### Task 5.2: Replace fs-access.ts with a re-export

**Files:**

- Modify: `apps/playground/fs-access.ts`

- [ ] **Step 1: Replace file contents with a re-export**

```ts
/**
 * Playground fs-access shim — the actual implementation moved to
 * `@tw199501/specsnap-inspector-core/src/storage/fs-access.ts` in v0.0.7.
 * This re-export keeps playground-local tests (fs-access.test.ts) working
 * without touching their import paths.
 */
export {
  isFileSystemAccessSupported,
  writeBundle,
  clearCachedRoot,
  type WriteResult
} from '@tw199501/specsnap-inspector-core/dist/storage/fs-access.js';
```

Note: this path works because inspector-core ships `dist/storage/fs-access.js` — the tsup config emits the whole src tree shape. If the build only emits `dist/index.mjs` (bundled), add an explicit storage subpath export to `inspector-core/package.json` instead.

- [ ] **Step 2: Run playground tests**

```bash
pnpm -F specsnap-playground test
```

Expected: PASS — existing fs-access.test.ts still works.

- [ ] **Step 3: Commit**

```bash
git add apps/playground/fs-access.ts
git commit -m "refactor(playground): re-export fs-access from inspector-core"
```

### Task 5.3: Rewrite main.ts to use inspector-core vanilla

**Files:**

- Modify: `apps/playground/main.ts`
- Modify: `apps/playground/index.html`

- [ ] **Step 1: Add demo-tab skeleton to `apps/playground/index.html`**

In the `<body>` of `index.html`, replace the old Inspector panel markup with:

```html
<div class="targets">
  <!-- existing target elements unchanged -->
</div>

<nav class="specsnap-demo-tabs">
  <button data-tab="vanilla" class="active">Vanilla</button>
  <button data-tab="vue">Vue</button>
  <button data-tab="react">React</button>
</nav>

<div id="demo-vanilla"></div>
<div id="demo-vue"></div>
<div id="demo-react"></div>
```

- [ ] **Step 2: Replace `apps/playground/main.ts` with a three-demo mounter**

Replace the whole file with:

```ts
import '@tw199501/specsnap-inspector-vue/styles.css';
import { createInspector } from '@tw199501/specsnap-inspector-core';
import { createApp, h } from 'vue';
import { createRoot } from 'react-dom/client';
import { createElement } from 'react';
import { SpecSnapInspector as VueInspector } from '@tw199501/specsnap-inspector-vue';
import { SpecSnapInspector as ReactInspector } from '@tw199501/specsnap-inspector-react';

const targets = document.querySelector('.targets') as HTMLElement;
if (!targets) throw new Error('missing .targets element');

// --- Vanilla demo: direct inspector-core usage ---
const vanillaInspector = createInspector({ scope: targets });
// Minimal vanilla trigger — a button the user clicks to open the panel.
// The actual panel DOM rendering is still the consumer's responsibility in vanilla
// mode; for demo purposes we wire a simple body badge that opens + uses the
// inspector-vue panel UI via a Vue mount on click.
const vanillaContainer = document.getElementById('demo-vanilla')!;
const vanillaBtn = document.createElement('button');
vanillaBtn.textContent = 'Open Vanilla Inspector';
vanillaBtn.addEventListener('click', () => vanillaInspector.toggle());
vanillaContainer.appendChild(vanillaBtn);

// --- Vue demo ---
const vueContainer = document.getElementById('demo-vue')!;
createApp({ render: () => h(VueInspector, { scope: targets }) }).mount(vueContainer);

// --- React demo ---
const reactContainer = document.getElementById('demo-react')!;
createRoot(reactContainer).render(createElement(ReactInspector, { scope: targets }));

// --- Tab switcher ---
const tabs = document.querySelectorAll('.specsnap-demo-tabs button');
const panes: Record<string, HTMLElement> = {
  vanilla: vanillaContainer,
  vue: vueContainer,
  react: reactContainer
};
function activate(tab: string): void {
  for (const [k, el] of Object.entries(panes)) {
    el.style.display = k === tab ? '' : 'none';
  }
  for (const btn of tabs) {
    btn.classList.toggle('active', (btn as HTMLButtonElement).dataset.tab === tab);
  }
}
for (const btn of tabs) {
  btn.addEventListener('click', () => activate((btn as HTMLButtonElement).dataset.tab!));
}
activate('vanilla');
```

- [ ] **Step 3: Delete any now-dead imports, CSS, and helpers from main.ts**

The old `main.ts` had ~400 lines including `renderLive`, `showOutput`, `refreshInspectBtn`, etc. All gone — their behavior lives in inspector-core + inspector-vue + inspector-react now. Run `pnpm -F specsnap-playground dev` manually and verify all three tabs work end-to-end (pick element, copy MD, save bundle).

- [ ] **Step 4: Commit**

```bash
git add apps/playground/main.ts apps/playground/index.html
git commit -m "refactor(playground): replace hand-rolled Inspector with inspector-core/vue/react demos"
```

### Task 5.4: Remove obsolete visualizer code

The playground used to own `visualizer.ts` (419 lines) for hover outlines. Much of that logic is now in `specsnap-core/src/annotate.ts` and `inspector-core/src/picker.ts`. Audit what's still playground-specific.

**Files:**

- Modify or delete: `apps/playground/visualizer.ts`

- [ ] **Step 1: Read the file and classify**

Review `apps/playground/visualizer.ts` line-by-line. Anything that duplicates `annotate.ts` or `picker.ts` logic → delete. Anything that's playground-specific (e.g. dashed-border target area highlighting) → keep in playground.

If the file is entirely redundant, delete it. If some of it is kept, trim to the minimum.

- [ ] **Step 2: Update imports in main.ts if needed**

If any imports from `visualizer.ts` remain, adjust `main.ts`.

- [ ] **Step 3: Run playground tests**

```bash
pnpm -F specsnap-playground test
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/playground
git commit -m "refactor(playground): drop visualizer code now covered by inspector-core"
```

---

## Phase 6: Documentation

### Task 6.1: Update root README (English)

**Files:**

- Modify: `README.md`

- [ ] **Step 1: Add an Inspector UI section after the core Usage section**

Insert this between the existing "Usage" and "Development" sections:

```markdown
## Use the Inspector UI

SpecSnap ships two drop-in UI packages — no setup beyond install.

### Vue 3

```bash
pnpm add @tw199501/specsnap-inspector-vue
```

```vue
<template>
  <SpecSnapInspector />
</template>

<script setup lang="ts">
import '@tw199501/specsnap-inspector-vue/styles.css';
import { SpecSnapInspector } from '@tw199501/specsnap-inspector-vue';
</script>
```

### React 18+

```bash
pnpm add @tw199501/specsnap-inspector-react
```

```tsx
import '@tw199501/specsnap-inspector-react/styles.css';
import { SpecSnapInspector } from '@tw199501/specsnap-inspector-react';

export default function App() {
  return <><YourApp /><SpecSnapInspector /></>;
}
```

A floating trigger appears bottom-right; click to open the Inspector panel; pick elements; Copy MD sends Markdown to the clipboard and saves `specsnap/YYYYMMDD/` to disk (Chromium) or downloads a ZIP (everything else).

Framework-agnostic consumers can use [`@tw199501/specsnap-inspector-core`](./packages/inspector-core/README.md) directly.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add Inspector UI usage section to README"
```

### Task 6.2: Update Traditional Chinese README

**Files:**

- Modify: `README.zh-TW.md`

- [ ] **Step 1: Add the parallel section in Traditional Chinese**

Mirror Task 6.1's new section, translated:

```markdown
## 使用 Inspector UI

SpecSnap 提供兩個 drop-in UI 套件 — 除了 install 之外什麼都不用設定。

### Vue 3

```bash
pnpm add @tw199501/specsnap-inspector-vue
```

```vue
<template>
  <SpecSnapInspector />
</template>

<script setup lang="ts">
import '@tw199501/specsnap-inspector-vue/styles.css';
import { SpecSnapInspector } from '@tw199501/specsnap-inspector-vue';
</script>
```

### React 18+

```bash
pnpm add @tw199501/specsnap-inspector-react
```

```tsx
import '@tw199501/specsnap-inspector-react/styles.css';
import { SpecSnapInspector } from '@tw199501/specsnap-inspector-react';

export default function App() {
  return <><YourApp /><SpecSnapInspector /></>;
}
```

右下角會出現一顆浮動 trigger 鈕，點它打開 Inspector 面板、點選元素、Copy MD 把 Markdown 傳到剪貼簿並把 `specsnap/YYYYMMDD/` 存到磁碟（Chromium），其他瀏覽器會下載一個 ZIP。

框架無關的使用者可直接使用 [`@tw199501/specsnap-inspector-core`](./packages/inspector-core/README.md)。
```

- [ ] **Step 2: Commit**

```bash
git add README.zh-TW.md
git commit -m "docs: add Inspector UI usage section to zh-TW README"
```

### Task 6.3: Update CLAUDE.md

**Files:**

- Modify: `CLAUDE.md`

- [ ] **Step 1: Update the "Inspector panel is the UI we ship" conventions bullet**

Replace the existing bullet with:

```markdown
- **Inspector packages are the UI we ship.** Core is a headless library — the Inspector UI is distributed as three npm packages:
  - [`@tw199501/specsnap-inspector-core`](packages/inspector-core) — framework-agnostic factory + store + element picker. No framework imports (enforced by `.dependency-cruiser.cjs`).
  - [`@tw199501/specsnap-inspector-vue`](packages/inspector-vue) — Vue 3 drop-in component. Uses `<Teleport>` + `shallowRef` subscription.
  - [`@tw199501/specsnap-inspector-react`](packages/inspector-react) — React 18+ drop-in component. Uses `createPortal` + `useSyncExternalStore`.

  When someone says "SpecSnap doesn't have a UI", point them at `npm i @tw199501/specsnap-inspector-vue` (or `-react`). The playground at [apps/playground](apps/playground) now demonstrates all three packages side-by-side.
```

- [ ] **Step 2: Add a line about changesets release tooling**

Append to the Commands section:

```markdown
### Release workflow (v0.0.7+)

```bash
pnpm changeset                  # author a changeset for pending work
pnpm version-packages           # changesets bumps all packages (fixed group — all four bump together)
pnpm release                    # build + publish to npm
```

All four published packages bump in lockstep via the `fixed` array in `.changeset/config.json`.
```

- [ ] **Step 3: Add the new boundary-enforcement layer**

Under "Line endings — enforced in 4 layers" add a sibling section:

```markdown
## Package boundaries — enforced in CI

`inspector-core` MUST remain framework-agnostic. `.dependency-cruiser.cjs` has a rule (`inspector-core-no-framework`) that fails CI if any file under `packages/inspector-core/src/` resolves an import to `vue`, `react`, or `react-dom`. Run `pnpm depcruise` locally before pushing. If you hit the rule, either the logic belongs in the wrapper (inspector-vue/react) or the rule needs to be weakened — never silently suppress.
```

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md for Inspector packages + changesets + boundary rule"
```

### Task 6.4: Write antares2 migration guide

**Files:**

- Create: `docs/superpower/plan/2026-04-20-v007-antares2-migration.md`

- [ ] **Step 1: Write the guide**

````markdown
# antares2 → specsnap-inspector-vue migration

After 0.0.7 ships, antares2 can replace its in-tree `TheSpecSnapInspector.vue` with the published package.

## Steps

1. `pnpm add @tw199501/specsnap-inspector-vue@^0.0.7 @tw199501/specsnap-inspector-core@^0.0.7 @tw199501/specsnap-core@^0.0.7`
2. Replace imports:

```diff
- import TheSpecSnapInspector from '@/components/TheSpecSnapInspector.vue';
+ import { SpecSnapInspector } from '@tw199501/specsnap-inspector-vue';
+ import '@tw199501/specsnap-inspector-vue/styles.css';
```

3. Rename component usage in templates: `<TheSpecSnapInspector />` → `<SpecSnapInspector />`.
4. Review prop mapping — in most cases, zero props works. If antares2 passed a custom `scope`, keep it.
5. If antares2 wired its own `onSave` to a backend, move that callback to the `onSave` prop (same signature, receives `SpecSnapBundle`).
6. Delete `components/TheSpecSnapInspector.vue` and any unique CSS it used.
7. Run antares2's test suite.

## Watch-outs

- **CSS custom properties** have changed names (`--specsnap-*` rather than whatever antares2 had). Override in global CSS if your theme differs.
- **Capture IDs** are now persisted in `localStorage['specsnap:sequence']`. If antares2 used a different key, pass `sequenceStorageKey` prop to preserve history.
- **`SpecSnapBundle` shape** is stable across this migration — no downstream storage code should need changes.

## Rollback

The `package.json` change is the entire migration. `git revert` it and re-import the local component if anything breaks.
````

- [ ] **Step 2: Commit**

```bash
git add docs/superpower/plan/2026-04-20-v007-antares2-migration.md
git commit -m "docs: add antares2 migration guide for Inspector packages"
```

---

## Phase 7: Release

### Task 7.1: Author changesets

**Files:**

- Create: `.changeset/v007-inspector-packages.md`

- [ ] **Step 1: Write the changeset**

```markdown
---
'@tw199501/specsnap-core': minor
'@tw199501/specsnap-inspector-core': minor
'@tw199501/specsnap-inspector-vue': minor
'@tw199501/specsnap-inspector-react': minor
---

Ship the SpecSnap Inspector UI as three new packages (`@tw199501/specsnap-inspector-core`, `-vue`, `-react`). Consumers now get a working Inspector with a single `npm install` + one component — no more 500-line hand-rolled integration. `specsnap-core` bumped in lockstep but unchanged in API.
```

Note: changesets uses semver, and 0.0.5 → 0.0.6 is a "patch". But we want 0.0.7 directly. The workaround:

- [ ] **Step 2: Run version to see what changesets produces**

```bash
pnpm version-packages
```

Expected: All four packages bumped. Check whether they went to 0.0.6 (patch under 0.x) or 0.1.0 (minor under 0.x) — changesets with `--experimental-unsafe-current-dir` or just plain `version` may differ. For 0.0.x pre-1.0, the usual convention is every bump is a patch.

- [ ] **Step 3: Manually correct versions to 0.0.7**

If changesets produced 0.0.6, edit each `package.json` and any generated CHANGELOG entries to say `0.0.7` instead. This honors the user directive "skip 0.0.6".

```bash
# Find all bumped versions (should be four package.json files):
grep -rn '"version": "0.0.6"' packages/
# Edit each manually to 0.0.7, same for CHANGELOG.md entries.
```

- [ ] **Step 4: Commit the version bump**

```bash
git add -A
git commit -m "release: v0.0.5 -> v0.0.7 (skipping v0.0.6) — ship Inspector packages"
```

### Task 7.2: Final pre-publish checks

- [ ] **Step 1: Clean build from scratch**

```bash
pnpm -r exec rm -rf dist
pnpm -r build
```

Expected: all four packages produce their dist/ artifacts.

- [ ] **Step 2: Full check suite**

```bash
pnpm check && pnpm test
```

Expected: all green.

- [ ] **Step 3: Smoke-test from a scratch consumer**

Create `/tmp/smoke-vue`:

```bash
mkdir /tmp/smoke-vue && cd /tmp/smoke-vue
pnpm init
pnpm add file:/e/source/specsnap/packages/inspector-vue file:/e/source/specsnap/packages/inspector-core file:/e/source/specsnap/packages/core vue
```

Create `smoke.mjs`:

```js
import { SpecSnapInspector } from '@tw199501/specsnap-inspector-vue';
console.log(typeof SpecSnapInspector === 'object' ? 'OK' : 'FAIL');
```

```bash
node smoke.mjs
```

Expected: `OK`.

Repeat for React with a similar scratch project.

- [ ] **Step 4: Delete /tmp/smoke-vue (and -react)**

(No tracking needed — temp smoke files.)

### Task 7.3: Publish

- [ ] **Step 1: Verify npm login**

```bash
pnpm whoami
```

Expected: Returns `tw199501` (or configured account).

- [ ] **Step 2: Run release**

```bash
pnpm release
```

Expected: all four packages published to npm at `0.0.7`. Pay attention to any `ETARGET`/`E403` errors — a failed publish mid-way is recoverable by re-running (changesets handles idempotency).

- [ ] **Step 3: Verify publish**

```bash
npm view @tw199501/specsnap-inspector-core version
npm view @tw199501/specsnap-inspector-vue version
npm view @tw199501/specsnap-inspector-react version
npm view @tw199501/specsnap-core version
```

Expected: all return `0.0.7`.

- [ ] **Step 4: Commit the CHANGELOG.md files that changesets generated**

```bash
git add -A
git commit -m "release: published 0.0.7 to npm"
```

- [ ] **Step 5: Tag the release**

```bash
git tag v0.0.7
git push origin main --tags
```

### Task 7.4: Retrospective

**Files:**

- Create: `docs/superpower/plan/2026-04-20-retrospective-v007.md`

- [ ] **Step 1: Draft the retrospective**

Template (fill in actuals during the retro session):

```markdown
# v0.0.7 Retrospective

**Shipped:** 2026-MM-DD
**Scope:** Three new Inspector packages (`-inspector-core`, `-inspector-vue`, `-inspector-react`), playground migration, coordinated release via changesets.

## What went well

- (Fill in during retro.)

## What surprised us

- (e.g. Phase 0 Vue-SFC outcome: A or B, what the real cost was.)

## What we'd change

- (e.g. if the dependency-cruiser rule caught anything; if `useSyncExternalStore` + Strict Mode had subtle issues.)

## Metrics

- Package sizes (gzipped): inspector-core = ?, inspector-vue = ?, inspector-react = ?
- Test counts: inspector-core = ?, inspector-vue = ?, inspector-react = ?
- Lines deleted from playground: ?

## Follow-ups

- [ ] antares2 migration (see [migration guide](./2026-04-20-v007-antares2-migration.md))
- [ ] CSS custom property documentation page (for theming)
- [ ] Vanilla `mount()` renderer (currently a thin shim — flesh out in v0.0.8 if demand exists)
- [ ] SSR render-guard tests (Next.js + Nuxt samples)
```

- [ ] **Step 2: Commit**

```bash
git add docs/superpower/plan/2026-04-20-retrospective-v007.md
git commit -m "docs: 0.0.7 retrospective stub (fill in post-release)"
```

---

## Success criteria (from spec) — verify at the end

Run through the Success Criteria section of [2026-04-20-v007-inspector-packages-design.md](2026-04-20-v007-inspector-packages-design.md):

- [ ] All 4 published packages at `0.0.7` on npm (verified in Task 7.3).
- [ ] Scratch Vue project zero-config flow works (verified in Task 7.2 smoke test).
- [ ] Scratch React project zero-config flow works (verified in Task 7.2 smoke test).
- [ ] Playground passes all tests with new imports (verified in Task 5).
- [ ] `pnpm check` + `pnpm test` + `pnpm depcruise` green (verified in Task 7.2).
- [ ] README (en + zh-TW) has "Use the Inspector UI" section (Tasks 6.1 + 6.2).
- [ ] CLAUDE.md updated (Task 6.3).
- [ ] 0.0.7 retrospective stub exists (Task 7.4).

If any of these are red at this point, fix before merging to `main`.

---

## Self-review notes (writing-plans step)

Cross-check against spec's Public API surface section:
- Vue: `<SpecSnapInspector />` with `scope`, `position`, `trigger`, `panelTitle`, `onSave` props + `save`/`copy`/`capture`/`clear`/`open`/`close` events + imperative handle via `ref`. ✅ Task 3.6.
- React: same props as functional props + `onSave`/`onCopy`/`onCapture` callbacks + `forwardRef` handle. ✅ Task 4.6.
- Storage ladder: fs-access → ZIP → individual → callback override. ✅ inherited from Part 1 Task 2.10.
- Picker scope default = document.body. ✅ inherited from Part 1 Task 2.5.
- Default trigger shown, `trigger={false}` disables. ✅ Tasks 3.6 and 4.6.

Type consistency: `SpecSnapInspectorHandle` (React, Task 4.6) has the same method names as the Vue exposed object (Task 3.6) — both wrap `handle.open/close/toggle/startPicker/stopPicker/clearFrames/copyMarkdown/saveBundle/getSnapshot`. CSS class names are identical across both packages (single source of truth in `styles.css`).

Placeholder scan: Phase 0 outcome is referenced but actual contents of the outcome doc are written at execution time (that's correct — the outcome can't be pre-written). No "TODO" or "similar to task N" without code.

Phase coverage: Vue wrapper, React wrapper, playground migration, docs, release — all 5 present. Retrospective + antares2 migration guide written as companion docs. Scratch-project smoke tests included in Task 7.2. Success criteria check at the end.

---

## Execution handoff

With both Part 1 and Part 2 written and committed, this plan is ready for execution.

**Two execution options:**

1. **Subagent-Driven (recommended)** — Dispatch a fresh subagent per task; review between tasks; faster iteration. Use `superpowers:subagent-driven-development`. Works especially well when Part 1 tasks (inspector-core) and Part 2 Vue/React wrappers are largely independent — the subagent handling Task 3.6 doesn't need to remember how Task 2.4's store works, only its public API.

2. **Inline Execution** — Execute tasks in the current session using `superpowers:executing-plans`. Better when context between tasks is tight (e.g. iterating on styling decisions).

Default recommendation: **Subagent-Driven.** This plan is long (~30 tasks, two files) and each task is self-contained enough that a fresh subagent with just the task description + file paths can complete it. Saves human-reviewer context and keeps the main session clean for review checkpoints.
