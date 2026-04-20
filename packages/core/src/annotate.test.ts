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

  it('can disable size labels but keep outlines', () => {
    const svg = buildAnnotationSvg(
      {
        frames: [{ index: 1, bounds: { x: 10, y: 20, width: 50, height: 50 } }],
        gaps: [],
        canvas: { width: 800, height: 600 }
      },
      { sizeLabels: false }
    );
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

describe('focusFrame option', () => {
  it('draws outline/badge/sizeLabel only for the focused frame', () => {
    const svg = buildAnnotationSvg(
      {
        frames: [
          { index: 1, bounds: { x: 0, y: 50, width: 100, height: 50 } },
          { index: 2, bounds: { x: 150, y: 50, width: 100, height: 50 } },
          { index: 3, bounds: { x: 300, y: 50, width: 100, height: 50 } }
        ],
        gaps: [],
        canvas: { width: 500, height: 200 }
      },
      { focusFrame: 2 }
    );
    const rects = svg.querySelectorAll('rect[data-role="frame-outline"]');
    expect(rects.length).toBe(1);
    expect(rects[0]!.getAttribute('x')).toBe('150');
    const badges = svg.querySelectorAll('[data-role="badge"]');
    expect(badges.length).toBe(1);
    const badgeText = svg.querySelector('[data-role="badge-text"]');
    expect(badgeText?.textContent).toBe('2');
  });

  it('still draws gap lines between non-focused frames (session context)', () => {
    const svg = buildAnnotationSvg(
      {
        frames: [
          { index: 1, bounds: { x: 0, y: 50, width: 100, height: 50 } },
          { index: 2, bounds: { x: 150, y: 50, width: 100, height: 50 } }
        ],
        gaps: [{ from: 1, to: 2, axis: 'horizontal', px: 50 }],
        canvas: { width: 400, height: 200 }
      },
      { focusFrame: 1 }
    );
    // only frame 1 has an outline
    expect(svg.querySelectorAll('rect[data-role="frame-outline"]').length).toBe(1);
    // but gap line between 1 and 2 is still drawn
    expect(svg.querySelectorAll('[data-role="gap-main"]').length).toBe(1);
  });
});
