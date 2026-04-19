# SpecSnap Core MVP — Implementation Plan (Part 2 of 2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the capture engine, bilingual lexicon, MD + JSON serializers, a Vite playground for smoke testing, and publish `@tw199501/specsnap-core@0.0.1` to npm. Assumes Part 1 (bootstrap + types) is complete.

**Architecture:** continues from Part 1. Tests use `vitest` with `happy-dom`. DOM fixtures built via `createElement` helpers (not `innerHTML`) for XSS hygiene and editor-tooling compatibility.

**Scope for Part 2:** Phases 3-5 from the original outline. Completes the 0.0.1 shippable product.

---

## Shared Test Helper (referenced across Tasks 6-10)

Tests build DOM fixtures via a small helper instead of `innerHTML`. Create this file once at the start of Phase 3 (Task 6) and reuse in later tasks:

**File:** `E:\source\specsnap\packages\core\tests\dom-fixture.ts`

```ts
// DOM fixture helpers for tests. Avoids innerHTML for XSS hygiene.

export interface ElementSpec {
   tag?: string; // default 'div'
   id?: string;
   classes?: readonly string[];
   style?: string;
   text?: string;
}

export function makeElement(spec: ElementSpec): HTMLElement {
   const el = document.createElement(spec.tag ?? 'div');
   if (spec.id) el.id = spec.id;
   if (spec.classes) spec.classes.forEach((c) => el.classList.add(c));
   if (spec.style) el.setAttribute('style', spec.style);
   if (spec.text) el.textContent = spec.text;
   return el;
}

export function clearBody(): void {
   while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
   }
}

export function mount(el: HTMLElement): HTMLElement {
   document.body.appendChild(el);
   return el;
}
```

---

## Phase 3 — Capture Engine

### Task 6: Viewport + scroll capture

**Files:**
- Create: `E:\source\specsnap\packages\core\vitest.config.ts`
- Create: `E:\source\specsnap\packages\core\src\viewport.ts`
- Create: `E:\source\specsnap\packages\core\tests\dom-fixture.ts` (see above)
- Create: `E:\source\specsnap\packages\core\tests\viewport.test.ts`
- Modify: `E:\source\specsnap\packages\core\src\index.ts`

- [ ] **Step 1: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
   test: {
      globals: true,
      environment: 'happy-dom',
      include: ['tests/**/*.test.ts']
   }
});
```

- [ ] **Step 2: Create `tests/dom-fixture.ts`** (content shown above in "Shared Test Helper")

- [ ] **Step 3: Write failing test — `tests/viewport.test.ts`**

```ts
import { describe, expect, it } from 'vitest';

import { captureScroll, captureViewport } from '../src/viewport.js';

describe('captureViewport', () => {
   it('returns viewport width, height, and devicePixelRatio from window', () => {
      const vp = captureViewport(window);
      expect(vp.width).toBe(1024);
      expect(vp.height).toBe(768);
      expect(vp.devicePixelRatio).toBe(1);
   });

   it('uses actual window dimensions when overridden', () => {
      Object.defineProperty(window, 'innerWidth', { value: 1440, configurable: true });
      Object.defineProperty(window, 'innerHeight', { value: 900, configurable: true });
      Object.defineProperty(window, 'devicePixelRatio', { value: 2, configurable: true });

      const vp = captureViewport(window);
      expect(vp).toEqual({ width: 1440, height: 900, devicePixelRatio: 2 });
   });
});

describe('captureScroll', () => {
   it('returns 0,0 when page has not scrolled', () => {
      expect(captureScroll(window)).toEqual({ x: 0, y: 0 });
   });

   it('returns scroll position after page scroll', () => {
      Object.defineProperty(window, 'scrollX', { value: 0, configurable: true });
      Object.defineProperty(window, 'scrollY', { value: 240, configurable: true });
      expect(captureScroll(window)).toEqual({ x: 0, y: 240 });
   });
});
```

- [ ] **Step 4: Run test to verify it fails**

```bash
pnpm --filter @tw199501/specsnap-core test
```

Expected: FAIL — cannot find module `../src/viewport.js`.

- [ ] **Step 5: Write `src/viewport.ts`**

```ts
import type { ScrollPosition, Viewport } from './types.js';

/**
 * Capture current viewport dimensions. Must be called on every session start
 * (viewport context is mandatory per P1 of the design).
 */
export function captureViewport(win: Window = window): Viewport {
   return {
      width: win.innerWidth,
      height: win.innerHeight,
      devicePixelRatio: win.devicePixelRatio ?? 1
   };
}

