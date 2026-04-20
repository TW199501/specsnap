# SpecSnap 0.0.3 — `toAnnotatedPNG` Core API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `toAnnotatedPNG(session, options?): Promise<Blob>` in `@tw199501/specsnap-core` — a screenshot API that renders the page with numbered badges and gap distance markers overlaid, so AI can consume "text + image" in one payload.

**Architecture:** Split into two modules:

1.  `annotate.ts` — pure, coord-agnostic SVG builder that takes `{ frames: [{index, bounds}], gaps }` and returns a detached `SVGSVGElement`. Shared between `toAnnotatedPNG` (document-coord) and the playground's live overlay (viewport-coord).
2.  `to-annotated-png.ts` — browser-only runtime API that computes a bounding box over the session, injects the SVG into DOM, invokes `dom-to-image-more` with a `transform`\-based crop, removes the SVG, returns a `Blob`.

Dependency `dom-to-image-more` is loaded via dynamic `import()` so consumers who only use `toMarkdown`/`toJSON` don't pay the bundle cost.

**Tech Stack:** TypeScript strict, tsup, vitest (happy-dom), pnpm workspace, `dom-to-image-more` ^3.x.

**Scope narrowed per user request ("先執行能截圖"):** Only Task 1 of the v0.0.3 roadmap (core API). Deferred to later passes:

*   Task 2 — `toMarkdown({ embedScreenshot: true })` base64 embedding
*   Task 4 — antares2 integration
*   `parentOutline` option (requires element refs alongside session — adds API surface)

---

## File Structure

**New files (core):**

*   `packages/core/src/annotate.ts` — pure SVG builder. Exports `buildAnnotationSvg`, `AnnotateInput`, `AnnotateOptions`.
*   `packages/core/src/annotate.test.ts` — SVG structure assertions (works in happy-dom).
*   `packages/core/src/to-annotated-png.ts` — `toAnnotatedPNG` API + helpers. Browser-only.
*   `packages/core/src/to-annotated-png.test.ts` — mocks `dom-to-image-more`; asserts SVG injection/cleanup + options handling + error paths.

**Modified files (core):**

*   `packages/core/src/types.ts` — add `AnnotatedPngOptions` interface.
*   `packages/core/src/index.ts` — add exports.
*   `packages/core/package.json` — add `dom-to-image-more` runtime dep; bump version to `0.0.3`.

**Modified files (playground):**

*   `apps/playground/visualizer.ts` — replace inline SVG drawing with call to `buildAnnotationSvg`, remove duplicated helpers.
*   `apps/playground/main.ts` — wire download button.
*   `apps/playground/index.html` — add `<button id="download-png">`.

---

### Task 1: Add `dom-to-image-more` dependency + smoke-import test

**Files:**

Modify: `packages/core/package.json`

 **Step 1: Add runtime dependency**

Edit `packages/core/package.json` — add `dependencies` field (currently missing, only `devDependencies` exists):

```
{
  "name": "@tw199501/specsnap-core",
  "version": "0.0.3",
  "...": "...",
  "dependencies": {
    "dom-to-image-more": "^3.5.0"
  },
  "devDependencies": {
    "...": "..."
  }
}
```

Also bump `"version": "0.0.2"` → `"version": "0.0.3"` in the same file.

*   **Step 2: Install**

Run from repo root: `pnpm install`
Expected: lockfile updates, `dom-to-image-more` appears in `packages/core/node_modules`.

*   **Step 3: Check whether types ship with the package**

Run: `ls packages/core/node_modules/dom-to-image-more/*.d.ts 2>&1 | head -5`

Two cases:

*   **If** `**.d.ts**` **files exist** → types ship with the package; no action needed.
*   **If no** `**.d.ts**` **exists** → add an ambient module declaration. Create `packages/core/src/dom-to-image-more.d.ts`:

```
declare module 'dom-to-image-more' {
  export interface Options {
    width?: number;
    height?: number;
    style?: Partial<CSSStyleDeclaration>;
    filter?: (node: Node) => boolean;
    bgcolor?: string;
    quality?: number;
    cacheBust?: boolean;
    imagePlaceholder?: string;
    pixelRatio?: number;
  }
  export function toBlob(node: Node, options?: Options): Promise<Blob>;
  export function toPng(node: Node, options?: Options): Promise<string>;
  export function toJpeg(node: Node, options?: Options): Promise<string>;
  export function toSvg(node: Node, options?: Options): Promise<string>;
  const _default: {
    toBlob: typeof toBlob;
    toPng: typeof toPng;
    toJpeg: typeof toJpeg;
    toSvg: typeof toSvg;
  };
  export default _default;
}
```

*   **Step 4: Verify type resolution**

Run: `pnpm -F @tw199501/specsnap-core check`
Expected: exits 0 (no type errors). `dom-to-image-more` isn't imported anywhere yet so this really just validates the config.

*   **Step 5: Commit**

```
git add packages/core/package.json pnpm-lock.yaml
# Also add dom-to-image-more.d.ts only if you created it in Step 3
git commit -m "chore(core): add dom-to-image-more runtime dep + bump to 0.0.3"
```

---

### Task 2: Scaffold `annotate.ts` — types + stub + first passing test

**Files:**

Create: `packages/core/src/annotate.ts`

Create: `packages/core/src/annotate.test.ts`

 **Step 1: Write the failing test**

Create `packages/core/src/annotate.test.ts`:

```
import { describe, expect, it } from 'vitest';

import { buildAnnotationSvg } from './annotate.js';

describe('buildAnnotationSvg', () => {
  it('returns an SVG element with the requested viewBox dimensions', () => {
    const svg = buildAnnotationSvg({
      frames: [],
      gaps: [],
      canvas: { width: 800, height: 600 }
    });
    expect(svg.tagName.toLowerCase()).toBe('svg');
    expect(svg.getAttribute('width')).toBe('800');
    expect(svg.getAttribute('height')).toBe('600');
  });
});
```

*   **Step 2: Run test to verify it fails**

Run: `pnpm -F @tw199501/specsnap-core exec vitest run src/annotate.test.ts`
Expected: FAIL with "Cannot find module './annotate.js'" or similar.

*   **Step 3: Write minimal implementation**

Create `packages/core/src/annotate.ts`:

```
import type { Gap } from './types.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

export interface AnnotateBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AnnotateFrameInput {
  index: number;
  bounds: AnnotateBounds;
}

export interface AnnotateInput {
  frames: readonly AnnotateFrameInput[];
  gaps: readonly Gap[];
  /** Width + height the returned SVG should declare. Caller's responsibility. */
  canvas: { width: number; height: number };
}

export interface AnnotateOptions {
  /** Draw numbered circular badge on each frame. Default: true. */
  badges?: boolean;
  /** Draw size labels (`WxH px`) above each frame. Default: true. */
  sizeLabels?: boolean;
  /** Draw gap distance markers between frames. Default: true. */
  gaps?: boolean;
}

/**
 * Build a detached SVG annotation layer. Coordinate-agnostic — caller decides
 * whether `bounds` are viewport-relative (for fixed overlays) or
 * document-relative (for PNG capture).
 *
 * The returned SVG is NOT yet attached to any document.
 */
export function buildAnnotationSvg(
  input: AnnotateInput,
  _options: AnnotateOptions = {}
): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg') as SVGSVGElement;
  svg.setAttribute('width', String(input.canvas.width));
  svg.setAttribute('height', String(input.canvas.height));
  svg.setAttribute('xmlns', SVG_NS);
  return svg;
}
```

*   **Step 4: Run test to verify it passes**

Run: `pnpm -F @tw199501/specsnap-core exec vitest run src/annotate.test.ts`
Expected: PASS (1 test).

*   **Step 5: Commit**

```
git add packages/core/src/annotate.ts packages/core/src/annotate.test.ts
git commit -m "feat(core): scaffold buildAnnotationSvg with canvas sizing"
```

---

### Task 3: `buildAnnotationSvg` — frame outlines + numbered badges

**Files:**

Modify: `packages/core/src/annotate.ts`

Modify: `packages/core/src/annotate.test.ts`

 **Step 1: Write failing tests**

Append to `packages/core/src/annotate.test.ts`:

```
describe('frame outlines', () => {
  it('draws one blue outline rect per frame at the given bounds', () => {
    const svg = buildAnnotationSvg({
      frames: [
        { index: 1, bounds: { x: 10, y: 20, width: 100, height: 40 } },
        { index: 2, bounds: { x: 200, y: 50, width: 80, height: 30 } }
      ],
      gaps: [],
      canvas: { width: 1000, height: 600 }
    });
    const rects = svg.querySelectorAll('rect[data-role="frame-outline"]');
    expect(rects.length).toBe(2);
    expect(rects[0]!.getAttribute('x')).toBe('10');
    expect(rects[0]!.getAttribute('y')).toBe('20');
    expect(rects[0]!.getAttribute('width')).toBe('100');
    expect(rects[0]!.getAttribute('height')).toBe('40');
    expect(rects[1]!.getAttribute('x')).toBe('200');
  });

  it('can disable outlines but keep badges', () => {
    const svg = buildAnnotationSvg(
      {
        frames: [{ index: 1, bounds: { x: 10, y: 20, width: 50, height: 50 } }],
        gaps: [],
        canvas: { width: 800, height: 600 }
      },
      { sizeLabels: false }
    );
    // outlines still present; size labels gone
    expect(svg.querySelectorAll('rect[data-role="frame-outline"]').length).toBe(1);
    expect(svg.querySelectorAll('[data-role="size-label"]').length).toBe(0);
  });
});

describe('numbered badges', () => {
  it('draws a circular badge with the frame index at top-left of the bounds', () => {
    const svg = buildAnnotationSvg({
      frames: [{ index: 3, bounds: { x: 100, y: 200, width: 60, height: 60 } }],
      gaps: [],
      canvas: { width: 800, height: 600 }
    });
    const badge = svg.querySelector('[data-role="badge"]');
    expect(badge).not.toBeNull();
    const text = svg.querySelector('[data-role="badge-text"]');
    expect(text?.textContent).toBe('3');
  });

  it('omits badges when options.badges === false', () => {
    const svg = buildAnnotationSvg(
      {
        frames: [{ index: 1, bounds: { x: 10, y: 10, width: 10, height: 10 } }],
        gaps: [],
        canvas: { width: 100, height: 100 }
      },
      { badges: false }
    );
    expect(svg.querySelectorAll('[data-role="badge"]').length).toBe(0);
  });
});
```

*   **Step 2: Run tests to verify they fail**

Run: `pnpm -F @tw199501/specsnap-core exec vitest run src/annotate.test.ts`
Expected: 4 new tests FAIL.

