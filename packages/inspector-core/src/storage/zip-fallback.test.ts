import { describe, it, expect, vi, afterEach } from 'vitest';
import { saveBundleAsZip } from './zip-fallback.js';
import type { SpecSnapBundle } from '@tw199501/specsnap-core';

function fakeBundle(): SpecSnapBundle {
  return {
    dirName: '20260420',
    captureId: '20260420-01',
    markdown: { filename: '20260420-01.md', content: '# hello' },
    images: [
      { filename: '20260420-01-1.png', blob: new Blob(['png-bytes'], { type: 'image/png' }) },
      { filename: '20260420-01-2.png', blob: new Blob(['png-bytes'], { type: 'image/png' }) }
    ]
  };
}

describe('saveBundleAsZip', () => {
  const origClick = HTMLAnchorElement.prototype.click;

  afterEach(() => {
    HTMLAnchorElement.prototype.click = origClick;
    delete (globalThis as unknown as { __importOverride?: unknown }).__importOverride;
  });

  it('creates a ZIP blob containing all bundle files under the dirName prefix', async () => {
    let capturedAnchor: HTMLAnchorElement | null = null;
    const clickSpy = vi.fn();
    HTMLAnchorElement.prototype.click = function () {
      capturedAnchor = this;
      clickSpy();
    };

    const result = await saveBundleAsZip(fakeBundle());

    expect(clickSpy).toHaveBeenCalledOnce();
    expect(capturedAnchor).not.toBeNull();
    expect(capturedAnchor!.download).toBe('20260420-01.zip');
    expect(result.strategy).toBe('zip');
    expect(result.fileCount).toBe(3);
    expect(result.location).toMatch(/20260420-01\.zip$/);
    expect(result.error).toBeNull();
  });

  it('returns strategy:"zip" with an error string when fflate import fails', async () => {
    (globalThis as unknown as { __importOverride: () => Promise<never> }).__importOverride =
      () => Promise.reject(new Error('module load failed'));

    const result = await saveBundleAsZip(fakeBundle());
    expect(result.strategy).toBe('zip');
    expect(result.error).toMatch(/module load failed|unavailable/);
  });
});