/** Capture current page scroll position. */
export function captureScroll(win: Window = window): ScrollPosition {
   return { x: win.scrollX, y: win.scrollY };
}
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
pnpm --filter @tw199501/specsnap-core test
```

Expected: 4 tests PASS.

- [ ] **Step 7: Re-export + commit**

Append to `packages/core/src/index.ts`:

```ts
export { captureScroll, captureViewport } from './viewport.js';
```

```bash
git add packages/core/
git commit -m "feat(core): add captureViewport and captureScroll utilities"
```

---

### Task 7: Bilingual lexicon (50 CSS properties)

**Files:**
- Create: `E:\source\specsnap\packages\core\src\lexicon.ts`
- Create: `E:\source\specsnap\packages\core\tests\lexicon.test.ts`
- Modify: `E:\source\specsnap\packages\core\src\index.ts`

- [ ] **Step 1: Write failing test — `tests/lexicon.test.ts`**

```ts
import { describe, expect, it } from 'vitest';

import { annotate, DEFAULT_LEXICON } from '../src/lexicon.js';

describe('DEFAULT_LEXICON', () => {
   it('contains at least 50 CSS property translations', () => {
      expect(Object.keys(DEFAULT_LEXICON).length).toBeGreaterThanOrEqual(50);
   });

   it('translates common properties to Traditional Chinese', () => {
      expect(DEFAULT_LEXICON['padding']).toBe('內邊距');
      expect(DEFAULT_LEXICON['margin']).toBe('外邊距');
      expect(DEFAULT_LEXICON['font-size']).toBe('字體大小');
      expect(DEFAULT_LEXICON['background-color']).toBe('背景色');
   });
});

