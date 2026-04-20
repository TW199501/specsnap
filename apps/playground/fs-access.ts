/**
 * File System Access API adapter with a graceful fallback to `<a download>`.
 * The caller only sees one entry point (`writeBundle`) — this file hides
 * whether files ended up in a user-picked folder or the Downloads folder.
 */

export interface BundleFile {
  filename: string;
  blob: Blob;
}

export interface BundleToWrite {
  dirName: string;
  markdownFilename: string;
  markdownContent: string;
  images: readonly BundleFile[];
}

export type WriteMode = 'filesystem' | 'downloads';

export interface WriteResult {
  mode: WriteMode;
  /** Human-readable description of where files landed. */
  where: string;
  /** Count of files written. */
  fileCount: number;
}

/**
 * Feature detection. Pass `window` explicitly so tests can inject a stub.
 */
export function isFileSystemAccessSupported(win: Window): boolean {
  return typeof (win as unknown as { showDirectoryPicker?: unknown }).showDirectoryPicker === 'function';
}

/**
 * Build a stub for `window.showDirectoryPicker` that tests can inject via
 * `isFileSystemAccessSupported({ showDirectoryPicker: mockShowDirectoryPicker(handle) })`.
 */
export function mockShowDirectoryPicker(handle: unknown) {
  return () => Promise.resolve(handle);
}
