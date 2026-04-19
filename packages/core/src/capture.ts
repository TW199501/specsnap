import { SCHEMA_VERSION } from './types.js';
import type {
  Background,
  BoxModel,
  ElementIdentity,
  FourSides,
  Frame,
  Gap,
  Rect,
  Session,
  Typography
} from './types.js';
import { computeGap } from './gap.js';
import { captureScroll, captureViewport } from './viewport.js';

/**
 * Capture one DOM element into a Frame object.
 */
export function captureElement(el: Element, index: number): Frame {
  if (!el.isConnected) {
    throw new Error('SpecSnap: element is not attached to the document');
  }

  const rect = domRect(el);
  const style = getComputedStyle(el);

  return {
    index,
    identity: identify(el),
    rect,
    viewportRelative: {
      xPct: round((rect.x / window.innerWidth) * 100, 2),
      yPct: round((rect.y / window.innerHeight) * 100, 2)
    },
    boxModel: readBoxModel(style, rect),
    typography: readTypography(style),
    background: readBackground(style)
  };
}

/** Capture a whole session: N elements + viewport context. */
export function captureSession(elements: readonly Element[]): Session {
  const frames = elements.map((el, i) => captureElement(el, i + 1));

  const gaps: Gap[] = [];
  for (let i = 1; i < frames.length; i++) {
    const g = computeGap(
      frames[i - 1]!.index,
      frames[i]!.index,
      frames[i - 1]!.rect,
      frames[i]!.rect
    );
    if (g) gaps.push(g);
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    id: makeSessionId(),
    capturedAt: new Date().toISOString(),
    url: typeof location === 'undefined' ? '' : location.href,
    pageTitle: typeof document === 'undefined' ? '' : document.title,
    viewport: captureViewport(),
    scroll: captureScroll(),
    frames,
    gaps
  };
}

// ─── helpers ──────────────────────────────────────────────

function domRect(el: Element): Rect {
  const r = el.getBoundingClientRect();
  return {
    x: round(r.left + window.scrollX, 2),
    y: round(r.top + window.scrollY, 2),
    width: round(r.width, 2),
    height: round(r.height, 2)
  };
}

function readBoxModel(style: CSSStyleDeclaration, rect: Rect): BoxModel {
  const padding = fourSides(style, 'padding');
  const border = fourSides(style, 'border', '-width');
  const margin = fourSides(style, 'margin');

  const contentWidth = rect.width - padding[1] - padding[3] - border[1] - border[3];
  const contentHeight = rect.height - padding[0] - padding[2] - border[0] - border[2];

  return {
    content: {
      width: round(Math.max(0, contentWidth), 2),
      height: round(Math.max(0, contentHeight), 2)
    },
    padding,
    border,
    margin
  };
}

function fourSides(
  style: CSSStyleDeclaration,
  prop: 'padding' | 'margin' | 'border',
  suffix = ''
): FourSides {
  const read = (side: 'top' | 'right' | 'bottom' | 'left') =>
    parsePx(style.getPropertyValue(`${prop}-${side}${suffix}`));
  return [read('top'), read('right'), read('bottom'), read('left')];
}

function parsePx(v: string): number {
  const n = parseFloat(v);
  return Number.isFinite(n) ? round(n, 2) : 0;
}

function readTypography(style: CSSStyleDeclaration): Typography {
  return {
    fontFamily: style.fontFamily,
    fontSize: parsePx(style.fontSize),
    fontWeight: style.fontWeight,
    lineHeight: style.lineHeight,
    letterSpacing: style.letterSpacing,
    color: style.color,
    textAlign: style.textAlign
  };
}

function readBackground(style: CSSStyleDeclaration): Background {
  return {
    color: style.backgroundColor,
    image: style.backgroundImage,
    borderRadius: [
      parsePx(style.borderTopLeftRadius),
      parsePx(style.borderTopRightRadius),
      parsePx(style.borderBottomRightRadius),
      parsePx(style.borderBottomLeftRadius)
    ]
  };
}

function identify(el: Element): ElementIdentity {
  const tagName = el.tagName.toLowerCase();
  const id = el.id || null;
  const classList = [...el.classList];
  const name = formatName(tagName, id, classList, el.textContent);
  const domPath = buildDomPath(el);
  return { tagName, id, classList, name, domPath };
}

function formatName(
  tag: string,
  id: string | null,
  classes: readonly string[],
  text: string | null
): string {
  if (id) return `${tag}#${id}`;
  const snippet = text ? text.trim().slice(0, 24) : '';
  if (snippet) return `${tag}[text="${snippet}"]`;
  return classes[0] ? `${tag}.${classes[0]}` : tag;
}

function buildDomPath(el: Element): string {
  const parts: string[] = [];
  let node: Element | null = el;

  while (node && node.nodeType === Node.ELEMENT_NODE) {
    let segment = node.tagName.toLowerCase();
    if (node.id) {
      parts.unshift(`${segment}#${CSS.escape(node.id)}`);
      break;
    }
    const parent: Element | null = node.parentElement;
    if (parent) {
      const siblings = [...parent.children].filter(
        (c) => c.tagName === node!.tagName
      );
      if (siblings.length > 1) {
        segment += `:nth-of-type(${siblings.indexOf(node) + 1})`;
      }
    }
    parts.unshift(segment);
    node = parent;
  }
  return parts.join(' > ');
}

function round(n: number, decimals: number): number {
  const p = 10 ** decimals;
  return Math.round(n * p) / p;
}

function makeSessionId(): string {
  return 's-' + Math.random().toString(36).slice(2, 8);
}
