import { captureSession, toJSON, toMarkdown } from '@tw199501/specsnap-core';

import { clearOverlay, renderBoxModel, renderOverlay } from './visualizer.js';

const startBtn = document.getElementById('start') as HTMLButtonElement | null;
const clearBtn = document.getElementById('clear') as HTMLButtonElement | null;
const hintEl = document.getElementById('hint');
const mdEl = document.getElementById('md');
const jsonEl = document.getElementById('json');
const boxModelEl = document.getElementById('box-model');
const targetsEl = document.querySelector('.targets');

if (!startBtn || !clearBtn || !hintEl || !mdEl || !jsonEl || !boxModelEl || !targetsEl) {
  throw new Error('playground: required elements missing');
}

let inspecting = false;
let selections: Element[] = [];

function updateStartLabel(): void {
  if (inspecting) {
    startBtn!.textContent = selections.length === 0
      ? 'Inspect mode ON · Done (ESC)'
      : `Inspect mode ON · Done (${selections.length} captured)`;
  }
  else {
    startBtn!.textContent = selections.length === 0
      ? 'Start inspect mode'
      : `Start inspect mode · ${selections.length} captured`;
  }
}

function setInspecting(on: boolean): void {
  inspecting = on;
  document.body.classList.toggle('inspecting', on);
  startBtn!.classList.toggle('active', on);
  updateStartLabel();
  if (on) {
    hintEl!.textContent = 'Click any element inside the dashed box. Click the SAME element again to deselect it. Click "Done" / ESC when finished.';
  }
}

function renderOutputs(): void {
  if (selections.length === 0) {
    mdEl!.textContent = '';
    jsonEl!.textContent = '';
    removeChildrenOf(boxModelEl as HTMLElement);
    clearOverlay();
    return;
  }

  const session = captureSession(selections);
  const mdParts = toMarkdown(session);
  mdEl!.textContent = mdParts.join('\n\n━━━━━━━━━━━━━━━━━━━━━━━\n\n');
  jsonEl!.textContent = toJSON(session);

  // Box model for the most recently selected element.
  const last = session.frames[session.frames.length - 1]!;
  renderBoxModel(boxModelEl as HTMLElement, last.boxModel);

  renderOverlay(selections);
}

function removeChildrenOf(el: HTMLElement): void {
  while (el.firstChild) el.removeChild(el.firstChild);
}

startBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  if (inspecting) {
    // Toggle to "done"
    setInspecting(false);
    hintEl!.textContent = selections.length === 0
      ? 'No elements captured.'
      : `${selections.length} element(s) captured. Press Clear to start over.`;
  }
  else {
    // Fresh session: clear previous selections, enter mode.
    selections = [];
    renderOutputs();
    setInspecting(true);
  }
});

clearBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  selections = [];
  setInspecting(false);
  renderOutputs();
  hintEl!.textContent = 'Cleared.';
});

// Capture-phase click handler — intercepts before bubbling handlers like <a>.
document.addEventListener('click', (e) => {
  if (!inspecting) return;
  if (!(e.target instanceof Element)) return;
  if (startBtn!.contains(e.target)) return;
  if (clearBtn!.contains(e.target)) return;
  if (!targetsEl!.contains(e.target)) return;

  e.preventDefault();
  e.stopPropagation();

  const idx = selections.indexOf(e.target);
  if (idx >= 0) selections.splice(idx, 1);
  else selections.push(e.target);

  renderOutputs();
  updateStartLabel();
  hintEl!.textContent = selections.length === 0
    ? 'All deselected. Keep clicking, or press Done.'
    : `${selections.length} element(s) selected. Click more, or press Done.`;
}, true);

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (inspecting) {
    setInspecting(false);
    hintEl!.textContent = selections.length === 0
      ? 'No elements captured.'
      : `${selections.length} element(s) captured. Press Clear to start over.`;
  }
});

// Keep overlay aligned during scroll / resize while selections exist.
window.addEventListener('resize', () => {
  if (selections.length) renderOverlay(selections);
});
window.addEventListener('scroll', () => {
  if (selections.length) renderOverlay(selections);
}, { passive: true });
