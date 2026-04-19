# SpecSnap Core 0.0.2 — Schema Gaps Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Ship `@tw199501/specsnap-core@0.0.2` that computes inter-element distance ("gaps") into the session schema, exposes them in Markdown + JSON output, and retrofits the playground visualizer to consume schema gaps instead of computing them locally.

**Why this matters:** 0.0.1 playground renders orange "12px" / "24px" gap labels between selected elements — but those numbers exist ONLY in the rendered SVG overlay, never in the Markdown or JSON payload. AI readers of the output see only element-level data, not spacing relationships. This plan closes that gap (pun intended) by making gaps a first-class field in `Session`.

**Architecture:** Add `computeGap(a, b)` pure utility. `captureSession` walks consecutive pairs and populates `session.gaps`. Markdown serializer renders a "## 間距 (Gaps)" section. Playground reads from `session.gaps` instead of recomputing — single source of truth.

**Scope:** Gaps only. Recursive children and screenshot integration stay deferred.

**Schema version:** bumps `SCHEMA_VERSION` from `'0.0.1'` to `'0.0.2'` (additive change; old consumers still read frames correctly but miss the `gaps` field).

---

## File Structure

```
packages/core/src/
├── types.ts              [Task 1] add Gap interface, extend Session
├── gap.ts                [Task 2] computeGap(a, b) pure function
├── gap.test.ts           [Task 2] TDD
├── capture.ts            [Task 3] captureSession populates session.gaps
├── capture.test.ts       [Task 3] new tests for gaps
├── serialize-md.ts       [Task 4] render "間距 (Gaps)" section
├── serialize-md.test.ts  [Task 4] new tests
└── index.ts              [Task 2,3] re-export computeGap

apps/playground/
└── visualizer.ts         [Task 5] consume session.gaps instead of local drawGap
```

---

## Phase 0 — Security updates (Dependabot alerts)

**Context:** GitHub Dependabot flagged 8 vulnerabilities immediately after the repo went public (2026-04-20). All are in **dev dependencies** (happy-dom, vite, esbuild). They don't affect consumers of `@tw199501/specsnap-core` (runtime deps = 0) but they pollute the repo's GitHub banner and affect anyone who clones + `pnpm install`.

Alerts inventory:

| Package | Severity | Issue |
|---|---|---|
| happy-dom | Critical × 2 | VM Context Escape → RCE in certain usage |
| happy-dom | High × 2 | ECMAScriptModuleCompiler interpolates unsanitized export names as executable code |
| happy-dom | High × 2 | `fetch` credentials use page-origin cookies instead of target-origin |
| vite | Moderate | Path Traversal in optimized deps `.map` handling |
| esbuild | Moderate | Any website could send requests to the dev server and read responses |

Fix strategy: upgrade `happy-dom`, `vite`, and let `tsup`'s transitive `esbuild` follow. Run full test suite after to verify nothing regresses.

### Task 0.1: Bump happy-dom

**Files:**
- Modify: `packages/core/package.json`
- Modify: `pnpm-lock.yaml`

- [ ] **Step 1: Check latest patched version**

```bash
npm view happy-dom version
```

Note the latest version (at time of writing plan, 15.x had the issues; 16.x or later should carry the patches — verify against the advisories).

- [ ] **Step 2: Update `packages/core/package.json`**

Change `"happy-dom": "^15.11.0"` to `"happy-dom": "^<latest>"` (whatever `npm view` reported).

- [ ] **Step 3: Run `pnpm install` then full test suite**

```bash
pnpm install
pnpm --filter @tw199501/specsnap-core test
pnpm --filter @tw199501/specsnap-core check
```

All existing 36 tests MUST still pass. If any break due to happy-dom API changes, note them as BLOCKED and escalate to the controller — we don't proceed until tests are green.

- [ ] **Step 4: Commit**

```bash
git add packages/core/package.json pnpm-lock.yaml
git commit -m "chore(deps): bump happy-dom to address Dependabot alerts"
```

### Task 0.2: Bump vite

**Files:**
- Modify: `apps/playground/package.json`
- Modify: `pnpm-lock.yaml`

- [ ] **Step 1: Check latest**

```bash
npm view vite version
```

- [ ] **Step 2: Update `apps/playground/package.json`**

Change `"vite": "^6.0.0"` to the latest patched major.

- [ ] **Step 3: Install + smoke-start the playground**

