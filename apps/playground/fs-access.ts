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

// ─── IndexedDB persistence ────────────────────────────────────────────────────
// FileSystemDirectoryHandle is serializable only via IndexedDB's structured
// clone algorithm — you can't JSON it. This layer persists a single "root"
// handle per db name so the user's folder choice survives page reloads.

const DB_VERSION = 1;
const STORE_NAME = 'handles';

function openDb(dbName: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(dbName, DB_VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'));
  });
}

export async function saveCachedRootHandle(
  dbName: string,
  handle: FileSystemDirectoryHandle
): Promise<void> {
  const db = await openDb(dbName);
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(handle, 'root');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('IndexedDB put failed'));
    });
  }
  finally {
    db.close();
  }
}

export async function loadCachedRootHandle(
  dbName: string
): Promise<FileSystemDirectoryHandle | null> {
  const db = await openDb(dbName);
  try {
    return await new Promise<FileSystemDirectoryHandle | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get('root');
      req.onsuccess = () => resolve((req.result as FileSystemDirectoryHandle | undefined) ?? null);
      req.onerror = () => reject(req.error ?? new Error('IndexedDB get failed'));
    });
  }
  finally {
    db.close();
  }
}
