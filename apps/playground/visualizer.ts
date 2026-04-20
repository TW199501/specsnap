// SpecSnap playground visualizer.
// Renders:
//   1. Full-viewport overlay — blue outline + numbered badge on each selected
//      element, red dashed outline on the immediate parent of the most recent
//      selection, AND distance lines between sibling selections showing the
//      px gap between them (matches reference screenshot 1).
//   2. Box model diagram for the most recently selected element — concentric
//      margin/border/padding/content rectangles with per-side numeric labels
//      (matches reference screenshot 2).
//
// Pure DOM + SVG. No runtime deps. The multi-select + gap visualization is
// the differentiator from market tools (which only capture one element).

import type { Gap } from '@tw199501/specsnap-core';

const SVG_NS = 'http://www.w3.org/2000/svg';

const STROKE_SELECTED = '#2563eb'; // blue
const STROKE_PARENT = '#dc2626';   // red
const STROKE_GAP = '#ff5000';      // orange (distance lines)
const FILL_SELECTED = '#2563eb';
const FILL_PARENT = '#dc2626';
const FILL_GAP = '#ff5000';

const BM_MARGIN = '#e9d8a6';
const BM_BORDER = '#d4a373';
const BM_PADDING = '#a7c957';
const BM_CONTENT = '#7fb3d5';

let overlayEl: HTMLDivElement | null = null;

function ensureOverlay(): HTMLDivElement {
  if (overlayEl) return overlayEl;
  const el = document.createElement('div');
  el.id = 'specsnap-overlay';
  el.style.cssText = [
    'position:fixed',
    'inset:0',
    'pointer-events:none',
    'z-index:99999'
  ].join(';');
  document.body.appendChild(el);
  overlayEl = el;
  return el;
}

function removeAllChildren(node: Node): void {
  while (node.firstChild) node.removeChild(node.firstChild);
}

export function clearOverlay(): void {
  if (overlayEl) removeAllChildren(overlayEl);
}

function createSvg(name: string, attrs: Record<string, string | number>): SVGElement {
  const el = document.createElementNS(SVG_NS, name);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
}

/** Render a pill-shaped label with background. */
function addLabel(
  parent: SVGElement,
  text: string,
  x: number,
  y: number,
  color: string,
  anchor: 'start' | 'middle' | 'end' = 'start'
): void {
  const padX = 5;
  const approxW = text.length * 7;
  let bgX = x;
  if (anchor === 'middle') bgX = x - approxW / 2 - padX;
  else if (anchor === 'end') bgX = x - approxW - padX * 2;
  const bg = createSvg('rect', {
    x: bgX,
    y: y - 10,
    width: approxW + padX * 2,
    height: 16,
    rx: 3,
    ry: 3,
    fill: color
  });
  const t = createSvg('text', {
    x: anchor === 'middle' ? x : anchor === 'end' ? x - padX : x + padX,
    y: y + 2,
    fill: '#fff',
    'font-family': 'system-ui, sans-serif',
    'font-size': 11,
    'font-weight': 600,
    'text-anchor': anchor === 'middle' ? 'middle' : anchor === 'end' ? 'end' : 'start'
  });
  t.textContent = text;
  parent.appendChild(bg);
  parent.appendChild(t);
}

/** Render a numbered circular badge. */
function addBadge(parent: SVGElement, n: number, x: number, y: number, color: string): void {
  const circle = createSvg('circle', {
    cx: x,
    cy: y,
    r: 10,
    fill: color,
    stroke: '#fff',
    'stroke-width': 2
  });
  const text = createSvg('text', {
    x,
    y: y + 3,
    fill: '#fff',
    'font-family': 'system-ui, sans-serif',
    'font-size': 11,
    'font-weight': 700,
    'text-anchor': 'middle'
  });
  text.textContent = String(n);
  parent.appendChild(circle);
  parent.appendChild(text);
}

interface RectBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

