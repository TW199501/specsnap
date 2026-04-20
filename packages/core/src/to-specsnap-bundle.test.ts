import { beforeEach, describe, expect, it, vi } from 'vitest';

import { captureSession } from './capture.js';
import { clearBody, makeElement, mount } from './dom-fixture.js';
import {
  formatCaptureId,
  formatDateYYYYMMDD,
  toSpecSnapBundle
} from './to-specsnap-bundle.js';

vi.mock('dom-to-image-more', () => ({
  default: {
    toBlob: vi.fn(async () => new Blob(['fake'], { type: 'image/png' }))
  },
  toBlob: vi.fn(async () => new Blob(['fake'], { type: 'image/png' }))
}));

describe('formatDateYYYYMMDD', () => {
  it('pads month and day with leading zero', () => {
    expect(formatDateYYYYMMDD(new Date(2026, 0, 5))).toBe('20260105');
    expect(formatDateYYYYMMDD(new Date(2026, 3, 20))).toBe('20260420');
    expect(formatDateYYYYMMDD(new Date(2026, 11, 31))).toBe('20261231');
  });
});

describe('formatCaptureId', () => {
  it('zero-pads sequence to 2 digits', () => {
    expect(formatCaptureId(new Date(2026, 3, 20), 1)).toBe('20260420-01');
    expect(formatCaptureId(new Date(2026, 3, 20), 7)).toBe('20260420-07');
    expect(formatCaptureId(new Date(2026, 3, 20), 99)).toBe('20260420-99');
  });

  it('clamps sequence to the 1-99 range', () => {
    expect(formatCaptureId(new Date(2026, 3, 20), 0)).toBe('20260420-01');
    expect(formatCaptureId(new Date(2026, 3, 20), 150)).toBe('20260420-99');
  });
});

describe('toSpecSnapBundle', () => {
  beforeEach(() => {
    clearBody();
  });

  it('throws for an empty session', async () => {
    const session = captureSession([]);
    await expect(toSpecSnapBundle(session)).rejects.toThrow(/empty|no frames/i);
  });

  it('produces dirName + captureId + md filename from date + sequence', async () => {
    const el = mount(makeElement({ id: 'x', text: 'hi' }));
    const session = captureSession([el]);
    const bundle = await toSpecSnapBundle(session, {
      date: new Date(2026, 3, 20),
      sequence: 3
    });
    expect(bundle.dirName).toBe('20260420');
    expect(bundle.captureId).toBe('20260420-03');
    expect(bundle.markdownFilename).toBe('20260420-03.md');
  });

  it('names each image as `<captureId>-<n>.png` starting from 1', async () => {
    const a = mount(makeElement({ id: 'a', text: 'A' }));
    const b = mount(makeElement({ id: 'b', text: 'B' }));
    const c = mount(makeElement({ id: 'c', text: 'C' }));
    const session = captureSession([a, b, c]);
    const bundle = await toSpecSnapBundle(session, {
      date: new Date(2026, 3, 20),
      sequence: 1
    });
    expect(bundle.images.map((i) => i.filename)).toEqual([
      '20260420-01-1.png',
      '20260420-01-2.png',
      '20260420-01-3.png'
    ]);
    for (const img of bundle.images) expect(img.blob).toBeInstanceOf(Blob);
  });

  it('embeds relative image refs matching the image filenames', async () => {
    const a = mount(makeElement({ id: 'a', text: 'A' }));
    const b = mount(makeElement({ id: 'b', text: 'B' }));
    const session = captureSession([a, b]);
    const bundle = await toSpecSnapBundle(session, {
      date: new Date(2026, 3, 20),
      sequence: 2
    });
    expect(bundle.markdownContent).toContain('![Frame 1](./20260420-02-1.png)');
    expect(bundle.markdownContent).toContain('![Frame 2](./20260420-02-2.png)');
    // image refs must sit after the first frontmatter block
    expect(bundle.markdownContent).toMatch(/^---\n[\s\S]+?\n---\n\n!\[Frame 1\]/);
  });

  it('concatenates per-frame markdown with `---` separators', async () => {
    const a = mount(makeElement({ id: 'a', text: 'A' }));
    const b = mount(makeElement({ id: 'b', text: 'B' }));
    const session = captureSession([a, b]);
    const bundle = await toSpecSnapBundle(session);
    const parts = bundle.markdownContent.split('\n\n---\n\n');
    expect(parts.length).toBe(2);
  });
});