```bash
pnpm install
pnpm --filter specsnap-playground dev
```

Confirm Vite starts without errors and serves `http://localhost:5173`. A quick browser click-test on "Start inspect mode" → select element → see output should still work.

- [ ] **Step 4: Commit**

```bash
git add apps/playground/package.json pnpm-lock.yaml
git commit -m "chore(deps): bump vite to address Dependabot alerts"
```

### Task 0.3: Verify Dependabot alerts close + push

- [ ] **Step 1: Push**

```bash
git push origin main
```

- [ ] **Step 2: Wait a few minutes then check GitHub**

GitHub's Dependabot rescans within ~15 min of a new push. Revisit https://github.com/TW199501/specsnap/security/dependabot and confirm alert count drops to 0 (or near-0 if some alerts target packages we're not using).

- [ ] **Step 3: If any alerts remain:**

- If the remaining alert is for a transitive dep that the fixed version doesn't reach (e.g. esbuild pinned via tsup), we may need to wait for upstream. Add a note in the GitHub alert explaining (`dismiss` with reason `tolerable_risk` is acceptable for transitive dev deps).
- If a direct dep alert persists, bump that dep's version directly. Repeat Task 0.1 / 0.2 pattern.

**Exit criterion for Phase 0:** Dependabot shows 0 open critical/high alerts, all tests pass, `pnpm build` + `pnpm check` green.

---

## Phase 1 — Schema extension

### Task 1: Add `Gap` interface + extend `Session` + bump version

**Files:**
- Modify: `packages/core/src/types.ts`

- [ ] **Step 1: Update `SCHEMA_VERSION` and add `Gap` + `Axis` types**

Edit `packages/core/src/types.ts`:

```ts
// Change the schema version from '0.0.1' to '0.0.2'
export const SCHEMA_VERSION = '0.0.2';
```

After the existing `Frame` interface, add:

```ts
export type GapAxis = 'horizontal' | 'vertical';

/**
 * The computed distance between two captured frames along a shared axis.
 * - horizontal: frames share a Y range (side-by-side); `px` is the gap along X
 * - vertical: frames share an X range (stacked); `px` is the gap along Y
 * If two frames overlap or are diagonally unrelated, no Gap is emitted.
 */
export interface Gap {
  /** 1-based index of the frame on the "from" side. */
  from: number;
  /** 1-based index of the frame on the "to" side. */
  to: number;
  axis: GapAxis;
  /** The distance in CSS pixels between the two frames along the shared axis. */
  px: number;
}
```

Modify the `Session` interface to add the `gaps` field at the end:

```ts
export interface Session {
  schemaVersion: typeof SCHEMA_VERSION;
  id: string;
  capturedAt: string;
  url: string;
  pageTitle: string;
  viewport: Viewport;
  scroll: ScrollPosition;
  frames: Frame[];
  /** Distance between every consecutive pair of frames. Empty when <2 frames. */
  gaps: Gap[];
}
```

- [ ] **Step 2: Bump the core `package.json` version**

Edit `packages/core/package.json`:

```json
{
  "version": "0.0.2"
}
```

- [ ] **Step 3: Type-check to confirm no downstream breaks**

```bash
pnpm --filter @tw199501/specsnap-core check
```

Expected: many errors about `Session` now requiring `gaps`. This is correct — these will be fixed in Task 3 when `captureSession` is updated.

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/types.ts packages/core/package.json
git commit -m "feat(core)!: add Gap type and Session.gaps field · bump to 0.0.2"
```

Note: the `!` after `feat(core)` marks this as a breaking-ish change (schema extended). 0.0.x rules mean we don't owe backward compat, but conventional-commits `!` signals it.

---

## Phase 2 — Gap computation

### Task 2: Implement and test `computeGap`

**Files:**
- Create: `packages/core/src/gap.ts`
- Create: `packages/core/src/gap.test.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Write failing test `src/gap.test.ts`**

