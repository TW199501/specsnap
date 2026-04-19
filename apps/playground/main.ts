import { captureSession, toJSON, toMarkdown } from '@tw199501/specsnap-core';

const inspectBtn = document.getElementById('inspect');
if (!inspectBtn) throw new Error('playground: #inspect not found');

inspectBtn.addEventListener('click', () => {
  const target = document.getElementById('save');
  if (!target) return;
  const session = captureSession([target]);
  const mdEl = document.getElementById('md');
  const jsonEl = document.getElementById('json');
  if (mdEl) mdEl.textContent = toMarkdown(session)[0] ?? '';
  if (jsonEl) jsonEl.textContent = toJSON(session);
});
