// SpecSnap playground visualizer.
// Renders:
//   1. Full-viewport overlay — blue outline on target + red outline on its parent,
//      with size labels (matches reference screenshot 1).
//   2. Box model diagram — concentric margin/border/padding/content boxes with
//      per-side numeric labels (matches reference screenshot 2).
//
// Pure DOM + SVG. No runtime deps. Designed so the core logic can move into the
// extension's content script later without rewriting.

const SVG_NS = 'http://www.w3.org/2000/svg';

const STROKE_SELECTED = '#2563eb'; // blue
const STROKE_PARENT = '#dc2626'; // red
const FILL_SELECTED = '#2563eb';
const FILL_PARENT = '#dc2626';

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

function addLabel(
  parent: SVGElement,
  text: string,
  x: number,
  y: number,
  color: string,
  anchor: 'start' | 'middle' | 'end' = 'start'
): void {
  // filled pill background for legibility
  const padX = 5;
  const padY = 3;
  const approxTextWidth = text.length * 7; // rough; OK for monospace-ish labels
  let rectX = x;
  if (anchor === 'middle') rectX = x - approxTextWidth / 2 - padX;
  else if (anchor === 'end') rectX = x - approxTextWidth - padX * 2;
  const bg = createSvg('rect', {
    x: rectX,
    y: y - 10,
    width: approxTextWidth + padX * 2,
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

/**
 * Render the on-page overlay for a captured element plus its immediate parent.
 * Coordinates are computed from live getBoundingClientRect at call time so that
 * scroll / viewport changes do not drift.
 */
export function renderOverlay(target: Element): void {
  clearOverlay();
  const overlay = ensureOverlay();

  const svg = createSvg('svg', {
    width: '100%',
    height: '100%'
  }) as SVGSVGElement;
  svg.style.width = '100%';
  svg.style.height = '100%';
  overlay.appendChild(svg);

  const parent = target.parentElement;
  if (parent && parent !== document.body) {
    const pr = parent.getBoundingClientRect();
    const parentRect = createSvg('rect', {
      x: pr.left,
      y: pr.top,
      width: pr.width,
      height: pr.height,
      fill: 'none',
      stroke: STROKE_PARENT,
      'stroke-width': 1.5,
      'stroke-dasharray': '4 3'
    });
    svg.appendChild(parentRect);
    addLabel(
      svg,
      `${Math.round(pr.width)}px × ${Math.round(pr.height)}px`,
      pr.left,
      pr.top - 4,
      FILL_PARENT,
      'start'
    );
  }

  const r = target.getBoundingClientRect();
  const rect = createSvg('rect', {
    x: r.left,
    y: r.top,
    width: r.width,
    height: r.height,
    fill: 'none',
    stroke: STROKE_SELECTED,
    'stroke-width': 2
  });
  svg.appendChild(rect);
  addLabel(
    svg,
    `${Math.round(r.width)}px × ${Math.round(r.height)}px`,
    r.left + r.width,
    r.top - 4,
    FILL_SELECTED,
    'end'
  );
}

// ─── Box model diagram ────────────────────────────────────────────────

export interface BoxModelInput {
  content: { width: number; height: number };
  padding: readonly [number, number, number, number];
  border: readonly [number, number, number, number];
  margin: readonly [number, number, number, number];
}

/**
 * Render a box model diagram into the given container. Clears the container first.
 * Diagram is a fixed 360×220 pixel SVG — sizes inside it are schematic (not to scale)
 * because a tiny 0 margin and a huge 40px content would look silly 1:1.
 */
export function renderBoxModel(container: HTMLElement, box: BoxModelInput): void {
  removeAllChildren(container);
  const W = 360;
  const H = 220;
  const svg = createSvg('svg', {
    width: W,
    height: H,
    viewBox: `0 0 ${W} ${H}`
  }) as SVGSVGElement;
  svg.style.display = 'block';

  const layers: Array<{ color: string; label: string; values: readonly [number, number, number, number] }> = [
    { color: BM_MARGIN, label: 'margin', values: box.margin },
    { color: BM_BORDER, label: 'border', values: box.border },
    { color: BM_PADDING, label: 'padding', values: box.padding }
  ];

  // Draw nested rectangles — each layer takes 20px inset from the previous.
  // The innermost rectangle represents the content box.
  const INSET = 22;
  for (let i = 0; i < layers.length; i++) {
    const layer = layers[i]!;
    const x = INSET * (i + 1);
    const y = INSET * (i + 1);
    const w = W - x * 2;
    const h = H - y * 2;
    const rect = createSvg('rect', {
      x,
      y,
      width: w,
      height: h,
      fill: layer.color,
      stroke: '#00000022',
      'stroke-width': 1
    });
    svg.appendChild(rect);

    // Label in the upper-left of this layer's "frame"
    const labelText = createSvg('text', {
      x: x + 6,
      y: y + 12,
      fill: '#333',
      'font-family': 'system-ui, sans-serif',
      'font-size': 10,
      'font-weight': 700,
      'text-transform': 'uppercase'
    });
    labelText.textContent = layer.label;
    svg.appendChild(labelText);

    // Four numeric labels: top / right / bottom / left
    const [top, right, bottom, left] = layer.values;
    addNumber(svg, top, x + w / 2, y + 14, 'middle');
    addNumber(svg, right, x + w - 6, y + h / 2 + 3, 'end');
    addNumber(svg, bottom, x + w / 2, y + h - 6, 'middle');
    addNumber(svg, left, x + 8, y + h / 2 + 3, 'start');
  }

  // Content area (innermost) — white/teal background + size text
  const cx = INSET * layers.length;
  const cy = INSET * layers.length;
  const cw = W - cx * 2;
  const ch = H - cy * 2;
  const contentRect = createSvg('rect', {
    x: cx,
    y: cy,
    width: cw,
    height: ch,
    fill: BM_CONTENT,
    stroke: '#00000033',
    'stroke-width': 1
  });
  svg.appendChild(contentRect);

  const sizeText = createSvg('text', {
    x: cx + cw / 2,
    y: cy + ch / 2 + 4,
    fill: '#fff',
    'font-family': 'system-ui, sans-serif',
    'font-size': 14,
    'font-weight': 700,
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
    x,
    y,
    fill: '#222',
    'font-family': 'system-ui, sans-serif',
    'font-size': 10,
    'font-weight': 600,
    'text-anchor': anchor
  });
  t.textContent = String(Math.round(value));
  parent.appendChild(t);
}