```ts
import { describe, expect, it } from 'vitest';

import { computeGap } from './gap.js';
import type { Rect } from './types.js';

function rect(x: number, y: number, width: number, height: number): Rect {
  return { x, y, width, height };
}

describe('computeGap', () => {
  it('returns null when rects overlap', () => {
    const a = rect(0, 0, 100, 100);
    const b = rect(50, 50, 100, 100);
    expect(computeGap(1, 2, a, b)).toBeNull();
  });

  it('computes horizontal gap for side-by-side rects sharing Y range', () => {
    // A is 0..100 wide, B starts at x=112 (12px gap)
    const a = rect(0, 0, 100, 30);
    const b = rect(112, 0, 100, 30);
    expect(computeGap(1, 2, a, b)).toEqual({ from: 1, to: 2, axis: 'horizontal', px: 12 });
  });

  it('computes horizontal gap regardless of order', () => {
    const a = rect(112, 0, 100, 30);
    const b = rect(0, 0, 100, 30);
    expect(computeGap(1, 2, a, b)).toEqual({ from: 1, to: 2, axis: 'horizontal', px: 12 });
  });

  it('computes vertical gap for stacked rects sharing X range', () => {
    // A ends at y=40, B starts at y=48 (8px gap)
    const a = rect(0, 0, 100, 40);
    const b = rect(0, 48, 100, 40);
    expect(computeGap(1, 2, a, b)).toEqual({ from: 1, to: 2, axis: 'vertical', px: 8 });
  });

  it('returns null when rects share neither axis range (diagonal)', () => {
    const a = rect(0, 0, 50, 50);
    const b = rect(100, 100, 50, 50);
    expect(computeGap(1, 2, a, b)).toBeNull();
  });

  it('returns null when rects touch edge to edge (0 gap)', () => {
    const a = rect(0, 0, 100, 30);
    const b = rect(100, 0, 100, 30);
    expect(computeGap(1, 2, a, b)).toBeNull();
  });

  it('preserves the requested from/to indices', () => {
    const a = rect(0, 0, 50, 30);
    const b = rect(60, 0, 50, 30);
    const g = computeGap(5, 7, a, b);
    expect(g).not.toBeNull();
    expect(g!.from).toBe(5);
    expect(g!.to).toBe(7);
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
pnpm --filter @tw199501/specsnap-core test gap
```

Expected: fails to resolve `./gap.js`.

- [ ] **Step 3: Implement `src/gap.ts`**

```ts
import type { Gap, Rect } from './types.js';

/**
 * Compute the axis-aligned gap between two rectangles.
 * Returns null when the rectangles overlap, touch (0 px gap), or are
 * diagonally positioned with no shared axis range.
 *
 * @param fromIndex 1-based index of the "from" frame
 * @param toIndex 1-based index of the "to" frame
 * @param a rect of the "from" frame (document-relative, from `Frame.rect`)
 * @param b rect of the "to" frame
 */
export function computeGap(
  fromIndex: number,
  toIndex: number,
  a: Rect,
  b: Rect
): Gap | null {
  const aRight = a.x + a.width;
  const aBottom = a.y + a.height;
  const bRight = b.x + b.width;
  const bBottom = b.y + b.height;

  const overlapsY = a.y < bBottom && b.y < aBottom;
  const overlapsX = a.x < bRight && b.x < aRight;

  if (overlapsX && overlapsY) return null;

  if (overlapsY && !overlapsX) {
    // side by side
    const gap = a.x >= bRight ? a.x - bRight : b.x - aRight;
    if (gap <= 0) return null;
    return { from: fromIndex, to: toIndex, axis: 'horizontal', px: round(gap) };
  }

  if (overlapsX && !overlapsY) {
    // stacked
    const gap = a.y >= bBottom ? a.y - bBottom : b.y - aBottom;
    if (gap <= 0) return null;
    return { from: fromIndex, to: toIndex, axis: 'vertical', px: round(gap) };
  }

  // Diagonal: no shared axis range — skip.
  return null;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
pnpm --filter @tw199501/specsnap-core test gap
```

Expected: 7 tests PASS.

- [ ] **Step 5: Re-export from `src/index.ts`**

Append to `packages/core/src/index.ts`:

```ts
export { computeGap } from './gap.js';
export type { Gap, GapAxis } from './types.js';
```

- [ ] **Step 6: Commit**

```bash
git add packages/core/
git commit -m "feat(core): add computeGap utility for axis-aligned distances"
```

---

## Phase 3 — Wire gaps into sessions

### Task 3: `captureSession` populates `session.gaps`

**Files:**
- Modify: `packages/core/src/capture.ts`
- Modify: `packages/core/src/capture.test.ts`

- [ ] **Step 1: Update tests first — add gaps expectations to existing multi-frame tests**

In `packages/core/src/capture.test.ts`, inside the `describe('captureSession', ...)` block, add these tests:

