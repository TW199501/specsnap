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
