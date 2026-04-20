# @tw199501/specsnap-core

[English](./README.md) · [繁體中文](./README.zh-TW.md)

> Core capture and serialization library for [SpecSnap](https://github.com/tw199501/specsnap) — the AI-friendly DOM inspector.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![npm](https://img.shields.io/npm/v/@tw199501/specsnap-core.svg)](https://www.npmjs.com/package/@tw199501/specsnap-core)

## Install

```bash
pnpm add @tw199501/specsnap-core
# or
npm install @tw199501/specsnap-core
# or
yarn add @tw199501/specsnap-core
```

## Usage

### Minimal — pure text markdown + JSON

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

### Full bundle — markdown + per-frame annotated PNGs

```ts
import { toSpecSnapBundle } from '@tw199501/specsnap-core';

const bundle = await toSpecSnapBundle(session, { sequence: 1 });

// bundle.dirName            → "20260420"
// bundle.captureId          → "20260420-01"
// bundle.markdownFilename   → "20260420-01.md"
// bundle.markdownContent    → MD text with ![Frame N](./20260420-01-N.png) refs
// bundle.images             → [{ filename, blob }, ...]  one PNG per frame

// Write to disk however your environment allows (Chrome extension / Tauri / FSA API).
```

The markdown inside `bundle.markdownContent` references each PNG by **relative path**, so if you save the MD + PNGs together in one folder, the MD renders as a rich document with inline images in VS Code / Typora / GitHub previews. AI-chat consumers read the MD text and receive the PNGs as separate attachments — no base64 bloat, no broken references.

## What you get per session

- **Viewport** (mandatory) — `width`, `height`, `devicePixelRatio`. Every coordinate in the session is interpretable against this reference.
- **Scroll** — `{ x, y }` at capture time.
- **Gaps** — every consecutive pair of frames that shares an axis produces a `Gap { from, to, axis, px }` entry. AI sees spacing as structured data, not just visual.

## What you get per frame

Every captured element produces a `Frame` object containing:

- **Box model** — `content`, `padding`, `border`, `margin` as 4-side tuples `[top, right, bottom, left]`
- **Typography** — `fontFamily`, `fontSize`, `fontWeight`, `lineHeight`, `letterSpacing`, `color`, `textAlign`
- **Background** — `color`, `image`, `borderRadius` (per-corner)
- **Identity** — `tagName`, `id`, `classList`, semantic `name` (e.g. `button#save`), unique `domPath` with `:nth-of-type()` disambiguation, optional `i18nKey` (when `data-i18n-key` is present), optional `source` (when `data-v-source` is present)
- **Position** — document-relative absolute `rect` + viewport-relative `{ xPct, yPct }`
- **Bilingual annotations** in Markdown — inline pairs: `120 (寬度) × 34 (高度) px`, `padding: 4 / 12 / 4 / 12 (上/右/下/左) (內邊距)`

## API

### Capture

#### `captureElement(el: Element, index: number): Frame`

Capture a single DOM element. Throws if the element is not attached to the document.

#### `captureSession(elements: readonly Element[]): Session`

Capture 1..N elements into a session with shared viewport context, timestamp, URL, and session id. The session builder also computes `gaps` between consecutive frames.

### Serialization

#### `toMarkdown(session: Session, options?: SerializeOptions): string[]`

Produce one Markdown document per frame. Each document has YAML frontmatter (viewport, session id, etc.) + structured body.

Options:
- `lexiconOverride?: Record<string, string>` — replace or extend the default bilingual lexicon. Keys must be lowercased CSS property names.
- `imageFilenames?: readonly string[]` — when provided, each frame gets a `![Frame N](./<filename>)` relative-path reference injected right after the frontmatter. Length should match `session.frames.length`.

#### `toJSON(session: Session, options?: SerializeOptions): string`

Produce a JSON string. Options:
- `pretty?: boolean` — default `true` (2-space indent). Pass `false` for compact output.

#### `toAnnotatedPNG(session: Session, options?: AnnotatedPngOptions): Promise<Blob[]>`

**Browser-only.** Render one annotated PNG per frame. Each PNG covers the session's bounding box (full visual context) but only the **focus frame** gets outline + badge + size label drawn; gap lines are preserved across all frames.

Internally dynamic-imports [`dom-to-image-more`](https://www.npmjs.com/package/dom-to-image-more), so consumers who only use `toMarkdown`/`toJSON` don't pay the bundle cost.

Options (all optional):
- `badges?: boolean` — default `true`
- `gaps?: boolean` — default `true`
- `sizeLabels?: boolean` — default `true`
- `format?: 'png' | 'jpeg'` — default `'png'`
- `quality?: number` — JPEG only, 0..1, default `0.92`
- `pixelRatio?: number` — default `session.viewport.devicePixelRatio`
- `padding?: number` — extra pixels around the session bbox, default `16`
- `background?: string` — fill for transparent regions, default `'#ffffff'`
- `filter?: (node: Node) => boolean` — exclude nodes (and subtrees) from the screenshot. Use this to hide your own UI chrome (panels, toolbars, live overlays) that would otherwise be captured.

#### `toSpecSnapBundle(session: Session, options?: SpecSnapBundleOptions): Promise<SpecSnapBundle>`

**Browser-only.** Convenience wrapper that produces a complete disk-ready bundle:

```ts
interface SpecSnapBundle {
  dirName: string;          // "20260420" — suggested subfolder name
  captureId: string;        // "20260420-01" — shared filename stem
  markdownFilename: string; // "20260420-01.md"
  markdownContent: string;  // MD with relative ./YYYYMMDD-NN-k.png refs
  images: {
    filename: string;       // "20260420-01-1.png"
    blob: Blob;
  }[];
}
```

Options:
- `sequence?: number` — which capture of the day (1..99). Default: `1`. **Consumer is responsible for tracking/incrementing** — typically via `localStorage` (browser) or a filesystem lookup (extension / Tauri).
- `date?: Date` — override the date portion. Default: `new Date()`.
- `dirName?: string` / `captureId?: string` — override the auto-generated names.
- All `AnnotatedPngOptions` (including `filter`) are accepted and forwarded to the PNG rendering.

**Naming convention** (fixed, not user-configurable within the bundle):
```
specsnap/
└── 20260420/                    ← dirName (YYYYMMDD)
    ├── 20260420-01.md           ← markdownFilename
    ├── 20260420-01-1.png        ← images[0].filename
    ├── 20260420-01-2.png
    └── 20260420-01-3.png
```

#### `buildAnnotationSvg(input, options?): SVGSVGElement`

Lower-level primitive used by `toAnnotatedPNG` and by the playground's live overlay. Builds a detached SVG from raw bounds — **coordinate-agnostic** (the caller decides whether bounds are viewport-relative or document-relative).

```ts
interface AnnotateInput {
  frames: readonly { index: number; bounds: { x, y, width, height } }[];
  gaps: readonly Gap[];
  canvas: { width: number; height: number };
}
interface AnnotateOptions {
  badges?: boolean;      // default true
  sizeLabels?: boolean;  // default true
  gaps?: boolean;        // default true
  focusFrame?: number;   // if set, only this frame gets outline/badge/label
}
```

### Helpers

#### `formatDateYYYYMMDD(date: Date): string`

Format a date as `YYYYMMDD` using local time. Zero-pads month and day.

#### `formatCaptureId(date: Date, sequence: number): string`

Compose a capture id: `` `${YYYYMMDD}-${NN}` ``. Sequence is clamped to the 1..99 range and zero-padded to 2 digits.

#### `annotate(property: string, override?: Record<string, string>): string`

Get the Chinese annotation for a CSS property. Returns `''` for unknown properties.

#### `DEFAULT_LEXICON`

The built-in bilingual lexicon — 56 CSS properties with Traditional Chinese translations. Frozen; extend via `SerializeOptions.lexiconOverride`.

## Consuming the bundle

Core returns data in memory — **writing to disk is the consumer's job**, because each environment has different capabilities:

| Environment | How to write the bundle |
| --- | --- |
| **Browser (`<a download>`)** | Trigger one download per file. Goes to the user's `Downloads/` folder; user manually moves to `specsnap/YYYYMMDD/`. Simplest but no path control. |
| **Browser (File System Access API)** | Ask user to pick a folder once via `window.showDirectoryPicker()`, persist the handle in IndexedDB, write files directly. Chrome / Edge 86+. |
| **Browser extension** | `chrome.downloads.download({ filename: 'specsnap/20260420/…' })` writes into user's Downloads with a subdirectory — no prompt. |
| **Tauri / Electron** | Full filesystem via Node `fs` or Tauri's `@tauri-apps/api/fs`. Write wherever makes sense for the app. |

The playground app in this repo uses the `<a download>` approach as a reference implementation.

## Status

Pre-alpha (v0.0.x). Schema may change. Locking in at v1.0.

Shipped:
- `v0.0.1` — core capture, bilingual markdown, JSON
- `v0.0.2` — inter-element gap distances
- `v0.0.3` — `toAnnotatedPNG` per-frame PNG + `toSpecSnapBundle` disk-ready packaging + relative-path image refs in markdown
- `v0.0.4` — subpixel display polish (border rounding); playground gains File System Access API adapter so Copy MD writes into a user-picked folder instead of Downloads/
- `v0.0.5` **(current)** — `ElementIdentity.i18nKey` + `.source` read from `data-i18n-key` / `data-v-source` attributes when present; tag-triggered publish workflow draft. `SCHEMA_VERSION` bumps to `'0.0.5'`.

Roadmap:
- `v0.1.0+` — companion Vite plugin `@tw199501/specsnap-vite-plugin` that auto-injects `data-v-source` + `data-i18n-key` at build time. Pseudo-state capture, recursive children dump.

## License

[MIT](./LICENSE) © tw199501
