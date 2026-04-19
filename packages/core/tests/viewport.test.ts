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
