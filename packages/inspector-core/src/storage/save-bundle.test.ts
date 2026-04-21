import { describe, it, expect, vi } from 'vitest';
import { saveBundleWithLadder } from './save-bundle.js';
import type { SpecSnapBundle } from '@tw199501/specsnap-core';

function fakeBundle(): SpecSnapBundle {
  return {
    dirName: '20260420',
    captureId: '20260420-01',
    markdown: { filename: '20260420-01.md', content: '# hi' },
    images: []
  };
}

describe('saveBundleWithLadder', () => {
  it('uses onSave callback when provided and skips all built-in storage', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const result = await saveBundleWithLadder(fakeBundle(), {
      onSave,
      strategies: {
        fsAccess: vi.fn(),
        zip: vi.fn(),
        individual: vi.fn()
      }
    });
    expect(onSave).toHaveBeenCalledOnce();
    expect(result.strategy).toBe('callback');
    expect(result.error).toBeNull();
  });

  it('records the error when onSave rejects', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('boom'));
    const result = await saveBundleWithLadder(fakeBundle(), {
      onSave,
      strategies: {
        fsAccess: vi.fn(),
        zip: vi.fn(),
        individual: vi.fn()
      }
    });
    expect(result.strategy).toBe('callback');
    expect(result.error).toBe('boom');
  });

  it('tries fs-access first and stops on success', async () => {
    const fsAccess = vi.fn().mockResolvedValue({ strategy: 'fs-access', fileCount: 1, location: '/x', error: null });
    const zip = vi.fn();
    const individual = vi.fn();
    const result = await saveBundleWithLadder(fakeBundle(), {
      strategies: { fsAccess, zip, individual }
    });
    expect(fsAccess).toHaveBeenCalledOnce();
    expect(zip).not.toHaveBeenCalled();
    expect(individual).not.toHaveBeenCalled();
    expect(result.strategy).toBe('fs-access');
  });

  it('falls back to zip when fs-access is unavailable (returns null)', async () => {
    const fsAccess = vi.fn().mockResolvedValue(null);
    const zip = vi.fn().mockResolvedValue({ strategy: 'zip', fileCount: 1, location: 'a.zip', error: null });
    const individual = vi.fn();
    const result = await saveBundleWithLadder(fakeBundle(), {
      strategies: { fsAccess, zip, individual }
    });
    expect(fsAccess).toHaveBeenCalledOnce();
    expect(zip).toHaveBeenCalledOnce();
    expect(individual).not.toHaveBeenCalled();
    expect(result.strategy).toBe('zip');
  });

  it('falls through to individual when both fs-access and zip fail', async () => {
    const fsAccess = vi.fn().mockResolvedValue(null);
    const zip = vi.fn().mockResolvedValue({ strategy: 'zip', fileCount: 0, location: null, error: 'zip lib missing' });
    const individual = vi.fn().mockResolvedValue({ strategy: 'individual', fileCount: 1, location: 'downloads/', error: null });
    const result = await saveBundleWithLadder(fakeBundle(), {
      strategies: { fsAccess, zip, individual }
    });
    expect(individual).toHaveBeenCalledOnce();
    expect(result.strategy).toBe('individual');
  });
});
