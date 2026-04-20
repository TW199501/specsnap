import type { Gap } from './types.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

const STROKE_SELECTED = '#2563eb';
const FILL_SELECTED = '#2563eb';
const STROKE_GAP = '#ff5000';
const FILL_GAP = '#ff5000';

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

function drawHorizontalGap(
  svg: SVGElement,
  a: AnnotateBounds,
  b: AnnotateBounds,
  px: number
): void {
  const aRight = a.x + a.width;
  const bRight = b.x + b.width;
  const left = aRight <= b.x ? { right: aRight } : { right: bRight };
  const right = aRight <= b.x ? { left: b.x } : { left: a.x };
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
  const top = aBottom <= b.y ? { bottom: aBottom } : { bottom: bBottom };
  const bottom = aBottom <= b.y ? { top: b.y } : { top: a.y };
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

function el(name: string, attrs: Record<string, string | number>): SVGElement {
  const node = document.createElementNS(SVG_NS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  return node;
}
