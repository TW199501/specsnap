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