*   **Step 3: Implement frames + badges**

Replace `packages/core/src/annotate.ts` with:

```
import type { Gap } from './types.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

const STROKE_SELECTED = '#2563eb';
const FILL_SELECTED = '#2563eb';

export interface AnnotateBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AnnotateFrameInput {
  index: number;
  bounds: AnnotateBounds;
}

export interface AnnotateInput {
  frames: readonly AnnotateFrameInput[];
  gaps: readonly Gap[];
  canvas: { width: number; height: number };
}

export interface AnnotateOptions {
  badges?: boolean;
  sizeLabels?: boolean;
  gaps?: boolean;
}

export function buildAnnotationSvg(
  input: AnnotateInput,
  options: AnnotateOptions = {}
): SVGSVGElement {
  const showBadges = options.badges !== false;
  const showSizeLabels = options.sizeLabels !== false;

  const svg = el('svg', {
    width: input.canvas.width,
    height: input.canvas.height,
    xmlns: SVG_NS
  }) as SVGSVGElement;

  for (const frame of input.frames) {
    svg.appendChild(outlineRect(frame.bounds));
    if (showSizeLabels) appendSizeLabel(svg, frame.bounds);
    if (showBadges) appendBadge(svg, frame.index, frame.bounds);
  }

  return svg;
}

function outlineRect(b: AnnotateBounds): SVGElement {
  return el('rect', {
    'data-role': 'frame-outline',
    x: b.x,
    y: b.y,
    width: b.width,
    height: b.height,
    fill: 'none',
    stroke: STROKE_SELECTED,
    'stroke-width': 2
  });
}

function appendBadge(parent: SVGElement, n: number, b: AnnotateBounds): void {
  const cx = b.x - 10;
  const cy = b.y - 10;
  parent.appendChild(el('circle', {
    'data-role': 'badge',
    cx,
    cy,
    r: 10,
    fill: FILL_SELECTED,
    stroke: '#fff',
    'stroke-width': 2
  }));
  const t = el('text', {
    'data-role': 'badge-text',
    x: cx,
    y: cy + 3,
    fill: '#fff',
    'font-family': 'system-ui, sans-serif',
    'font-size': 11,
    'font-weight': 700,
    'text-anchor': 'middle'
  });
  t.textContent = String(n);
  parent.appendChild(t);
}

function appendSizeLabel(parent: SVGElement, b: AnnotateBounds): void {
  const text = `${Math.round(b.width)} × ${Math.round(b.height)} px`;
  const padX = 5;
  const approxW = text.length * 7;
  const bgX = b.x + b.width - approxW - padX * 2;
  const bgY = b.y - 14;
  parent.appendChild(el('rect', {
    'data-role': 'size-label-bg',
    x: bgX,
    y: bgY,
    width: approxW + padX * 2,
    height: 16,
    rx: 3,
    ry: 3,
    fill: FILL_SELECTED
  }));
  const t = el('text', {
    'data-role': 'size-label',
    x: b.x + b.width - padX,
    y: bgY + 12,
    fill: '#fff',
    'font-family': 'system-ui, sans-serif',
    'font-size': 11,
    'font-weight': 600,
    'text-anchor': 'end'
  });
  t.textContent = text;
  parent.appendChild(t);
}

function el(name: string, attrs: Record<string, string | number>): SVGElement {
  const node = document.createElementNS(SVG_NS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  return node;
}
```

*   **Step 4: Run tests to verify they pass**

Run: `pnpm -F @tw199501/specsnap-core exec vitest run src/annotate.test.ts`
Expected: all 5 tests PASS.

*   **Step 5: Commit**

```
git add packages/core/src/annotate.ts packages/core/src/annotate.test.ts
git commit -m "feat(core): annotate draws frame outlines + numbered badges + size labels"
```

---

### Task 4: `buildAnnotationSvg` — horizontal and vertical gap markers

**Files:**

Modify: `packages/core/src/annotate.ts`

Modify: `packages/core/src/annotate.test.ts`

 **Step 1: Write failing tests**

Append to `packages/core/src/annotate.test.ts`:

```
describe('gap markers', () => {
  it('draws a horizontal gap line between two side-by-side frames', () => {
    const svg = buildAnnotationSvg({
      frames: [
        { index: 1, bounds: { x: 0, y: 50, width: 100, height: 50 } },
        { index: 2, bounds: { x: 150, y: 50, width: 100, height: 50 } }
      ],
      gaps: [{ from: 1, to: 2, axis: 'horizontal', px: 50 }],
      canvas: { width: 400, height: 200 }
    });
    const gapLine = svg.querySelector('line[data-role="gap-main"]');
    expect(gapLine).not.toBeNull();
    // main line spans from x=100 (right edge of frame 1) to x=150 (left edge of frame 2)
    expect(gapLine!.getAttribute('x1')).toBe('100');
    expect(gapLine!.getAttribute('x2')).toBe('150');
    const label = svg.querySelector('[data-role="gap-label"]');
    expect(label?.textContent).toBe('50px');
  });

  it('draws a vertical gap line between two stacked frames', () => {
    const svg = buildAnnotationSvg({
      frames: [
        { index: 1, bounds: { x: 50, y: 0, width: 100, height: 50 } },
        { index: 2, bounds: { x: 50, y: 80, width: 100, height: 50 } }
      ],
      gaps: [{ from: 1, to: 2, axis: 'vertical', px: 30 }],
      canvas: { width: 300, height: 200 }
    });
    const gapLine = svg.querySelector('line[data-role="gap-main"]');
    expect(gapLine).not.toBeNull();
    expect(gapLine!.getAttribute('y1')).toBe('50');
    expect(gapLine!.getAttribute('y2')).toBe('80');
  });

  it('skips gap markers when referenced frame index is missing', () => {
    const svg = buildAnnotationSvg({
      frames: [{ index: 1, bounds: { x: 0, y: 0, width: 10, height: 10 } }],
      gaps: [{ from: 1, to: 99, axis: 'horizontal', px: 5 }],
      canvas: { width: 100, height: 100 }
    });
    expect(svg.querySelectorAll('[data-role="gap-main"]').length).toBe(0);
  });

  it('omits all gap markers when options.gaps === false', () => {
    const svg = buildAnnotationSvg(
      {
        frames: [
          { index: 1, bounds: { x: 0, y: 50, width: 100, height: 50 } },
          { index: 2, bounds: { x: 150, y: 50, width: 100, height: 50 } }
        ],
        gaps: [{ from: 1, to: 2, axis: 'horizontal', px: 50 }],
        canvas: { width: 400, height: 200 }
      },
      { gaps: false }
    );
    expect(svg.querySelectorAll('[data-role="gap-main"]').length).toBe(0);
  });
});
```

*   **Step 2: Run tests to verify they fail**

Run: `pnpm -F @tw199501/specsnap-core exec vitest run src/annotate.test.ts`
Expected: 4 new tests FAIL.

*   **Step 3: Implement gap markers**

In `packages/core/src/annotate.ts`, add these constants near the top:

```
const STROKE_GAP = '#ff5000';
const FILL_GAP = '#ff5000';
```

Update `buildAnnotationSvg` so the body becomes:

```
export function buildAnnotationSvg(
  input: AnnotateInput,
  options: AnnotateOptions = {}
): SVGSVGElement {
  const showBadges = options.badges !== false;
  const showSizeLabels = options.sizeLabels !== false;
  const showGaps = options.gaps !== false;

  const svg = el('svg', {
    width: input.canvas.width,
    height: input.canvas.height,
    xmlns: SVG_NS
  }) as SVGSVGElement;

  for (const frame of input.frames) {
    svg.appendChild(outlineRect(frame.bounds));
    if (showSizeLabels) appendSizeLabel(svg, frame.bounds);
    if (showBadges) appendBadge(svg, frame.index, frame.bounds);
  }

  if (showGaps && input.gaps.length > 0) {
    const byIndex = new Map<number, AnnotateBounds>();
    for (const f of input.frames) byIndex.set(f.index, f.bounds);
    for (const gap of input.gaps) {
      const a = byIndex.get(gap.from);
      const b = byIndex.get(gap.to);
      if (!a || !b) continue;
      if (gap.axis === 'horizontal') drawHorizontalGap(svg, a, b, gap.px);
      else drawVerticalGap(svg, a, b, gap.px);
    }
  }

  return svg;
}
```

Then append these helpers to the same file:

```
function drawHorizontalGap(
  svg: SVGElement,
  a: AnnotateBounds,
  b: AnnotateBounds,
  px: number
): void {
  const aRight = a.x + a.width;
  const bRight = b.x + b.width;
  const left = aRight <= b.x ? { right: aRight, rect: a } : { right: bRight, rect: b };
  const right = aRight <= b.x ? { left: b.x, rect: b } : { left: a.x, rect: a };
  const y = (
    Math.max(a.y, b.y) +
    Math.min(a.y + a.height, b.y + b.height)
  ) / 2;

  svg.appendChild(el('line', {
    'data-role': 'gap-main',
    x1: left.right,
    y1: y,
    x2: right.left,
    y2: y,
    stroke: STROKE_GAP,
    'stroke-width': 1.5,
    'stroke-dasharray': '4 3'
  }));
  svg.appendChild(el('line', {
    'data-role': 'gap-cap',
    x1: left.right,
    y1: y - 5,
    x2: left.right,
    y2: y + 5,
    stroke: STROKE_GAP,
    'stroke-width': 1.5
  }));
  svg.appendChild(el('line', {
    'data-role': 'gap-cap',
    x1: right.left,
    y1: y - 5,
    x2: right.left,
    y2: y + 5,
    stroke: STROKE_GAP,
    'stroke-width': 1.5
  }));

  const midX = (left.right + right.left) / 2;
  appendGapLabel(svg, `${px}px`, midX, y - 6, 'middle');
}

function drawVerticalGap(
  svg: SVGElement,
  a: AnnotateBounds,
  b: AnnotateBounds,
  px: number
): void {
  const aBottom = a.y + a.height;
  const bBottom = b.y + b.height;
  const top = aBottom <= b.y ? { bottom: aBottom, rect: a } : { bottom: bBottom, rect: b };
  const bottom = aBottom <= b.y ? { top: b.y, rect: b } : { top: a.y, rect: a };
  const x = (
    Math.max(a.x, b.x) +
    Math.min(a.x + a.width, b.x + b.width)
  ) / 2;

  svg.appendChild(el('line', {
    'data-role': 'gap-main',
    x1: x,
    y1: top.bottom,
    x2: x,
    y2: bottom.top,
    stroke: STROKE_GAP,
    'stroke-width': 1.5,
    'stroke-dasharray': '4 3'
  }));
  svg.appendChild(el('line', {
    'data-role': 'gap-cap',
    x1: x - 5,
    y1: top.bottom,
    x2: x + 5,
    y2: top.bottom,
    stroke: STROKE_GAP,
    'stroke-width': 1.5
  }));
  svg.appendChild(el('line', {
    'data-role': 'gap-cap',
    x1: x - 5,
    y1: bottom.top,
    x2: x + 5,
    y2: bottom.top,
    stroke: STROKE_GAP,
    'stroke-width': 1.5
  }));

  const midY = (top.bottom + bottom.top) / 2;
  appendGapLabel(svg, `${px}px`, x + 4, midY + 4, 'start');
}

function appendGapLabel(
  svg: SVGElement,
  text: string,
  x: number,
  y: number,
  anchor: 'start' | 'middle' | 'end'
): void {
  const padX = 5;
  const approxW = text.length * 7;
  let bgX = x;
  if (anchor === 'middle') bgX = x - approxW / 2 - padX;
  else if (anchor === 'end') bgX = x - approxW - padX * 2;

  svg.appendChild(el('rect', {
    'data-role': 'gap-label-bg',
    x: bgX,
    y: y - 10,
    width: approxW + padX * 2,
    height: 16,
    rx: 3,
    ry: 3,
    fill: FILL_GAP
  }));
  const t = el('text', {
    'data-role': 'gap-label',
    x: anchor === 'middle' ? x : anchor === 'end' ? x - padX : x + padX,
    y: y + 2,
    fill: '#fff',
    'font-family': 'system-ui, sans-serif',
    'font-size': 11,
    'font-weight': 600,
    'text-anchor': anchor
  });
  t.textContent = text;
  svg.appendChild(t);
}
```

