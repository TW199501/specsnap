# @tw199501/specsnap-core

> Core capture and serialization library for [SpecSnap](https://github.com/tw199501/specsnap) — the AI-friendly DOM inspector.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

## Install

```bash
pnpm add @tw199501/specsnap-core
# or
npm install @tw199501/specsnap-core
# or
yarn add @tw199501/specsnap-core
```

## Usage

```ts
import { captureSession, toJSON, toMarkdown } from '@tw199501/specsnap-core';

// Capture one or more DOM elements into a structured session.
const elements = [
  document.querySelector('#save')!,
  document.querySelector('#username')!
];
const session = captureSession(elements);

// Markdown — ready to paste into Claude, ChatGPT, Cursor, etc.
const mdPerFrame = toMarkdown(session);
console.log(mdPerFrame.join('\n\n---\n\n'));

// JSON — for tool chains or programmatic pipelines.
const json = toJSON(session);
```

## What you get per session (beyond frames)

- **Gaps** — every consecutive pair of frames that shares an axis produces a `Gap { from, to, axis, px }` entry. AI sees spacing info as structured data, not visual-only.

## What you get per frame

Every captured element produces a `Frame` object containing:

- **Viewport context** — `width`, `height`, `devicePixelRatio`. Mandatory. Every session carries viewport because coordinates are meaningless without a reference frame.
- **Box model** — `content`, `padding`, `border`, `margin` as 4-side tuples `[top, right, bottom, left]`
- **Typography** — `fontFamily`, `fontSize`, `fontWeight`, `lineHeight`, `letterSpacing`, `color`, `textAlign`
- **Background** — `color`, `image`, `borderRadius` (per-corner)
- **Identity** — `tagName`, `id`, `classList`, semantic `name` (e.g. `Button[text="Save"]`), unique `domPath`
- **Position** — absolute + viewport-relative %
- **Bilingual annotations** in Markdown — English terms + 繁體中文 (`padding: 16 / 12 / 16 / 12 (上/右/下/左) (內邊距)`)

## API

### `captureElement(el: Element, index: number): Frame`

Capture a single DOM element. Throws if the element is not attached to the document.

### `captureSession(elements: readonly Element[]): Session`

Capture 1..N elements into a session with shared viewport context, timestamp, URL, and session id.

### `toMarkdown(session: Session, options?: SerializeOptions): string[]`

Produce one Markdown document per frame. Each document has YAML frontmatter (viewport, session id, etc.) + structured body.

Options:
- `lexiconOverride?: Record<string, string>` — replace or extend the default bilingual lexicon. Keys must be lowercased CSS property names.

### `toJSON(session: Session, options?: SerializeOptions): string`

Produce a JSON string. Options:
- `pretty?: boolean` — default `true` (2-space indent). Pass `false` for compact output.

### `annotate(property: string, override?: Record<string, string>): string`

Get the Chinese annotation for a CSS property. Returns `''` for unknown properties.

### `DEFAULT_LEXICON`

The built-in bilingual lexicon — 56 CSS properties with Traditional Chinese translations.

## Status

🚧 **Pre-alpha (v0.0.x).** Schema may change. Locking in at v1.0.

Planned for upcoming versions:
- `v0.0.2` **(current)** — inter-element gap distances in the session schema. See the "間距 (Gaps)" section in Markdown output.
- Later — `dom-to-image-more` integration for annotated screenshot export
- Later — component tree awareness (Vue / React)

## License

[MIT](./LICENSE) © tw199501
