import {
  captureSession,
  formatCaptureId,
  formatDateYYYYMMDD,
  toJSON,
  toMarkdown,
  toSpecSnapBundle
} from '@tw199501/specsnap-core';
import type { Gap, Session } from '@tw199501/specsnap-core';

import { clearOverlay, renderBoxModels, renderOverlay } from './visualizer.js';

const panel = document.getElementById('specsnap-panel') as HTMLDivElement | null;
const header = document.getElementById('specsnap-drag-handle') as HTMLDivElement | null;
const closeBtn = document.getElementById('specsnap-close') as HTMLButtonElement | null;
const inspectBtn = document.getElementById('specsnap-inspect') as HTMLButtonElement | null;
const clearBtn = document.getElementById('specsnap-clear') as HTMLButtonElement | null;
const copyBtn = document.getElementById('specsnap-copy') as HTMLButtonElement | null;
const hintEl = document.getElementById('specsnap-hint') as HTMLDivElement | null;
const outputEl = document.getElementById('specsnap-output') as HTMLPreElement | null;
const emptyEl = document.getElementById('specsnap-empty') as HTMLDivElement | null;
const jsonEl = document.getElementById('specsnap-json') as HTMLPreElement | null;
const captureIdEl = document.getElementById('specsnap-capture-id') as HTMLSpanElement | null;
const boxModelEl = document.getElementById('box-model') as HTMLDivElement | null;
const targetsEl = document.querySelector('.targets') as HTMLDivElement | null;

if (
  !panel || !header || !closeBtn || !inspectBtn || !clearBtn || !copyBtn
  || !hintEl || !outputEl || !emptyEl || !jsonEl || !captureIdEl
  || !boxModelEl || !targetsEl
) {
  throw new Error('playground: required elements missing');
}

// ─── Daily sequence counter (localStorage) ────────────────────────────────────

function nextDailySequence(): { sequence: number; captureId: string; today: string } {
  const today = formatDateYYYYMMDD(new Date());
  const key = `specsnap-daily-count-${today}`;
  const raw = localStorage.getItem(key);
  const current = raw ? parseInt(raw, 10) : 0;
  const sequence = Math.min(99, current + 1);
  return { sequence, captureId: formatCaptureId(new Date(), sequence), today };
}

function commitDailySequence(sequence: number): void {
  const today = formatDateYYYYMMDD(new Date());
  localStorage.setItem(`specsnap-daily-count-${today}`, String(sequence));
}

// Preview the NEXT sequence number in the header so user knows what filename this capture will get.
function refreshCaptureIdPreview(): void {
  const { captureId } = nextDailySequence();
  captureIdEl!.textContent = `· next: ${captureId}`;
}

// ─── State ────────────────────────────────────────────────────────────────────

let inspecting = false;
let selections: Element[] = [];
let lastGaps: Gap[] = [];
let renderToken = 0;

// ─── Initial panel position — right side, below top bar ───────────────────────

const PANEL_W = 420;
const PANEL_H = 540;
panel.style.left = `${Math.max(16, window.innerWidth - PANEL_W - 16)}px`;
panel.style.top = `${Math.max(16, window.innerHeight - PANEL_H - 48)}px`;

// ─── Drag handling ────────────────────────────────────────────────────────────

let dragState: { startX: number; startY: number; origLeft: number; origTop: number } | null = null;

header.addEventListener('mousedown', (e) => {
  if (!(e.target instanceof Element)) return;
  if (e.target.closest('button')) return;
  const rect = panel!.getBoundingClientRect();
  dragState = { startX: e.clientX, startY: e.clientY, origLeft: rect.left, origTop: rect.top };
  document.body.style.userSelect = 'none';
});

window.addEventListener('mousemove', (e) => {
  if (!dragState) return;
  const nx = dragState.origLeft + (e.clientX - dragState.startX);
  const ny = dragState.origTop + (e.clientY - dragState.startY);
  const maxX = window.innerWidth - panel!.offsetWidth;
  const maxY = window.innerHeight - panel!.offsetHeight;
  panel!.style.left = `${Math.max(0, Math.min(nx, maxX))}px`;
  panel!.style.top = `${Math.max(0, Math.min(ny, maxY))}px`;
});

window.addEventListener('mouseup', () => {
  if (dragState) {
    dragState = null;
    document.body.style.userSelect = '';
  }
});

// ─── Rendering ────────────────────────────────────────────────────────────────

function removeAllChildren(node: Node): void {
  while (node.firstChild) node.removeChild(node.firstChild);
}

function refreshHint(): void {
  removeAllChildren(hintEl!);
  if (inspecting) {
    hintEl!.className = 'specsnap-hint inspecting';
    const dot = document.createElement('span');
    dot.className = 'specsnap-pulse-dot';
    hintEl!.appendChild(dot);
    hintEl!.appendChild(document.createTextNode(
      'Inspecting — click elements to add/remove · ESC or Done to finish'
    ));
    return;
  }
  hintEl!.className = 'specsnap-hint';
  hintEl!.textContent = selections.length === 0
    ? 'Click Start Inspect, then click any element in the target area.'
    : `${selections.length} frame(s) captured. Click Copy MD to bundle.`;
}