```ts
  it('populates gaps between consecutive frames when they share an axis', () => {
    clearBody();
    // Two inline-block divs side-by-side with 12px margin between.
    const a = mount(makeElement({
      id: 'a', style: 'display:inline-block;width:100px;height:30px;margin-right:12px'
    }));
    const b = mount(makeElement({
      id: 'b', style: 'display:inline-block;width:100px;height:30px'
    }));

    const session = captureSession([a, b]);
    expect(session.gaps).toHaveLength(1);
    expect(session.gaps[0]!.from).toBe(1);
    expect(session.gaps[0]!.to).toBe(2);
    expect(session.gaps[0]!.axis).toBe('horizontal');
    expect(session.gaps[0]!.px).toBeGreaterThan(0);
  });

  it('produces empty gaps array for single-frame session', () => {
    clearBody();
    const a = mount(makeElement({ id: 'only', text: 'solo' }));
    const session = captureSession([a]);
    expect(session.gaps).toEqual([]);
  });

  it('produces empty gaps array for empty session', () => {
    expect(captureSession([]).gaps).toEqual([]);
  });

  it('skips pairs that have no shared axis (diagonal elements)', () => {
    clearBody();
    const wrapper = mount(makeElement({
      style: 'width:400px;height:400px;position:relative'
    }));
    const a = document.createElement('div');
    a.setAttribute('style', 'position:absolute;left:0;top:0;width:50px;height:50px');
    wrapper.appendChild(a);
    const b = document.createElement('div');
    b.setAttribute('style', 'position:absolute;left:200px;top:200px;width:50px;height:50px');
    wrapper.appendChild(b);

    const session = captureSession([a, b]);
    // Diagonal placement => no gap entry
    expect(session.gaps).toEqual([]);
  });
```

