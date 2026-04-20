import { beforeEach, describe, expect, it, vi } from 'vitest';

import { captureSession } from './capture.js';
import { clearBody, makeElement, mount } from './dom-fixture.js';
import { toAnnotatedPNG } from './to-annotated-png.js';

vi.mock('dom-to-image-more', () => ({
  default: {
    toBlob: vi.fn(async () => new Blob(['fake'], { type: 'image/png' }))
  },
  toBlob: vi.fn(async () => new Blob(['fake'], { type: 'image/png' }))
}));

describe('toAnnotatedPNG', () => {
  beforeEach(() => {
    clearBody();
  });

  it('throws when session has zero frames', async () => {
    const session = captureSession([]);
    await expect(toAnnotatedPNG(session)).rejects.toThrow(/empty|no frames/i);
  });

  it('returns a Blob for a non-empty session', async () => {
    const el = mount(makeElement({ id: 'x', text: 'hi' }));
    const session = captureSession([el]);
    const blob = await toAnnotatedPNG(session);
    expect(blob).toBeInstanceOf(Blob);
  });

  it('removes the injected overlay SVG after capture', async () => {
    const el = mount(makeElement({ id: 'x', text: 'hi' }));
    const session = captureSession([el]);
    await toAnnotatedPNG(session);
    expect(document.getElementById('specsnap-capture-overlay')).toBeNull();
  });

  it('cleans up the overlay even if dom-to-image-more rejects', async () => {
    const mod = await import('dom-to-image-more');
    const toBlob = mod.default.toBlob as ReturnType<typeof vi.fn>;
    toBlob.mockRejectedValueOnce(new Error('render failure'));

    const el = mount(makeElement({ id: 'x', text: 'hi' }));
    const session = captureSession([el]);
    await expect(toAnnotatedPNG(session)).rejects.toThrow(/render failure/);
    expect(document.getElementById('specsnap-capture-overlay')).toBeNull();
  });
});
