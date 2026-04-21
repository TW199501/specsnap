import { describe, it, expect, vi, beforeEach } from 'vitest';
import { copyTextToClipboard } from './clipboard.js';

describe('copyTextToClipboard', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('uses navigator.clipboard.writeText when available', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText }
    });

    await copyTextToClipboard('hello');

    expect(writeText).toHaveBeenCalledWith('hello');
  });

  it('throws with a specific error when clipboard API is unavailable', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: undefined
    });

    await expect(copyTextToClipboard('hello')).rejects.toThrow(/Clipboard API unavailable/);
  });

  it('re-throws underlying writeText rejection with context', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('permission denied'));
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText }
    });

    await expect(copyTextToClipboard('hello')).rejects.toThrow(/permission denied/);
  });
});
