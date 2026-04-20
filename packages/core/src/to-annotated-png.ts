import { buildAnnotationSvg } from './annotate.js';
import type { AnnotatedPngOptions, Session } from './types.js';

const OVERLAY_ID = 'specsnap-capture-overlay';

/**
 * Render a session as an annotated PNG (or JPEG) Blob. Browser-only.
 *
 * Computes the minimum bounding box over session frames, injects an SVG
 * annotation layer, invokes `dom-to-image-more` with a transform-based crop,
 * then cleans up. `dom-to-image-more` is dynamic-imported — consumers who
 * only use `toJSON`/`toMarkdown` don't pay the bundle cost.
 */
export async function toAnnotatedPNG(
  session: Session,
  options: AnnotatedPngOptions = {}
): Promise<Blob> {
  if (session.frames.length === 0) {
    throw new Error('SpecSnap: cannot screenshot an empty session (no frames)');
  }

  const padding = options.padding ?? 16;
  const bbox = computeBbox(session, padding);
  const overlay = mountOverlay(session, bbox, options);

  try {
    const dtim = await import('dom-to-image-more');
    const toBlob = dtim.default?.toBlob ?? dtim.toBlob;
    const pixelRatio = options.pixelRatio ?? session.viewport.devicePixelRatio ?? 1;
    const blob = await toBlob(document.body, {
      width: bbox.width,
      height: bbox.height,
      pixelRatio,
      bgcolor: options.background ?? '#ffffff',
      quality: options.quality ?? 0.92,
      style: {
        transform: `translate(${-bbox.x}px, ${-bbox.y}px)`,
        transformOrigin: '0 0'
      } as Partial<CSSStyleDeclaration>
    });
    return blob;
  }
  finally {
    overlay.remove();
  }
}

function computeBbox(session: Session, padding: number): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  const first = session.frames[0]!.rect;
  let minX = first.x;
  let minY = first.y;
  let maxX = first.x + first.width;
  let maxY = first.y + first.height;
  for (const f of session.frames) {
    minX = Math.min(minX, f.rect.x);
    minY = Math.min(minY, f.rect.y);
    maxX = Math.max(maxX, f.rect.x + f.rect.width);
    maxY = Math.max(maxY, f.rect.y + f.rect.height);
  }
  return {
    x: minX - padding,
    y: minY - padding,
    width: maxX - minX + padding * 2,
    height: maxY - minY + padding * 2
  };
}

function mountOverlay(
  session: Session,
  bbox: { x: number; y: number; width: number; height: number },
  options: AnnotatedPngOptions
): HTMLDivElement {
  const host = document.createElement('div');
  host.id = OVERLAY_ID;
  host.style.cssText = [
    'position:absolute',
    `left:${bbox.x}px`,
    `top:${bbox.y}px`,
    `width:${bbox.width}px`,
    `height:${bbox.height}px`,
    'pointer-events:none',
    'z-index:2147483647'
  ].join(';');

  const annotateOptions: {
    badges?: boolean;
    gaps?: boolean;
    sizeLabels?: boolean;
  } = {};
  if (options.badges !== undefined) annotateOptions.badges = options.badges;
  if (options.gaps !== undefined) annotateOptions.gaps = options.gaps;
  if (options.sizeLabels !== undefined) annotateOptions.sizeLabels = options.sizeLabels;

  const svg = buildAnnotationSvg(
    {
      frames: session.frames.map((f) => ({
        index: f.index,
        bounds: {
          x: f.rect.x - bbox.x,
          y: f.rect.y - bbox.y,
          width: f.rect.width,
          height: f.rect.height
        }
      })),
      gaps: session.gaps,
      canvas: { width: bbox.width, height: bbox.height }
    },
    annotateOptions
  );
  host.appendChild(svg);
  document.body.appendChild(host);
  return host;
}
