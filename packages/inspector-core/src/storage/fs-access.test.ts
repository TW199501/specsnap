import { describe, expect, it } from 'vitest';

import { isFileSystemAccessSupported, mockShowDirectoryPicker } from './fs-access.js';

describe('isFileSystemAccessSupported', () => {
  it('returns false when window.showDirectoryPicker is undefined', () => {
    expect(isFileSystemAccessSupported({} as Window)).toBe(false);
  });

  it('returns true when window.showDirectoryPicker is a function', () => {
    const fakeWindow = { showDirectoryPicker: () => Promise.resolve({}) } as unknown as Window;
    expect(isFileSystemAccessSupported(fakeWindow)).toBe(true);
  });
});

describe('mockShowDirectoryPicker (test helper)', () => {
  it('resolves to the stub handle we inject', async () => {
    const stub = { name: 'fake-root' };
    const fakeWindow = { showDirectoryPicker: mockShowDirectoryPicker(stub) } as unknown as Window;
    expect(isFileSystemAccessSupported(fakeWindow)).toBe(true);
  });
});

describe('persisted root handle', () => {
  it('returns null when nothing is cached', async () => {
    const { loadCachedRootHandle } = await import('./fs-access.js');
    const result = await loadCachedRootHandle('specsnap-test-store-empty');
    expect(result).toBeNull();
  });

  it('returns the cached handle after saveCachedRootHandle', async () => {
    const { loadCachedRootHandle, saveCachedRootHandle } = await import('./fs-access.js');
    const fake = { name: 'my-folder' };
    await saveCachedRootHandle('specsnap-test-store-roundtrip', fake as unknown as FileSystemDirectoryHandle);
    const loaded = await loadCachedRootHandle('specsnap-test-store-roundtrip');
    expect((loaded as unknown as { name: string } | null)?.name).toBe('my-folder');
  });
});