function refreshInspectBtn(): void {
  if (inspecting) {
    inspectBtn!.classList.add('active');
    inspectBtn!.textContent = selections.length === 0 ? 'Done (ESC)' : `Done (${selections.length})`;
  }
  else {
    inspectBtn!.classList.remove('active');
    inspectBtn!.textContent = selections.length === 0
      ? 'Start Inspect'
      : `Start Inspect · ${selections.length}`;
  }
}

function showOutput(markdownPreview: string): void {
  outputEl!.style.display = 'block';
  emptyEl!.style.display = 'none';
  outputEl!.textContent = markdownPreview;
}

function showEmpty(): void {
  outputEl!.style.display = 'none';
  emptyEl!.style.display = 'flex';
  outputEl!.textContent = '';
  jsonEl!.textContent = '';
}

function renderLive(): void {
  const token = ++renderToken;
  if (token === 0) { /* no-op guard */ }

  if (selections.length === 0) {
    clearOverlay();
    removeAllChildren(boxModelEl!);
    showEmpty();
    lastGaps = [];
    clearBtn!.disabled = true;
    copyBtn!.disabled = true;
    return;
  }

  const session: Session = captureSession(selections);
  lastGaps = session.gaps;

  renderOverlay(selections, session.gaps);
  renderBoxModels(
    boxModelEl!,
    session.frames.map((f) => ({
      index: f.index,
      name: f.identity.name,
      boxModel: f.boxModel
    }))
  );

  // Preview the MD that will be copied (no image filenames yet — user sees the shape).
  // On Copy, toSpecSnapBundle injects ![Frame N](./…png) references.
  const preview = toMarkdown(session).join('\n\n---\n\n');
  showOutput(preview);
  jsonEl!.textContent = toJSON(session);

  clearBtn!.disabled = false;
  copyBtn!.disabled = false;
}

// ─── Controls ─────────────────────────────────────────────────────────────────

function setInspecting(on: boolean): void {
  inspecting = on;
  document.body.classList.toggle('specsnap-inspecting', on);
  refreshInspectBtn();
  refreshHint();
}

inspectBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  if (inspecting) {
    setInspecting(false);
  }
  else {
    selections = [];
    renderLive();
    setInspecting(true);
  }
});

clearBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  selections = [];
  setInspecting(false);
  renderLive();
  refreshInspectBtn();
  refreshHint();
});

closeBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  setInspecting(false);
  panel!.style.display = 'none';
});

/**
 * Copy MD action:
 *   1. Bundle the session (MD text + PNG Blobs named YYYYMMDD-NN-k.png)
 *   2. Write the MD (with ./*.png refs) to clipboard
 *   3. Trigger browser downloads for each PNG + the MD file itself
 *      — user ends up with all the files named right, drop them into
 *      specsnap/YYYYMMDD/ on disk manually.
 *   4. Bump the daily sequence in localStorage so the next capture gets NN+1.
 */
copyBtn.addEventListener('click', async () => {
  if (selections.length === 0) return;
  copyBtn!.disabled = true;
  const originalLabel = copyBtn!.textContent;
  copyBtn!.textContent = 'Bundling…';

  try {
    const session = captureSession(selections);
    const { sequence } = nextDailySequence();
    const bundle = await toSpecSnapBundle(session, { sequence });

    await navigator.clipboard.writeText(bundle.markdownContent);

    triggerDownload(bundle.markdownFilename, new Blob([bundle.markdownContent], { type: 'text/markdown' }));
    for (const img of bundle.images) triggerDownload(img.filename, img.blob);

    commitDailySequence(sequence);
    refreshCaptureIdPreview();

    copyBtn!.classList.add('flash');
    copyBtn!.textContent = `Copied ${bundle.captureId} ✓`;
    setTimeout(() => {
      copyBtn!.classList.remove('flash');
      copyBtn!.textContent = originalLabel;
      copyBtn!.disabled = false;
    }, 1600);
  }
  catch (err) {
    console.error('[specsnap] bundle failed:', err);
    hintEl!.textContent = `Bundle failed: ${String(err instanceof Error ? err.message : err)}`;
    copyBtn!.textContent = originalLabel;
    copyBtn!.disabled = false;
  }
});

function triggerDownload(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ─── Capture click handler (outside the panel) ────────────────────────────────

document.addEventListener('click', (e) => {
  if (!inspecting) return;
  if (!(e.target instanceof Element)) return;
  if (panel!.contains(e.target)) return;
  if (!targetsEl!.contains(e.target)) return;

  e.preventDefault();
  e.stopPropagation();

  const idx = selections.indexOf(e.target);
  if (idx >= 0) selections.splice(idx, 1);
  else selections.push(e.target);

  renderLive();
  refreshInspectBtn();
  refreshHint();
}, true);

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (inspecting) setInspecting(false);
});

window.addEventListener('resize', () => {
  if (selections.length) renderOverlay(selections, lastGaps);
});
window.addEventListener('scroll', () => {
  if (selections.length) renderOverlay(selections, lastGaps);
}, { passive: true });

// Initial state
refreshInspectBtn();
refreshHint();
refreshCaptureIdPreview();
showEmpty();