function toBounds(r: DOMRect): RectBounds {
  return {
    left: r.left,
    top: r.top,
    right: r.right,
    bottom: r.bottom,
    width: r.width,
    height: r.height
  };
}

/**
 * Draw a horizontal or vertical distance marker between two sibling rects,
 * using gap metadata (axis + px) from the core schema instead of recomputing.
 */
function drawGapFromSchema(svg: SVGElement, a: RectBounds, b: RectBounds, gap: Gap): void {
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

/**
 * Render the on-page overlay for N captured elements.
 * Draws:
 *   - Red dashed outline on the parent of the MOST RECENT selection
 *   - Blue solid outline + numbered badge + size label on every selection
 *   - Orange dashed distance lines driven by gap metadata from the core schema
 */
export function renderOverlay(targets: readonly Element[], gaps: readonly Gap[] = []): void {
  clearOverlay();
  if (targets.length === 0) return;

  const overlay = ensureOverlay();
  const svg = createSvg('svg', { width: '100%', height: '100%' }) as SVGSVGElement;
  svg.style.width = '100%';
  svg.style.height = '100%';
  overlay.appendChild(svg);

  // Parent of the most-recent target, drawn in red.
  const last = targets[targets.length - 1]!;
  const parent = last.parentElement;
  if (parent && parent !== document.body) {
    const pr = parent.getBoundingClientRect();
    svg.appendChild(createSvg('rect', {
      x: pr.left, y: pr.top, width: pr.width, height: pr.height,
      fill: 'none', stroke: STROKE_PARENT, 'stroke-width': 1.5, 'stroke-dasharray': '4 3'
    }));
    addLabel(
      svg,
      `parent · ${Math.round(pr.width)} × ${Math.round(pr.height)} px`,
      pr.left,
      pr.top - 4,
      FILL_PARENT,
      'start'
    );
  }

  // Each selected element — draw outline, size label, and numbered badge.
  targets.forEach((el, i) => {
    const r = el.getBoundingClientRect();
    svg.appendChild(createSvg('rect', {
      x: r.left, y: r.top, width: r.width, height: r.height,
      fill: 'none', stroke: STROKE_SELECTED, 'stroke-width': 2
    }));
    addLabel(
      svg,
      `${Math.round(r.width)} × ${Math.round(r.height)} px`,
      r.left + r.width,
      r.top - 4,
      FILL_SELECTED,
      'end'
    );
    addBadge(svg, i + 1, r.left - 10, r.top - 10, FILL_SELECTED);
  });

  // Distance lines — read axis + px from core schema, map 1-based indices to viewport bounds.
  const boundsByIndex = new Map<number, RectBounds>();
  targets.forEach((el, i) => {
    boundsByIndex.set(i + 1, toBounds(el.getBoundingClientRect()));
  });
  for (const gap of gaps) {
    const fromBounds = boundsByIndex.get(gap.from);
    const toBounds_ = boundsByIndex.get(gap.to);
    if (!fromBounds || !toBounds_) continue;
    drawGapFromSchema(svg, fromBounds, toBounds_, gap);
  }
}

// ─── Box model diagram ────────────────────────────────────────────────

export interface BoxModelInput {
  content: { width: number; height: number };
  padding: readonly [number, number, number, number];
  border: readonly [number, number, number, number];
  margin: readonly [number, number, number, number];
}

export interface FrameForDiagram {
  index: number;
  name: string;
  boxModel: BoxModelInput;
}

/**
 * Render N box model diagrams into the given container, one per captured frame.
 * Each card has the element's identity name + numbered badge as a header,
 * matching the badge number on the on-page overlay.
 */
export function renderBoxModels(container: HTMLElement, frames: readonly FrameForDiagram[]): void {
  removeAllChildren(container);
  for (const frame of frames) {
    const card = document.createElement('div');
    card.className = 'box-model-card';

    const header = document.createElement('div');
    header.className = 'box-model-header';

    const badge = document.createElement('span');
    badge.className = 'box-model-badge';
    badge.textContent = String(frame.index);

    const name = document.createElement('span');
    name.className = 'box-model-name';
    name.textContent = frame.name;

    header.appendChild(badge);
    header.appendChild(name);
    card.appendChild(header);

    const svgHolder = document.createElement('div');
    drawBoxModelSvg(svgHolder, frame.boxModel);
    card.appendChild(svgHolder);

    container.appendChild(card);
  }
}

/**
 * Render a single box model diagram into the given container. Clears the container first.
 * Diagram is a fixed 360×220 SVG — sizes inside it are schematic (not to scale)
 * so a 0-margin element is still readable alongside a 40px-content element.
 */
export function renderBoxModel(container: HTMLElement, box: BoxModelInput): void {
  removeAllChildren(container);
  drawBoxModelSvg(container, box);
}

function drawBoxModelSvg(container: HTMLElement, box: BoxModelInput): void {
  const W = 360;
  const H = 220;
  const svg = createSvg('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}` }) as SVGSVGElement;
  svg.style.display = 'block';

  const layers: Array<{
    color: string;
    label: string;
    values: readonly [number, number, number, number];
  }> = [
    { color: BM_MARGIN, label: 'margin', values: box.margin },
    { color: BM_BORDER, label: 'border', values: box.border },
    { color: BM_PADDING, label: 'padding', values: box.padding }
  ];

  const INSET = 22;
  for (let i = 0; i < layers.length; i++) {
    const layer = layers[i]!;
    const x = INSET * (i + 1);
    const y = INSET * (i + 1);
    const w = W - x * 2;
    const h = H - y * 2;

    svg.appendChild(createSvg('rect', {
      x, y, width: w, height: h,
      fill: layer.color, stroke: '#00000022', 'stroke-width': 1
    }));

    const labelText = createSvg('text', {
      x: x + 6, y: y + 12,
      fill: '#333',
      'font-family': 'system-ui, sans-serif',
      'font-size': 10, 'font-weight': 700
    });
    labelText.textContent = layer.label.toUpperCase();
    svg.appendChild(labelText);

    const [top, right, bottom, left] = layer.values;
    addNumber(svg, top, x + w / 2, y + 14, 'middle');
    addNumber(svg, right, x + w - 6, y + h / 2 + 3, 'end');
    addNumber(svg, bottom, x + w / 2, y + h - 6, 'middle');
    addNumber(svg, left, x + 8, y + h / 2 + 3, 'start');
  }

  // Content rect must sit inside the padding layer so padding's 4 edge numbers
  // stay visible — use one extra INSET beyond the padding layer.
  const cx = INSET * (layers.length + 1);
  const cy = INSET * (layers.length + 1);
  const cw = W - cx * 2;
  const ch = H - cy * 2;
  svg.appendChild(createSvg('rect', {
    x: cx, y: cy, width: cw, height: ch,
    fill: BM_CONTENT, stroke: '#00000033', 'stroke-width': 1
  }));
  const sizeText = createSvg('text', {
    x: cx + cw / 2, y: cy + ch / 2 + 4,
    fill: '#fff',
    'font-family': 'system-ui, sans-serif',
    'font-size': 14, 'font-weight': 700,
    'text-anchor': 'middle'
  });
  sizeText.textContent = `${Math.round(box.content.width)} × ${Math.round(box.content.height)}`;
  svg.appendChild(sizeText);

  container.appendChild(svg);
}

function addNumber(
  parent: SVGElement,
  value: number,
  x: number,
  y: number,
  anchor: 'start' | 'middle' | 'end'
): void {
  const t = createSvg('text', {
    x, y,
    fill: '#222',
    'font-family': 'system-ui, sans-serif',
    'font-size': 10, 'font-weight': 600,
    'text-anchor': anchor
  });
  t.textContent = String(Math.round(value));
  parent.appendChild(t);
}
