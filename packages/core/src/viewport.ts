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
