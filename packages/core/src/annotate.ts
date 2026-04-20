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

/**
 * Build a detached SVG annotation layer. Coordinate-agnostic — caller decides
 * whether `bounds` are viewport-relative (for fixed overlays) or
 * document-relative (for PNG capture). The returned SVG is not yet attached.
 */
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