*   **Step 4: Run tests to verify they pass**

Run: `pnpm -F @tw199501/specsnap-core exec vitest run src/annotate.test.ts`
Expected: all 9 annotate tests PASS.

*   **Step 5: Commit**

```
git add packages/core/src/annotate.ts packages/core/src/annotate.test.ts
git commit -m "feat(core): annotate draws horizontal + vertical gap markers"
```

---

### Task 5: `AnnotatedPngOptions` type + `toAnnotatedPNG` skeleton

**Files:**

Modify: `packages/core/src/types.ts`

Create: `packages/core/src/to-annotated-png.ts`

Create: `packages/core/src/to-annotated-png.test.ts`

 **Step 1: Extend** `**types.ts**`

Add to the end of `packages/core/src/types.ts` (do NOT bump `SCHEMA_VERSION` — Session wire format unchanged):

```
export interface AnnotatedPngOptions {
  /** Include numbered badges. Default: true. */
  badges?: boolean;
  /** Include gap distance markers. Default: true. */
  gaps?: boolean;
  /** Include size labels above each frame. Default: true. */
  sizeLabels?: boolean;
  /** Output format. Default: 'png'. */
  format?: 'png' | 'jpeg';
  /** JPEG quality 0..1 (ignored for PNG). Default: 0.92. */
  quality?: number;
  /** Device pixel ratio for the output. Default: session.viewport.devicePixelRatio. */
  pixelRatio?: number;
  /** Extra pixels of padding around the session bbox. Default: 16. */
  padding?: number;
  /** Background color for transparent regions. Default: '#ffffff'. */
  background?: string;
}
```

*   **Step 2: Write failing test for skeleton**

Create `packages/core/src/to-annotated-png.test.ts`:

```
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { captureSession } from './capture.js';
import { clearBody, makeElement, mount } from './dom-fixture.js';
import { toAnnotatedPNG } from './to-annotated-png.js';

vi.mock('dom-to-image-more', () => ({
  default: {
    toBlob: vi.fn(async () => new Blob(['fake'], { type: 'image/png' }))
  },
  toBlob: vi.fn(async () => new Blob(['fake'], { type: 'image/png' }))
}));

describe('toAnnotatedPNG', () => {
  beforeEach(() => {
    clearBody();
  });

  it('throws when session has zero frames', async () => {
    const session = captureSession([]);
    await expect(toAnnotatedPNG(session)).rejects.toThrow(/empty|no frames/i);
  });

  it('returns a Blob for a non-empty session', async () => {
    const el = mount(makeElement({ id: 'x', text: 'hi' }));
    const session = captureSession([el]);
    const blob = await toAnnotatedPNG(session);
    expect(blob).toBeInstanceOf(Blob);
  });

  it('removes the injected overlay SVG after capture', async () => {
    const el = mount(makeElement({ id: 'x', text: 'hi' }));
    const session = captureSession([el]);
    await toAnnotatedPNG(session);
    expect(document.getElementById('specsnap-capture-overlay')).toBeNull();
  });

  it('cleans up the overlay even if dom-to-image-more rejects', async () => {
    const mod = await import('dom-to-image-more');
    const toBlob = mod.default.toBlob as ReturnType<typeof vi.fn>;
    toBlob.mockRejectedValueOnce(new Error('render failure'));

    const el = mount(makeElement({ id: 'x', text: 'hi' }));
    const session = captureSession([el]);
    await expect(toAnnotatedPNG(session)).rejects.toThrow(/render failure/);
    expect(document.getElementById('specsnap-capture-overlay')).toBeNull();
  });
});
```

