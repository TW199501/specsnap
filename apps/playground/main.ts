import { captureSession, toJSON, toMarkdown } from '@tw199501/specsnap-core';

import { clearOverlay, renderBoxModel, renderOverlay } from './visualizer.js';

const startBtn = document.getElementById('start') as HTMLButtonElement | null;
const hintEl = document.getElementById('hint');
const mdEl = document.getElementById('md');
const jsonEl = document.getElementById('json');
const boxModelEl = document.getElementById('box-model');
const targetsEl = document.querySelector('.targets');

if (!startBtn || !hintEl || !mdEl || !jsonEl || !boxModelEl || !targetsEl) {
  throw new Error('playground: required elements missing');
}

let inspecting = false;

function setInspecting(on: boolean): void {
  inspecting = on;
  document.body.classList.toggle('inspecting', on);
  startBtn!.classList.toggle('active', on);
  startBtn!.textContent = on ? 'Cancel (ESC)' : 'Start inspect mode';
  if (on) {
    hintEl!.textContent = 'Inspect mode ON — click any element inside the dashed box.';
  }
}

startBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  if (!inspecting) clearOverlay();
  setInspecting(!inspecting);
});

// Capture phase so we intercept before bubbling handlers (e.g. the <a> link default).
document.addEventListener('click', (e) => {
  if (!inspecting) return;
  if (!(e.target instanceof Element)) return;
  if (startBtn!.contains(e.target)) return;
  if (!targetsEl!.contains(e.target)) return;

  e.preventDefault();
  e.stopPropagation();

  const session = captureSession([e.target]);
  const frame = session.frames[0]!;

  mdEl!.textContent = toMarkdown(session)[0] ?? '';
  jsonEl!.textContent = toJSON(session);
  renderBoxModel(boxModelEl as HTMLElement, frame.boxModel);
  renderOverlay(e.target);

  setInspecting(false);
  const tag = e.target.tagName.toLowerCase();
  const id = e.target.id ? `#${e.target.id}` : '';
  hintEl!.textContent = `Captured: ${tag}${id} · ${Math.round(frame.rect.width)} × ${Math.round(frame.rect.height)} px`;
}, true);

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && inspecting) {
    setInspecting(false);
    hintEl!.textContent = 'Cancelled.';
  }
  else if (e.key === 'Escape') {
    clearOverlay();
    hintEl!.textContent = 'Overlay cleared.';
  }
});

// Keep the overlay aligned when the viewport resizes or the page scrolls while
// an element is still highlighted.
let lastTarget: Element | null = null;
function refreshOverlay(): void {
  if (lastTarget && lastTarget.isConnected) renderOverlay(lastTarget);
}
window.addEventListener('resize', refreshOverlay);
window.addEventListener('scroll', refreshOverlay, { passive: true });

// Track the last target so refresh can re-render.
document.addEventListener('click', (e) => {
  if (!(e.target instanceof Element)) return;
  if (targetsEl!.contains(e.target) && !startBtn!.contains(e.target)) {
    lastTarget = e.target;
  }
}, true);
