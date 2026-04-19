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
