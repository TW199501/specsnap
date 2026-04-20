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
