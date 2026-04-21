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
    await fetch('/api/specsnap', { method: 'POST', body: bundle.markdownContent });
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
