import { describe, it, expect, vi, afterEach } from 'vitest';
import { saveBundleAsIndividualFiles } from './individual-fallback.js';
import type { SpecSnapBundle } from '@tw199501/specsnap-core';

function fakeBundle(): SpecSnapBundle {
  return {
    dirName: '20260420',
    captureId: '20260420-01',
    markdown: { filename: '20260420-01.md', content: '# hello' },
    images: [
      { filename: '20260420-01-1.png', blob: new Blob(['x'], { type: 'image/png' }) }
    ]
  };
}

describe('saveBundleAsIndividualFiles', () => {
  const origClick = HTMLAnchorElement.prototype.click;

  afterEach(() => {
    HTMLAnchorElement.prototype.click = origClick;
  });

  it('triggers one download per file in the bundle', async () => {
    const clickSpy = vi.fn();
    HTMLAnchorElement.prototype.click = function () { clickSpy(); };

    const result = await saveBundleAsIndividualFiles(fakeBundle());

    expect(clickSpy).toHaveBeenCalledTimes(2);
    expect(result.strategy).toBe('individual');
    expect(result.fileCount).toBe(2);
    expect(result.error).toBeNull();
  });
});
