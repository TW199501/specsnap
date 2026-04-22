# @tw199501/specsnap-inspector-vue

Drop-in Vue 3 SpecSnap Inspector. Zero config: install, import, drop the component, get a working element inspector with clipboard + bundle save.

## Install

```bash
pnpm add @tw199501/specsnap-inspector-vue
```

`vue` (>=3.3) is a peer — assumed to already be in your project.

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
