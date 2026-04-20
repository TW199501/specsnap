import type { Gap } from './types.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

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
  _options: AnnotateOptions = {}
): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg') as SVGSVGElement;
  svg.setAttribute('width', String(input.canvas.width));
  svg.setAttribute('height', String(input.canvas.height));
  svg.setAttribute('xmlns', SVG_NS);
  return svg;
}
