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

Identical to the Vue wrapper — see [inspector-vue README](../inspector-vue/README.md#props).

## License

MIT © tw199501