- [ ] **Step 2: Run tests — expect FAIL** (captureSession doesn't populate gaps yet)

```bash
pnpm --filter @tw199501/specsnap-core test capture
```

- [ ] **Step 3: Update `captureSession` in `src/capture.ts`**

Edit `captureSession` to compute and attach gaps:

```ts
import { computeGap } from './gap.js';
// ... existing imports ...

export function captureSession(elements: readonly Element[]): Session {
  const frames = elements.map((el, i) => captureElement(el, i + 1));

  const gaps = [];
  for (let i = 1; i < frames.length; i++) {
    const g = computeGap(
      frames[i - 1]!.index,
      frames[i]!.index,
      frames[i - 1]!.rect,
      frames[i]!.rect
    );
    if (g) gaps.push(g);
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    id: makeSessionId(),
    capturedAt: new Date().toISOString(),
    url: typeof location === 'undefined' ? '' : location.href,
    pageTitle: typeof document === 'undefined' ? '' : document.title,
    viewport: captureViewport(),
    scroll: captureScroll(),
    frames,
    gaps
  };
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
pnpm --filter @tw199501/specsnap-core test
```

Expected: all tests (old + new) PASS. Total should be ~43 (36 old + 7 gap + 4 new capture tests = 47; exact count depends on pre-existing counts — just confirm all green).

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/capture.ts packages/core/src/capture.test.ts
git commit -m "feat(core): captureSession auto-computes gaps between consecutive frames"
```

---

## Phase 4 — Serializer output

### Task 4: Markdown serializer renders gaps section

**Files:**
- Modify: `packages/core/src/serialize-md.ts`
- Modify: `packages/core/src/serialize-md.test.ts`

- [ ] **Step 1: Add failing test**

In `serialize-md.test.ts`, add:

```ts
  it('renders a gaps section when session has gaps', () => {
    clearBody();
    const a = mount(makeElement({
      id: 'a', style: 'display:inline-block;width:100px;height:30px;margin-right:16px'
    }));
    const b = mount(makeElement({
      id: 'b', style: 'display:inline-block;width:100px;height:30px'
    }));
    const session = captureSession([a, b]);
    const [first] = toMarkdown(session);

    // Gaps section should appear on the FIRST frame's doc (so AI sees them in the first read)
    expect(first!).toContain('## 間距 (Gaps)');
    expect(first!).toContain('Frame 1 → Frame 2');
    expect(first!).toContain('horizontal');
  });

  it('omits gaps section when no gaps exist', () => {
    clearBody();
    const a = mount(makeElement({ id: 'solo', text: 'only' }));
    const session = captureSession([a]);
    const [md] = toMarkdown(session);
    expect(md!).not.toContain('間距 (Gaps)');
  });
```

- [ ] **Step 2: Update `serialize-md.ts`**

In the `renderFrame` function, after the "背景 (Background)" section and before the final `''` entry of the array, add gaps rendering — but **only for the first frame** (index 1), so that gaps appear once per session (at the start), not repeated N times:

```ts
// existing: all the background lines...
'- **border-radius**: ...',
'',
// NEW — only render on frame 1, once per session
...(frame.index === 1 && session.gaps.length > 0
  ? [
      '## 間距 (Gaps)',
      ...session.gaps.map(
        (g) => `- **Frame ${g.from} → Frame ${g.to}**: ${g.px}px ${g.axis} (${g.axis === 'horizontal' ? '水平間距' : '垂直間距'})`
      ),
      ''
    ]
  : [])
```

- [ ] **Step 3: Run tests — expect PASS**

```bash
pnpm --filter @tw199501/specsnap-core test serialize-md
```

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/serialize-md.ts packages/core/src/serialize-md.test.ts
git commit -m "feat(core): render 間距 (Gaps) section in Markdown output"
```

---

## Phase 5 — Playground retrofit

### Task 5: Visualizer consumes `session.gaps` instead of local compute

**Files:**
- Modify: `apps/playground/visualizer.ts`
- Modify: `apps/playground/main.ts`

- [ ] **Step 1: Update `visualizer.ts` `renderOverlay` signature**

The current `renderOverlay(targets)` calls `drawGap(svg, a, b)` internally using recomputed coordinates. Refactor so `drawGap` takes the gap axis + px from the schema, and the caller passes the pre-computed gaps.

Replace the `renderOverlay` function signature:

```ts
import type { Gap } from '@tw199501/specsnap-core';

export function renderOverlay(targets: readonly Element[], gaps: readonly Gap[] = []): void {
  clearOverlay();
  if (targets.length === 0) return;
  const overlay = ensureOverlay();
  // ... existing parent + selected outlines unchanged ...

  // Now use the supplied schema gaps, not local computation:
  const boundsByIndex = new Map<number, RectBounds>();
  targets.forEach((el, i) => {
    boundsByIndex.set(i + 1, toBounds(el.getBoundingClientRect()));
  });

  for (const gap of gaps) {
    const fromBounds = boundsByIndex.get(gap.from);
    const toBounds = boundsByIndex.get(gap.to);
    if (!fromBounds || !toBounds) continue;
    drawGapFromSchema(svg, fromBounds, toBounds, gap);
  }
}

function drawGapFromSchema(
  svg: SVGElement,
  a: RectBounds,
  b: RectBounds,
  gap: Gap
): void {
  // Similar to the old drawGap, but reads gap.axis and gap.px from schema
  // instead of recomputing.
  if (gap.axis === 'horizontal') {
    const leftRect = a.right <= b.left ? a : b;
    const rightRect = a.right <= b.left ? b : a;
    const y = (Math.max(a.top, b.top) + Math.min(a.bottom, b.bottom)) / 2;
    svg.appendChild(createSvg('line', {
      x1: leftRect.right, y1: y, x2: rightRect.left, y2: y,
      stroke: STROKE_GAP, 'stroke-width': 1.5, 'stroke-dasharray': '4 3'
    }));
    svg.appendChild(createSvg('line', {
      x1: leftRect.right, y1: y - 5, x2: leftRect.right, y2: y + 5,
      stroke: STROKE_GAP, 'stroke-width': 1.5
    }));
    svg.appendChild(createSvg('line', {
      x1: rightRect.left, y1: y - 5, x2: rightRect.left, y2: y + 5,
      stroke: STROKE_GAP, 'stroke-width': 1.5
    }));
    const mid = (leftRect.right + rightRect.left) / 2;
    addLabel(svg, `${gap.px}px`, mid, y - 6, FILL_GAP, 'middle');
  }
  else {
    const topRect = a.bottom <= b.top ? a : b;
    const bottomRect = a.bottom <= b.top ? b : a;
    const x = (Math.max(a.left, b.left) + Math.min(a.right, b.right)) / 2;
    svg.appendChild(createSvg('line', {
      x1: x, y1: topRect.bottom, x2: x, y2: bottomRect.top,
      stroke: STROKE_GAP, 'stroke-width': 1.5, 'stroke-dasharray': '4 3'
    }));
    svg.appendChild(createSvg('line', {
      x1: x - 5, y1: topRect.bottom, x2: x + 5, y2: topRect.bottom,
      stroke: STROKE_GAP, 'stroke-width': 1.5
    }));
    svg.appendChild(createSvg('line', {
      x1: x - 5, y1: bottomRect.top, x2: x + 5, y2: bottomRect.top,
      stroke: STROKE_GAP, 'stroke-width': 1.5
    }));
    const mid = (topRect.bottom + bottomRect.top) / 2;
    addLabel(svg, `${gap.px}px`, x + 4, mid + 4, FILL_GAP, 'start');
  }
}
```

Delete the old `drawGap` function that recomputed gaps locally.

- [ ] **Step 2: Update `main.ts` to pass gaps**

In `main.ts`, the `renderOutputs` function (around where `renderOverlay(selections)` is called):

```ts
// Old:
renderOverlay(selections);

// New:
renderOverlay(selections, session.gaps);
```

- [ ] **Step 3: Test in browser**

```bash
pnpm --filter specsnap-playground dev
```

Click 3 elements. Orange gap lines should still appear with the same px values as before — but now sourced from `session.gaps`. Pasting Markdown into Claude should show a "## 間距 (Gaps)" section too.

- [ ] **Step 4: Commit**

```bash
git add apps/playground/
git commit -m "refactor(playground): consume session.gaps from core schema"
```

---

## Phase 6 — Publish 0.0.2

### Task 6: Update README mentions + publish

**Files:**
- Modify: `packages/core/README.md`
- Modify: root `README.md`

- [ ] **Step 1: Update `packages/core/README.md`**

In the "Status" section, change the v0.0.2 bullet:
- Before: `v0.0.2 — inter-element gap distances in the session schema`
- After: `v0.0.2 (current) — inter-element gap distances in the session schema. See the "間距 (Gaps)" section in Markdown output.`

Add a new "Gaps" section under "What you get per frame":

```markdown
## What you get per session (beyond frames)

- **Gaps** — every consecutive pair of frames that shares an axis produces a `Gap { from, to, axis, px }` entry. AI sees spacing info as structured data, not visual-only.
```

- [ ] **Step 2: Full check suite**

```bash
pnpm --filter @tw199501/specsnap-core check
pnpm --filter @tw199501/specsnap-core test
pnpm --filter @tw199501/specsnap-core build
node scripts/check-line-endings.mjs
```

All must pass.

- [ ] **Step 3: Commit README**

```bash
git add packages/core/README.md
git commit -m "docs(core): document gaps field in 0.0.2 README"
```

- [ ] **Step 4: Dry-run publish**

```bash
cd packages/core
npm publish --dry-run --access public
```

Confirm version shows `0.0.2` and file list is clean.

- [ ] **Step 5: STOP HERE — user runs actual publish**

The user will provide their 2FA OTP and run:

```bash
npm publish --access public --otp=XXXXXX
```

Do not attempt this yourself.

- [ ] **Step 6: After user publishes, tag + push**

```bash
cd ../..
git tag -a core@0.0.2 -m "specsnap-core 0.0.2 — gaps in session schema"
git push origin main
git push origin core@0.0.2
```

---

## Summary: what ships in `0.0.2`

- `Session.gaps: Gap[]` — new field carrying inter-element distances
- `computeGap(fromIndex, toIndex, a, b)` — exported pure utility
- Markdown `## 間距 (Gaps)` section on the first frame's doc
- Playground visualizer reads from schema rather than local compute
- 7+ new tests, total ~47 passing

## What's next (0.0.3 candidates, pick one)

1. **Recursive children dump** — P5 of vision. Each frame optionally includes filtered descendant frames (semantic filter: visible text / interactive role / non-inherited style).
2. **`data-source` attribute detection** — if a Vite/webpack plugin has injected `data-source="File.vue:42"`, capture it into `identity.source`.
3. **Pseudo-state detection** — :hover, :focus-visible, :disabled styles that would apply, captured into `Frame.pseudoStates`.
4. **Screenshot export** — integrate `dom-to-image-more` behind a new `toAnnotatedPNG()` API.

Pick based on which unblocks the most pain. My (AI) suggestion: **#3 pseudo-states** — it's where "my styles aren't what I expect" conversations happen most. But #1 recursive dump is the biggest wow-factor demo.
