import { buildAnnotationSvg, computeGap, type Gap, type Rect } from '@tw199501/specsnap-core';

/**
 * Full-viewport overlay showing numbered badges + outlines on picked frames
 * and gap distance lines between consecutive frames. Pure DOM + SVG.
 *
 * The overlay is the on-page complement to the Inspector panel's frame list
 * — they share Frame.index so badge "1" on the page corresponds to entry 1
 * in the list, in Markdown, and in the saved PNG filename `-1.png`.
 *
 * Viewport-relative: frames are drawn using getBoundingClientRect() against
 * the overlay's `position:fixed;inset:0` container, so scroll position is
 * handled automatically as long as we re-render on scroll.
 */

const OVERLAY_ID = 'specsnap-inspector-overlay';

interface OverlayHandle {
  update: (frames: readonly HTMLElement[]) => void;
  destroy: () => void;
}

function rectOf(el: HTMLElement): Rect {
  const r = el.getBoundingClientRect();
  return { x: r.x, y: r.y, width: r.width, height: r.height };
}

export function createOverlay(): OverlayHandle {
  let host: HTMLDivElement | null = document.createElement('div');
  host.id = OVERLAY_ID;
  host.style.cssText = [
    'position:fixed',
    'inset:0',
    'pointer-events:none',
    'z-index:2147482999'
  ].join(';');
  document.body.appendChild(host);

  let currentFrames: readonly HTMLElement[] = [];

  function render(): void {
    if (!host) return;
    while (host.firstChild) host.removeChild(host.firstChild);
    if (currentFrames.length === 0) return;

    const annotateFrames = currentFrames.map((el, i) => ({
      index: i + 1,
      bounds: rectOf(el)
    }));

    const gaps: Gap[] = [];
    for (let i = 1; i < currentFrames.length; i++) {
      const prev = rectOf(currentFrames[i - 1]!);
      const curr = rectOf(currentFrames[i]!);
      const g = computeGap(i, i + 1, prev, curr);
      if (g) gaps.push(g);
    }

    const svg = buildAnnotationSvg(
      {
        frames: annotateFrames,
        gaps,
        canvas: { width: window.innerWidth, height: window.innerHeight }
      },
      { badges: true, sizeLabels: true, gaps: true }
    );
    host.appendChild(svg);
  }

  // Re-render on scroll/resize so outlines track elements as the page moves.
  let rafScheduled = false;
  function schedule(): void {
    if (rafScheduled) return;
    rafScheduled = true;
    requestAnimationFrame(() => {
      rafScheduled = false;
      render();
    });
  }
  window.addEventListener('scroll', schedule, true);
  window.addEventListener('resize', schedule);

  return {
    update(frames: readonly HTMLElement[]): void {
      currentFrames = frames;
      render();
    },
    destroy(): void {
      window.removeEventListener('scroll', schedule, true);
      window.removeEventListener('resize', schedule);
      if (host && host.parentNode) host.parentNode.removeChild(host);
      host = null;
      currentFrames = [];
    }
  };
}