describe('annotate', () => {
   it('returns the default translation when no override given', () => {
      expect(annotate('padding')).toBe('內邊距');
   });

   it('prefers override value over default', () => {
      expect(annotate('padding', { padding: 'inner-spacing' })).toBe('inner-spacing');
   });

   it('returns empty string for unknown property', () => {
      expect(annotate('unknown-xyz-prop')).toBe('');
   });

   it('looks up by lowercased key (case-insensitive)', () => {
      expect(annotate('PADDING')).toBe('內邊距');
      expect(annotate('Font-Size')).toBe('字體大小');
   });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @tw199501/specsnap-core test lexicon
```

Expected: FAIL — cannot find module.

- [ ] **Step 3: Write `src/lexicon.ts`**

```ts
/**
 * Bilingual lexicon — maps CSS property names to Traditional Chinese annotations.
 * First-class schema feature (P3 of the design). Override via SerializeOptions.lexiconOverride.
 */
export const DEFAULT_LEXICON: Readonly<Record<string, string>> = Object.freeze({
   // Box model
   'padding': '內邊距',
   'padding-top': '上內邊距',
   'padding-right': '右內邊距',
   'padding-bottom': '下內邊距',
   'padding-left': '左內邊距',
   'margin': '外邊距',
   'margin-top': '上外邊距',
   'margin-right': '右外邊距',
   'margin-bottom': '下外邊距',
   'margin-left': '左外邊距',
   'border': '邊框',
   'border-width': '邊框寬度',
   'border-style': '邊框樣式',
   'border-color': '邊框顏色',
   'border-radius': '圓角',

   // Sizing
   'width': '寬度',
   'height': '高度',
   'min-width': '最小寬度',
   'min-height': '最小高度',
   'max-width': '最大寬度',
   'max-height': '最大高度',

   // Typography
   'color': '文字顏色',
   'font-family': '字體',
   'font-size': '字體大小',
   'font-weight': '字重',
   'font-style': '字型樣式',
   'line-height': '行高',
   'letter-spacing': '字距',
   'text-align': '對齊方式',
   'text-decoration': '文字裝飾',
   'text-transform': '文字轉換',

   // Background
   'background': '背景',
   'background-color': '背景色',
   'background-image': '背景圖',

   // Layout
   'display': '顯示模式',
   'position': '定位方式',
   'top': '上偏移',
   'right': '右偏移',
   'bottom': '下偏移',
   'left': '左偏移',
   'z-index': '層級',
   'overflow': '溢出處理',
   'visibility': '可見性',

   // Flex / Grid
   'flex': '彈性排版',
   'flex-direction': '主軸方向',
   'flex-wrap': '換行',
   'gap': '間距',
   'justify-content': '主軸對齊',
   'align-items': '交叉軸對齊',

   // Visual
   'box-shadow': '陰影',
   'opacity': '不透明度',
   'transform': '變形',
   'transition': '過渡效果',
   'cursor': '游標樣式',

   // Interaction
   'pointer-events': '指標事件',
   'user-select': '文字選取'
});

/**
 * Resolve a CSS property to its bilingual annotation.
 *
 * @param property the CSS property name (case-insensitive)
 * @param override optional user-supplied overrides (keys MUST be lowercase)
 * @returns the Chinese translation, or '' if unknown
 */
export function annotate(
   property: string,
   override?: Readonly<Record<string, string>>
): string {
   const key = property.toLowerCase();
   if (override && key in override) return override[key]!;
   return DEFAULT_LEXICON[key] ?? '';
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
pnpm --filter @tw199501/specsnap-core test lexicon
```

Expected: 6 tests PASS.

- [ ] **Step 5: Re-export + commit**

Append to `packages/core/src/index.ts`:

```ts
export { annotate, DEFAULT_LEXICON } from './lexicon.js';
```

```bash
git add packages/core/
git commit -m "feat(core): add bilingual lexicon with 50+ CSS property translations"
```

---

### Task 8: Element capture utility

**Files:**
- Create: `E:\source\specsnap\packages\core\src\capture.ts`
- Create: `E:\source\specsnap\packages\core\tests\capture.test.ts`
- Modify: `E:\source\specsnap\packages\core\src\index.ts`

- [ ] **Step 1: Write failing test — `tests/capture.test.ts`**

```ts
import { beforeEach, describe, expect, it } from 'vitest';

import { captureElement, captureSession } from '../src/capture.js';
import { clearBody, makeElement, mount } from './dom-fixture.js';

describe('captureElement', () => {
   let el: HTMLElement;

   beforeEach(() => {
      clearBody();
      el = mount(makeElement({
         id: 'box',
         classes: ['card', 'primary'],
         style: 'width:200px;height:40px;padding:8px 16px;margin:4px;border:1px solid #000;font-family:Inter;font-size:14px;font-weight:500;color:#111;background-color:#eee;border-radius:6px',
         text: 'Hello'
      }));
   });

   it('captures tag, id, and class list', () => {
      const frame = captureElement(el, 1);
      expect(frame.identity.tagName).toBe('div');
      expect(frame.identity.id).toBe('box');
      expect(frame.identity.classList).toEqual(['card', 'primary']);
   });

   it('produces a DOM path that resolves back to the element', () => {
      const frame = captureElement(el, 1);
      const resolved = document.querySelector(frame.identity.domPath);
      expect(resolved).toBe(el);
   });

   it('captures box model padding and margin as FourSides tuples', () => {
      const frame = captureElement(el, 1);
      expect(frame.boxModel.padding).toEqual([8, 16, 8, 16]);
      expect(frame.boxModel.margin).toEqual([4, 4, 4, 4]);
   });

   it('captures typography fields', () => {
      const frame = captureElement(el, 1);
      expect(frame.typography.fontSize).toBe(14);
      expect(frame.typography.fontWeight).toBe('500');
      expect(frame.typography.fontFamily).toContain('Inter');
   });

   it('preserves the requested 1-based index', () => {
      expect(captureElement(el, 3).index).toBe(3);
   });

   it('throws if element is not attached to the document', () => {
      const detached = document.createElement('div');
      expect(() => captureElement(detached, 1)).toThrow(/not attached/i);
   });
});

describe('captureSession', () => {
   it('wraps captured frames with viewport + timestamp + URL', () => {
      clearBody();
      const a = mount(makeElement({ tag: 'p', id: 'a', text: 'A' }));
      const b = mount(makeElement({ tag: 'p', id: 'b', text: 'B' }));

      const session = captureSession([a, b]);
      expect(session.frames).toHaveLength(2);
      expect(session.frames[0]!.index).toBe(1);
      expect(session.frames[1]!.index).toBe(2);
      expect(session.viewport.width).toBeGreaterThan(0);
      expect(session.capturedAt).toMatch(/\d{4}-\d{2}-\d{2}T/);
      expect(session.schemaVersion).toBe('0.0.1');
      expect(session.id).toMatch(/^s-[a-z0-9]{6}$/);
   });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @tw199501/specsnap-core test capture
```

Expected: FAIL — cannot find module.

- [ ] **Step 3: Write `src/capture.ts`**

```ts
import { SCHEMA_VERSION } from './types.js';
import type {
   Background,
   BoxModel,
   ElementIdentity,
   FourSides,
   Frame,
   Rect,
   Session,
   Typography
} from './types.js';
import { captureScroll, captureViewport } from './viewport.js';

/**
 * Capture one DOM element into a Frame object.
 */
export function captureElement(el: Element, index: number): Frame {
   if (!el.isConnected) {
      throw new Error('SpecSnap: element is not attached to the document');
   }

   const rect = domRect(el);
   const style = getComputedStyle(el);

   return {
      index,
      identity: identify(el),
      rect,
      viewportRelative: {
         xPct: round((rect.x / window.innerWidth) * 100, 2),
         yPct: round((rect.y / window.innerHeight) * 100, 2)
      },
      boxModel: readBoxModel(style, rect),
      typography: readTypography(style),
      background: readBackground(style)
   };
}

/** Capture a whole session: N elements + viewport context. */
export function captureSession(elements: readonly Element[]): Session {
   return {
      schemaVersion: SCHEMA_VERSION,
      id: makeSessionId(),
      capturedAt: new Date().toISOString(),
      url: typeof location === 'undefined' ? '' : location.href,
      pageTitle: typeof document === 'undefined' ? '' : document.title,
      viewport: captureViewport(),
      scroll: captureScroll(),
      frames: elements.map((el, i) => captureElement(el, i + 1))
   };
}

// ─── helpers ──────────────────────────────────────────────

function domRect(el: Element): Rect {
   const r = el.getBoundingClientRect();
   return {
      x: round(r.left + window.scrollX, 2),
      y: round(r.top + window.scrollY, 2),
      width: round(r.width, 2),
      height: round(r.height, 2)
   };
}

function readBoxModel(style: CSSStyleDeclaration, rect: Rect): BoxModel {
   const padding = fourSides(style, 'padding');
   const border = fourSides(style, 'border', '-width');
   const margin = fourSides(style, 'margin');

   const contentWidth = rect.width - padding[1] - padding[3] - border[1] - border[3];
   const contentHeight = rect.height - padding[0] - padding[2] - border[0] - border[2];

   return {
      content: {
         width: round(Math.max(0, contentWidth), 2),
         height: round(Math.max(0, contentHeight), 2)
      },
      padding,
      border,
      margin
   };
}

function fourSides(
   style: CSSStyleDeclaration,
   prop: 'padding' | 'margin' | 'border',
   suffix = ''
): FourSides {
   const read = (side: 'top' | 'right' | 'bottom' | 'left') =>
      parsePx(style.getPropertyValue(`${prop}-${side}${suffix}`));
   return [read('top'), read('right'), read('bottom'), read('left')];
}

function parsePx(v: string): number {
   const n = parseFloat(v);
   return Number.isFinite(n) ? round(n, 2) : 0;
}

function readTypography(style: CSSStyleDeclaration): Typography {
   return {
      fontFamily: style.fontFamily,
      fontSize: parsePx(style.fontSize),
      fontWeight: style.fontWeight,
      lineHeight: style.lineHeight,
      letterSpacing: style.letterSpacing,
      color: style.color,
      textAlign: style.textAlign
   };
}

function readBackground(style: CSSStyleDeclaration): Background {
   return {
      color: style.backgroundColor,
      image: style.backgroundImage,
      borderRadius: [
         parsePx(style.borderTopLeftRadius),
         parsePx(style.borderTopRightRadius),
         parsePx(style.borderBottomRightRadius),
         parsePx(style.borderBottomLeftRadius)
      ]
   };
}

function identify(el: Element): ElementIdentity {
   const tagName = el.tagName.toLowerCase();
   const id = el.id || null;
   const classList = [...el.classList];
   const name = formatName(tagName, id, classList, el.textContent);
   const domPath = buildDomPath(el);
   return { tagName, id, classList, name, domPath };
}

function formatName(
   tag: string,
   id: string | null,
   classes: readonly string[],
   text: string | null
): string {
   if (id) return `${tag}#${id}`;
   const snippet = text ? text.trim().slice(0, 24) : '';
   if (snippet) return `${tag}[text="${snippet}"]`;
   return classes[0] ? `${tag}.${classes[0]}` : tag;
}

function buildDomPath(el: Element): string {
   const parts: string[] = [];
   let node: Element | null = el;

   while (node && node.nodeType === Node.ELEMENT_NODE) {
      let segment = node.tagName.toLowerCase();
      if (node.id) {
         parts.unshift(`${segment}#${CSS.escape(node.id)}`);
         break;
      }
      const parent: Element | null = node.parentElement;
      if (parent) {
         const siblings = [...parent.children].filter(
            (c) => c.tagName === node!.tagName
         );
         if (siblings.length > 1) {
            segment += `:nth-of-type(${siblings.indexOf(node) + 1})`;
         }
      }
      parts.unshift(segment);
      node = parent;
   }
   return parts.join(' > ');
}

function round(n: number, decimals: number): number {
   const p = 10 ** decimals;
   return Math.round(n * p) / p;
}

function makeSessionId(): string {
   return 's-' + Math.random().toString(36).slice(2, 8);
}
```

- [ ] **Step 4: Run all tests — expect PASS**

```bash
pnpm --filter @tw199501/specsnap-core test
```

Expected: all tests (viewport + lexicon + capture, 17 total) PASS.

- [ ] **Step 5: Re-export + commit**

Append to `packages/core/src/index.ts`:

```ts
export { captureElement, captureSession } from './capture.js';
```

```bash
git add packages/core/
git commit -m "feat(core): add captureElement and captureSession capture engine"
```

---

## Phase 4 — Serializers

### Task 9: Markdown serializer

**Files:**
- Create: `E:\source\specsnap\packages\core\src\serialize-md.ts`
- Create: `E:\source\specsnap\packages\core\tests\serialize-md.test.ts`
- Modify: `E:\source\specsnap\packages\core\src\index.ts`

- [ ] **Step 1: Write failing test — `tests/serialize-md.test.ts`**

```ts
import { beforeEach, describe, expect, it } from 'vitest';

import { captureSession } from '../src/capture.js';
import { toMarkdown } from '../src/serialize-md.js';
import { clearBody, makeElement, mount } from './dom-fixture.js';

function setupButton(): HTMLElement {
   clearBody();
   return mount(makeElement({
      tag: 'button',
      id: 'save',
      style: 'width:100px;height:32px;padding:4px 12px;margin:8px;font-family:Inter;font-size:13px;font-weight:500;color:#fff;background-color:#ff5000;border-radius:6px',
      text: 'Save'
   }));
}

describe('toMarkdown', () => {
   beforeEach(() => {
      clearBody();
   });

   it('returns one markdown string per frame', () => {
      const el = setupButton();
      const session = captureSession([el]);
      const docs = toMarkdown(session);
      expect(docs).toHaveLength(1);
      expect(typeof docs[0]).toBe('string');
   });

   it('includes YAML frontmatter with viewport and session id', () => {
      const el = setupButton();
      const session = captureSession([el]);
      const [md] = toMarkdown(session);
      expect(md!).toMatch(/^---\n/);
      expect(md!).toContain('frame: 1 of 1');
      expect(md!).toContain('viewport:');
      expect(md!).toContain('session_id: s-');
   });

   it('includes bilingual annotations by default', () => {
      const el = setupButton();
      const session = captureSession([el]);
      const [md] = toMarkdown(session);
      expect(md!).toContain('(寬度)');
      expect(md!).toContain('(字體大小)');
      expect(md!).toContain('(內邊距)');
   });

   it('respects lexicon override', () => {
      const el = setupButton();
      const session = captureSession([el]);
      const [md] = toMarkdown(session, {
         lexiconOverride: { padding: 'inner-pad' }
      });
      expect(md!).toContain('(inner-pad)');
      expect(md!).not.toContain('(內邊距)');
   });

   it('renders box model using four-side tuples', () => {
      const el = setupButton();
      const session = captureSession([el]);
      const [md] = toMarkdown(session);
      expect(md!).toMatch(/padding:\s+4\s+\/\s+12\s+\/\s+4\s+\/\s+12/);
   });
});
```

- [ ] **Step 2: Run test — expect FAIL** (module missing)

```bash
pnpm --filter @tw199501/specsnap-core test serialize-md
```

- [ ] **Step 3: Write `src/serialize-md.ts`**

```ts
import { annotate } from './lexicon.js';
import type { Frame, SerializeOptions, Session } from './types.js';

/**
 * Convert a Session into one Markdown document per frame.
 */
export function toMarkdown(
   session: Session,
   options: SerializeOptions = {}
): string[] {
   return session.frames.map((frame) => renderFrame(session, frame, options));
}

function renderFrame(
   session: Session,
   frame: Frame,
   options: SerializeOptions
): string {
   const a = (prop: string) => {
      const cn = annotate(prop, options.lexiconOverride);
      return cn ? ` (${cn})` : '';
   };
   const total = session.frames.length;
   const { identity, rect, viewportRelative, boxModel, typography, background } = frame;
   const pad = boxModel.padding;
   const bd = boxModel.border;
   const mg = boxModel.margin;

   return [
      '---',
      `frame: ${frame.index} of ${total}`,
      `captured_at: ${session.capturedAt}`,
      `viewport: { width: ${session.viewport.width}, height: ${session.viewport.height}, dpr: ${session.viewport.devicePixelRatio} }`,
      `scroll: { x: ${session.scroll.x}, y: ${session.scroll.y} }`,
      `url: ${session.url}`,
      `page_title: ${session.pageTitle}`,
      `session_id: ${session.id}`,
      '---',
      '',
      `# Frame ${frame.index} · ${identity.name}`,
      '',
      '## 基本 (Basics)',
      `- **name**: \`${identity.name}\``,
      `- **dom_path**: \`${identity.domPath}\``,
      `- **position**: (${rect.x}, ${rect.y}) · viewport-relative (${viewportRelative.xPct}%, ${viewportRelative.yPct}%)`,
      `- **size**: ${rect.width} × ${rect.height} px${a('width')} ×${a('height')}`,
      '',
      '## 盒模型 (Box Model)',
      `- **content**: ${boxModel.content.width} × ${boxModel.content.height} px`,
      `- **padding**: ${pad[0]} / ${pad[1]} / ${pad[2]} / ${pad[3]} (上/右/下/左)${a('padding')}`,
      `- **border**: ${bd[0]} / ${bd[1]} / ${bd[2]} / ${bd[3]}${a('border')}`,
      `- **margin**: ${mg[0]} / ${mg[1]} / ${mg[2]} / ${mg[3]}${a('margin')}`,
      '',
      '## 字體 (Typography)',
      `- **font-family**: ${typography.fontFamily}${a('font-family')}`,
      `- **font-size**: ${typography.fontSize}px${a('font-size')}`,
      `- **font-weight**: ${typography.fontWeight}${a('font-weight')}`,
      `- **line-height**: ${typography.lineHeight}${a('line-height')}`,
      `- **color**: ${typography.color}${a('color')}`,
      '',
      '## 背景 (Background)',
      `- **background-color**: ${background.color}${a('background-color')}`,
      `- **border-radius**: ${background.borderRadius.join(' / ')}${a('border-radius')}`,
      ''
   ].join('\n');
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
pnpm --filter @tw199501/specsnap-core test serialize-md
```

Expected: 5 tests PASS.

- [ ] **Step 5: Re-export + commit**

Append to `packages/core/src/index.ts`:

```ts
export { toMarkdown } from './serialize-md.js';
```

```bash
git add packages/core/
git commit -m "feat(core): add Markdown serializer with YAML frontmatter and bilingual annotations"
```

---

### Task 10: JSON serializer

**Files:**
- Create: `E:\source\specsnap\packages\core\src\serialize-json.ts`
- Create: `E:\source\specsnap\packages\core\tests\serialize-json.test.ts`
- Modify: `E:\source\specsnap\packages\core\src\index.ts`

- [ ] **Step 1: Write failing test — `tests/serialize-json.test.ts`**

```ts
import { describe, expect, it } from 'vitest';

import { captureSession } from '../src/capture.js';
import { toJSON } from '../src/serialize-json.js';
import { clearBody, makeElement, mount } from './dom-fixture.js';

function setupDiv(): HTMLElement {
   clearBody();
   return mount(makeElement({
      id: 'x',
      style: 'width:50px;height:20px',
      text: 'X'
   }));
}

describe('toJSON', () => {
   it('returns a pretty-printed JSON string by default', () => {
      const s = captureSession([setupDiv()]);
      const out = toJSON(s);
      expect(out).toContain('\n');
      expect(out.startsWith('{\n')).toBe(true);
   });

   it('returns compact JSON when pretty=false', () => {
      const s = captureSession([setupDiv()]);
      const out = toJSON(s, { pretty: false });
      expect(out).not.toContain('\n');
   });

   it('round-trips through JSON.parse back to the session shape', () => {
      const s = captureSession([setupDiv()]);
      const parsed = JSON.parse(toJSON(s));
      expect(parsed.schemaVersion).toBe('0.0.1');
      expect(parsed.frames).toHaveLength(1);
      expect(parsed.frames[0].index).toBe(1);
   });

   it('preserves viewport in the output', () => {
      const s = captureSession([setupDiv()]);
      const parsed = JSON.parse(toJSON(s));
      expect(parsed.viewport).toHaveProperty('width');
      expect(parsed.viewport).toHaveProperty('height');
      expect(parsed.viewport).toHaveProperty('devicePixelRatio');
   });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
pnpm --filter @tw199501/specsnap-core test serialize-json
```

- [ ] **Step 3: Write `src/serialize-json.ts`**

```ts
import type { SerializeOptions, Session } from './types.js';

/**
 * Serialize a Session to a JSON string.
 * Pretty-prints by default; pass `pretty: false` for compact output.
 */
export function toJSON(session: Session, options: SerializeOptions = {}): string {
   const pretty = options.pretty !== false;
   return JSON.stringify(session, null, pretty ? 2 : 0);
}
```

- [ ] **Step 4: Run all tests — expect PASS**

```bash
pnpm --filter @tw199501/specsnap-core test
```

Expected: all tests (~26 total) PASS.

- [ ] **Step 5: Finalize `src/index.ts`**

Replace `packages/core/src/index.ts` with the complete final export list:

```ts
export const VERSION = '0.0.1';

export {
   SCHEMA_VERSION,
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

export { captureScroll, captureViewport } from './viewport.js';
export { annotate, DEFAULT_LEXICON } from './lexicon.js';
export { captureElement, captureSession } from './capture.js';
export { toMarkdown } from './serialize-md.js';
export { toJSON } from './serialize-json.js';
```

- [ ] **Step 6: Commit**

```bash
git add packages/core/
git commit -m "feat(core): add JSON serializer with pretty/compact modes"
```

---

## Phase 5 — Ship to npm

### Task 11: Playground smoke test in a real browser

**Files:**
- Modify: `E:\source\specsnap\pnpm-workspace.yaml`
- Create: `E:\source\specsnap\apps\playground\package.json`
- Create: `E:\source\specsnap\apps\playground\index.html`
- Create: `E:\source\specsnap\apps\playground\main.ts`

> **Why:** unit tests use happy-dom (approximation). Real browsers compute styles differently. One end-to-end smoke test catches obvious real-browser bugs before npm publish.

- [ ] **Step 1: Update `pnpm-workspace.yaml`**

Replace content:

```yaml
packages:
  - 'packages/*'
  - 'apps/*'
```

- [ ] **Step 2: Write `apps/playground/package.json`**

```json
{
  "name": "specsnap-playground",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite"
  },
  "dependencies": {
    "@tw199501/specsnap-core": "workspace:*"
  },
  "devDependencies": {
    "vite": "^6.0.0"
  }
}
```

- [ ] **Step 3: Write `apps/playground/index.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>SpecSnap Playground</title>
  <style>
    body { font-family: Inter, sans-serif; padding: 40px; }
    button#save {
      width: 120px; height: 34px;
      padding: 4px 12px; margin: 8px;
      font-size: 13px; font-weight: 500;
      color: #fff; background: #ff5000;
      border: none; border-radius: 6px; cursor: pointer;
    }
    pre { background: #f4f4f7; padding: 16px; border-radius: 6px; max-height: 400px; overflow: auto; }
  </style>
</head>
<body>
  <h1>SpecSnap Playground</h1>
  <button id="save">Save</button>
  <button id="inspect">Inspect Save button</button>
  <h2>Output (Markdown)</h2>
  <pre id="md"></pre>
  <h2>Output (JSON)</h2>
  <pre id="json"></pre>
  <script type="module" src="./main.ts"></script>
</body>
</html>
```

- [ ] **Step 4: Write `apps/playground/main.ts`**

```ts
import { captureSession, toJSON, toMarkdown } from '@tw199501/specsnap-core';

const inspectBtn = document.getElementById('inspect');
if (!inspectBtn) throw new Error('playground: #inspect not found');

inspectBtn.addEventListener('click', () => {
   const target = document.getElementById('save');
   if (!target) return;
   const session = captureSession([target]);
   const mdEl = document.getElementById('md');
   const jsonEl = document.getElementById('json');
   if (mdEl) mdEl.textContent = toMarkdown(session)[0] ?? '';
   if (jsonEl) jsonEl.textContent = toJSON(session);
});
```

- [ ] **Step 5: Install + build core + launch playground**

```bash
pnpm install
pnpm --filter @tw199501/specsnap-core build
pnpm --filter specsnap-playground dev
```

Expected: Vite dev server starts (usually `http://localhost:5173/`).

- [ ] **Step 6: Manual verification in Chrome**

1. Open `http://localhost:5173/` in Chrome.
2. Click the "Inspect Save button" button.
3. Verify the Markdown panel shows:
   - YAML frontmatter with `viewport:`, `session_id: s-...`
   - Header `# Frame 1 · button#save`
   - `size: 120 × 34 px (寬度) × (高度)`
   - `padding: 4 / 12 / 4 / 12 (上/右/下/左) (內邊距)`
   - `background-color: rgb(255, 80, 0) (背景色)`
4. Verify the JSON panel shows valid pretty-printed JSON with `"schemaVersion": "0.0.1"` and a `"frames"` array of length 1.

If any assertion fails, debug `capture.ts` or `serialize-md.ts`, fix, re-run tests, commit the fix.

- [ ] **Step 7: Commit**

```bash
git add apps/ pnpm-workspace.yaml pnpm-lock.yaml
git commit -m "chore(playground): add Vite playground for smoke testing specsnap-core"
```

---

### Task 12: Publish `0.0.1` to npm

**Files:**
- Create: `E:\source\specsnap\packages\core\README.md`
- Create: `E:\source\specsnap\packages\core\LICENSE` (copy of root)

- [ ] **Step 1: Write `packages/core/README.md`**

````markdown
# @tw199501/specsnap-core

> Core capture and serialization library for [SpecSnap](https://github.com/tw199501/specsnap).

## Install

```bash
pnpm add @tw199501/specsnap-core
```

## Usage

```ts
import { captureSession, toJSON, toMarkdown } from '@tw199501/specsnap-core';

const target = document.querySelector('#my-button');
if (!target) throw new Error('target missing');

const session = captureSession([target]);

// Markdown ready to paste into Claude / ChatGPT
const [md] = toMarkdown(session);
console.log(md);

// Or machine-readable JSON
const json = toJSON(session);
```

## What you get per frame

- Viewport context (width, height, DPR) — mandatory
- Box model (content, padding, border, margin — all 4 sides)
- Typography (font-family, size, weight, line-height, color)
- Background (color, image, border-radius)
- Element identity (tag, id, classList, unique DOM selector)
- Bilingual annotations — English terms + 繁體中文

## Status

🚧 Pre-alpha. Schema may change before 1.0.

## License

[MIT](./LICENSE) © tw199501
````

- [ ] **Step 2: Copy LICENSE**

```bash
cp LICENSE packages/core/LICENSE
```

- [ ] **Step 3: Run full check suite**

```bash
pnpm --filter @tw199501/specsnap-core check
pnpm --filter @tw199501/specsnap-core test
pnpm --filter @tw199501/specsnap-core build
node scripts/check-line-endings.mjs
```

All 4 must PASS. Fix any failure before publishing.

- [ ] **Step 4: Inspect the build output**

```bash
ls packages/core/dist/
cat packages/core/package.json | grep -E '"main"|"module"|"types"|"version"'
```

Expected dist files: `index.cjs`, `index.cjs.map`, `index.mjs`, `index.mjs.map`, `index.d.ts`, `index.d.cts`.
Expected `"version": "0.0.1"`.

- [ ] **Step 5: Login to npm (one-time)**

```bash
npm whoami
```

If not logged in:

```bash
npm login
```

Expected: username printed.

- [ ] **Step 6: Publish**

```bash
cd packages/core
npm publish --access public
```

Expected output: `+ @tw199501/specsnap-core@0.0.1`.

- [ ] **Step 7: Verify the publication**

```bash
cd ../..
npm view @tw199501/specsnap-core version
```

Expected: `0.0.1`.

- [ ] **Step 8: Tag release + commit**

```bash
git add packages/core/README.md packages/core/LICENSE
git commit -m "docs(core): add package README for 0.0.1 publish"
git tag -a core@0.0.1 -m "specsnap-core 0.0.1 — first publish"
```

---

## Summary: what ships in `0.0.1`

- Capture a single DOM element into a Frame with viewport context
- Box model, typography, background — all computed values
- Bilingual annotations (50+ CSS properties)
- Markdown serializer with YAML frontmatter
- JSON serializer (pretty / compact)
- 26+ unit tests via vitest + happy-dom
- LF-clean, MIT-licensed, TypeScript strict
- Published to npm, installable via `pnpm add @tw199501/specsnap-core`

## What's next (subsequent plans)

1. **Multi-frame capture UX** — core already supports `captureSession([a, b, c])`; next plan wires overlay click-to-capture + queue management
2. **Screenshot annotator** — integrate `dom-to-image-more` for paired PNG export
3. **Browser extension** — wrap core with hotkey activation + Shadow DOM overlay UI
4. **Vite plugin (V2)** — source-map injection for `file:line` hints