*   **Step 3: Run test to verify it fails**

Run: `pnpm -F @tw199501/specsnap-core exec vitest run src/to-annotated-png.test.ts`
Expected: FAIL with "Cannot find module './to-annotated-png.js'".

*   **Step 4: Write minimal implementation**

Create `packages/core/src/to-annotated-png.ts`:

```
import { buildAnnotationSvg } from './annotate.js';
import type { AnnotatedPngOptions, Session } from './types.js';

const OVERLAY_ID = 'specsnap-capture-overlay';

export async function toAnnotatedPNG(
  session: Session,
  options: AnnotatedPngOptions = {}
): Promise<Blob> {
  if (session.frames.length === 0) {
    throw new Error('SpecSnap: cannot screenshot an empty session (no frames)');
  }

  const padding = options.padding ?? 16;
  const bbox = computeBbox(session, padding);
  const overlay = mountOverlay(session, bbox, options);

  try {
    const dtim = await import('dom-to-image-more');
    const toBlob = dtim.default?.toBlob ?? dtim.toBlob;
    const pixelRatio = options.pixelRatio ?? session.viewport.devicePixelRatio ?? 1;
    const blob = await toBlob(document.body, {
      width: bbox.width,
      height: bbox.height,
      pixelRatio,
      bgcolor: options.background ?? '#ffffff',
      quality: options.quality ?? 0.92,
      style: {
        transform: `translate(${-bbox.x}px, ${-bbox.y}px)`,
        transformOrigin: '0 0'
      } as Partial<CSSStyleDeclaration>
    });
    return blob;
  }
  finally {
    overlay.remove();
  }
}

function computeBbox(session: Session, padding: number): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  const first = session.frames[0]!.rect;
  let minX = first.x;
  let minY = first.y;
  let maxX = first.x + first.width;
  let maxY = first.y + first.height;
  for (const f of session.frames) {
    minX = Math.min(minX, f.rect.x);
    minY = Math.min(minY, f.rect.y);
    maxX = Math.max(maxX, f.rect.x + f.rect.width);
    maxY = Math.max(maxY, f.rect.y + f.rect.height);
  }
  return {
    x: minX - padding,
    y: minY - padding,
    width: maxX - minX + padding * 2,
    height: maxY - minY + padding * 2
  };
}

function mountOverlay(
  session: Session,
  bbox: { x: number; y: number; width: number; height: number },
  options: AnnotatedPngOptions
): HTMLDivElement {
  const host = document.createElement('div');
  host.id = OVERLAY_ID;
  host.style.cssText = [
    'position:absolute',
    `left:${bbox.x}px`,
    `top:${bbox.y}px`,
    `width:${bbox.width}px`,
    `height:${bbox.height}px`,
    'pointer-events:none',
    'z-index:2147483647'
  ].join(';');

  const svg = buildAnnotationSvg(
    {
      frames: session.frames.map((f) => ({
        index: f.index,
        bounds: {
          x: f.rect.x - bbox.x,
          y: f.rect.y - bbox.y,
          width: f.rect.width,
          height: f.rect.height
        }
      })),
      gaps: session.gaps,
      canvas: { width: bbox.width, height: bbox.height }
    },
    {
      badges: options.badges,
      gaps: options.gaps,
      sizeLabels: options.sizeLabels
    }
  );
  host.appendChild(svg);
  document.body.appendChild(host);
  return host;
}
```

*   **Step 5: Run tests to verify they pass**

Run: `pnpm -F @tw199501/specsnap-core exec vitest run src/to-annotated-png.test.ts`
Expected: all 4 tests PASS.

*   **Step 6: Commit**

```
git add packages/core/src/types.ts packages/core/src/to-annotated-png.ts packages/core/src/to-annotated-png.test.ts
git commit -m "feat(core): toAnnotatedPNG screenshots a session with SVG overlay"
```

---

### Task 6: Export new API + verify full build

**Files:**

Modify: `packages/core/src/index.ts`

 **Step 1: Add exports**

Edit `packages/core/src/index.ts` — add three export lines near the other type/function exports:

```
export {
  SCHEMA_VERSION,
  type AnnotatedPngOptions,
  type Background,
  type BoxModel,
  type ElementIdentity,
  type FourSides,
  type Frame,
  type Rect,
  type ScrollPosition,
  type SerializeOptions,
  type Session,
  type Typography,
  type Viewport
} from './types.js';
```

Append after the existing `computeGap` export:

```
export {
  buildAnnotationSvg,
  type AnnotateBounds,
  type AnnotateFrameInput,
  type AnnotateInput,
  type AnnotateOptions
} from './annotate.js';

export { toAnnotatedPNG } from './to-annotated-png.js';
```

*   **Step 2: Type-check everything**

Run: `pnpm -F @tw199501/specsnap-core check`
Expected: exits 0.

*   **Step 3: Run the full test suite**

Run: `pnpm -F @tw199501/specsnap-core test`
Expected: all previous tests + ~13 new annotate/png tests PASS.

*   **Step 4: Build**

Run: `pnpm -F @tw199501/specsnap-core build`
Expected: exits 0, `dist/index.mjs` + `dist/index.cjs` + `dist/index.d.ts` regenerated, `buildAnnotationSvg` and `toAnnotatedPNG` appear in the `.d.ts`.

