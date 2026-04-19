import { captureSession, toJSON, toMarkdown } from '@tw199501/specsnap-core';

const startBtn = document.getElementById('start') as HTMLButtonElement | null;
const hintEl = document.getElementById('hint');
const mdEl = document.getElementById('md');
const jsonEl = document.getElementById('json');
const targetsEl = document.querySelector('.targets');

if (!startBtn || !hintEl || !mdEl || !jsonEl || !targetsEl) {
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
  mdEl!.textContent = toMarkdown(session)[0] ?? '';
  jsonEl!.textContent = toJSON(session);

  setInspecting(false);
  const tag = e.target.tagName.toLowerCase();
  const id = e.target.id ? `#${e.target.id}` : '';
  hintEl!.textContent = `Captured: ${tag}${id}. Click "Start inspect mode" again to capture another element.`;
}, true);

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && inspecting) {
    setInspecting(false);
    hintEl!.textContent = 'Cancelled.';
  }
});