Verify: `grep -c "toAnnotatedPNG\|buildAnnotationSvg" packages/core/dist/index.d.ts` — should print `4` or more (at least one for each symbol, likely more with re-exports).

*   **Step 5: Commit**

```
git add packages/core/src/index.ts
git commit -m "feat(core): export toAnnotatedPNG + buildAnnotationSvg from barrel"
```

---

### Task 7: Replace playground's inline SVG drawing with `buildAnnotationSvg`

**Files:**

*   Modify: `apps/playground/visualizer.ts`

This is a pure refactor — output must look identical in the browser. Purpose: eliminate the duplication that made today's drawing logic exist in two places.

*   **Step 1: Rewrite** `**renderOverlay**` **to delegate to core**

In `apps/playground/visualizer.ts`, replace the entire `renderOverlay` function (lines ~194-252) with this thinner version that computes viewport-relative bounds and calls core:

```
import { buildAnnotationSvg } from '@tw199501/specsnap-core';
import type { Gap } from '@tw199501/specsnap-core';

export function renderOverlay(
  targets: readonly Element[],
  gaps: readonly Gap[] = []
): void {
  clearOverlay();
  if (targets.length === 0) return;

  const overlay = ensureOverlay();
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const svg = buildAnnotationSvg({
    frames: targets.map((el, i) => {
      const r = el.getBoundingClientRect();
      return {
        index: i + 1,
        bounds: { x: r.left, y: r.top, width: r.width, height: r.height }
      };
    }),
    gaps,
    canvas: { width: vw, height: vh }
  });
  svg.style.width = '100%';
  svg.style.height = '100%';
  overlay.appendChild(svg);

  // Parent outline is playground-only (needs live Element refs).
  const last = targets[targets.length - 1]!;
  const parent = last.parentElement;
  if (parent && parent !== document.body) {
    const pr = parent.getBoundingClientRect();
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    p.setAttribute('x', String(pr.left));
    p.setAttribute('y', String(pr.top));
    p.setAttribute('width', String(pr.width));
    p.setAttribute('height', String(pr.height));
    p.setAttribute('fill', 'none');
    p.setAttribute('stroke', STROKE_PARENT);
    p.setAttribute('stroke-width', '1.5');
    p.setAttribute('stroke-dasharray', '4 3');
    svg.insertBefore(p, svg.firstChild);
  }
}
```

*   **Step 2: Delete now-unused helpers**

Remove from `apps/playground/visualizer.ts`: `addLabel`, `addBadge`, `toBounds`, `drawGapFromSchema`, and the unused color constants `STROKE_SELECTED`, `STROKE_GAP`, `FILL_SELECTED`, `FILL_GAP`, and `RectBounds` interface — they're all re-implemented inside core now. Keep `createSvg`, `STROKE_PARENT`, `FILL_PARENT`, `ensureOverlay`, `clearOverlay`, `removeAllChildren`, and the entire box-model section (`renderBoxModel`, `renderBoxModels`, `drawBoxModelSvg`, `addNumber`).

*   **Step 3: Start the playground and visually verify**

Run (in a separate terminal): `pnpm -F specsnap-playground dev`
Open the printed URL (typically `http://localhost:5173`). Verify:

*   Click "Start inspect mode"
*   Click two side-by-side targets (e.g. Save button and username input)
*   Expect: blue outlines + numbered badges ①② + orange dashed gap line + size labels + red dashed parent outline — same as before the refactor.

If anything looks different, DO NOT PROCEED — the core builder is the source of truth now and a visual regression means `buildAnnotationSvg` has a bug.

*   **Step 4: Commit**

```
git add apps/playground/visualizer.ts
git commit -m "refactor(playground): use core's buildAnnotationSvg, delete duplicated helpers"
```

---

### Task 8: Add "Download PNG" button to playground

**Files:**

Modify: `apps/playground/index.html`

Modify: `apps/playground/main.ts`

 **Step 1: Add the button markup**

In `apps/playground/index.html`, inside the `<div class="controls">` block (after the `<button id="clear">`), add:

```html
<button id="download-png" style="padding:8px 14px;font-size:14px;border:1px solid #d1d5db;border-radius:6px;background:#fff;cursor:pointer" disabled>Download PNG</button>
```

*   **Step 2: Wire the handler**

In `apps/playground/main.ts`:

At the top, add `toAnnotatedPNG` to the core import and widen the import list:

```
import { captureSession, toAnnotatedPNG, toJSON, toMarkdown } from '@tw199501/specsnap-core';
```

After the line `const targetsEl = document.querySelector('.targets');`, add:

```
const downloadBtn = document.getElementById('download-png') as HTMLButtonElement | null;
```

Update the `if (!startBtn || ...)` guard to include `downloadBtn`.

Inside `renderOutputs`, at the end of both the empty and non-empty branches, sync the button state:

```
// At top of renderOutputs, after selections.length === 0 branch:
if (downloadBtn) downloadBtn.disabled = selections.length === 0;
```

(Put this line just before the early `return` in the empty branch, and also after `renderOverlay(selections, session.gaps);` at the end of the non-empty branch.)

At the bottom of `main.ts`, add the click handler:

```
downloadBtn!.addEventListener('click', async () => {
  if (selections.length === 0) return;
  downloadBtn!.disabled = true;
  const originalLabel = downloadBtn!.textContent;
  downloadBtn!.textContent = 'Generating…';
  try {
    const session = captureSession(selections);
    const blob = await toAnnotatedPNG(session);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `specsnap-${session.id}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
  catch (err) {
    console.error('[specsnap] PNG generation failed:', err);
    hintEl!.textContent = `PNG generation failed: ${String(err instanceof Error ? err.message : err)}`;
  }
  finally {
    downloadBtn!.disabled = false;
    downloadBtn!.textContent = originalLabel;
  }
});
```

*   **Step 3: Verify in the browser**

Playground dev server should still be running from Task 7. If not: `pnpm -F specsnap-playground dev`.

Reload the page, then:

1.  Click "Start inspect mode" → click Save + Username → Done.
2.  Confirm the "Download PNG" button is enabled and shows no "disabled" styling.
3.  Click it — expect a file `specsnap-s-XXXXXX.png` to download.
4.  Open the PNG — verify: both elements are visible (in their rendered colors), numbered badges ① ② appear, orange dashed gap line with "Npx" label is drawn.
5.  Click "Clear" → button becomes disabled.

If the PNG is blank / missing badges / missing gap line → something is wrong; investigate before committing.

*   **Step 4: Commit**

```
git add apps/playground/index.html apps/playground/main.ts
git commit -m "feat(playground): add Download PNG button wired to toAnnotatedPNG"
```

---

### Task 9: Update package README + final verification

**Files:**

Modify: `packages/core/README.md`

 **Step 1: Document** `**toAnnotatedPNG**` **in the package README**

In `packages/core/README.md`, find the `## API` section. After the `toJSON` entry and before `annotate`, insert:

```
### `toAnnotatedPNG(session: Session, options?: AnnotatedPngOptions): Promise<Blob>`

Browser-only. Renders the page inside the session's bounding box with numbered badges and gap markers overlaid, returns the result as a PNG/JPEG `Blob`. Internally dynamic-imports `dom-to-image-more`, so consumers who don't call this function don't pay the bundle cost.

Options:
- `badges?: boolean` — default `true`
- `gaps?: boolean` — default `true`
- `sizeLabels?: boolean` — default `true`
- `format?: 'png' | 'jpeg'` — default `'png'`
- `quality?: number` — JPEG only, 0..1, default `0.92`
- `pixelRatio?: number` — default `session.viewport.devicePixelRatio`
- `padding?: number` — extra pixels of padding around the bbox, default `16`
- `background?: string` — default `'#ffffff'`

### `buildAnnotationSvg(input, options?): SVGSVGElement`

Lower-level primitive used by `toAnnotatedPNG` and by the playground's live overlay. Builds a detached SVG from raw bounds — coordinate-agnostic (the caller decides whether bounds are viewport-relative or document-relative).
```

Also update the "Planned for upcoming versions" bullet list at the bottom: move `v0.0.3` to "shipped" and describe what it added:

```
- `v0.0.2` — inter-element gap distances in the session schema
- `v0.0.3` **(current)** — `toAnnotatedPNG` PNG capture with SVG overlay (badges + gap markers); `buildAnnotationSvg` shared SVG primitive
- Later — `toMarkdown({ embedScreenshot: true })` to inline PNGs into MD
- Later — component tree awareness (Vue / React)
```

*   **Step 2: Full green-check**

Run from repo root: `pnpm check`
Expected: exits 0.

Run from repo root: `pnpm test`
Expected: all tests pass — previous 36 + ~13 new = ~49 tests.

Run from repo root: `pnpm build`
Expected: exits 0. Verify `packages/core/dist/index.d.ts` contains `toAnnotatedPNG` and `AnnotatedPngOptions`.

*   **Step 3: Final commit**

```
git add packages/core/README.md
git commit -m "docs(core): document toAnnotatedPNG + buildAnnotationSvg for v0.0.3"
```

*   **Step 4: Do NOT publish yet**

Publishing to npm is a separate step requiring 2FA OTP. The user will run `npm publish --otp=...` from `packages/core` manually, same as 0.0.1 and 0.0.2 (per retrospective). This plan ends with everything ready on `main` but not yet on npm.

---

## Self-Review Notes

*   **Spec coverage:** roadmap Task 1 fully covered (Tasks 2-6 implement annotate + png + exports). Task 3 (playground download button) covered by Task 8. Tasks 2/4 from roadmap intentionally out of scope per user direction.
*   **Types used across tasks are consistent:** `AnnotateBounds`, `AnnotateFrameInput`, `AnnotateInput`, `AnnotateOptions`, `AnnotatedPngOptions`. `buildAnnotationSvg` signature is identical in every reference.
*   **Parent outline punted:** playground still draws it via local code (Task 7 Step 1), but it's not part of core's API. This was a deliberate scope call — adding parent support requires `elements?` as a second argument alongside `session`, which doubles the core API surface.
*   **Happy-dom canvas limitation handled:** `to-annotated-png.test.ts` mocks `dom-to-image-more` rather than trying to exercise real rasterization. Visual verification lives in the playground (Task 7 Step 3, Task 8 Step 3).
*   **Runtime vs dev dep:** `dom-to-image-more` lands in `dependencies`, not `devDependencies` — required for consumers. Dynamic import keeps bundlers from eagerly including it when only `toJSON`/`toMarkdown` are used.
*   **No** `**SCHEMA_VERSION**` **bump:** new option interfaces don't change the `Session` wire format. npm version bumps 0.0.2 → 0.0.3; `SCHEMA_VERSION` stays at `'0.0.2'`.
