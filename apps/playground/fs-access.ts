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

// ─── writeBundle: FSA path + downloads fallback ──────────────────────────────

const DB_NAME = 'specsnap-playground-fs';

interface PermissionAwareHandle extends FileSystemDirectoryHandle {
  queryPermission?: (descriptor: { mode: 'readwrite' | 'read' }) => Promise<'granted' | 'denied' | 'prompt'>;
  requestPermission?: (descriptor: { mode: 'readwrite' | 'read' }) => Promise<'granted' | 'denied' | 'prompt'>;
}

interface WindowWithFSA extends Window {
  showDirectoryPicker?: (options?: { mode?: 'readwrite' | 'read' }) => Promise<FileSystemDirectoryHandle>;
}

/**
 * Ensure we have an active root directory handle with readwrite permission.
 * Returns null if FSA isn't supported, user cancelled, or permission was denied.
 */
async function ensureRootHandle(): Promise<FileSystemDirectoryHandle | null> {
  if (!isFileSystemAccessSupported(window)) return null;
  const cached = (await loadCachedRootHandle(DB_NAME)) as PermissionAwareHandle | null;
  if (cached && cached.queryPermission) {
    const permission = await cached.queryPermission({ mode: 'readwrite' });
    if (permission === 'granted') return cached;
    if (cached.requestPermission) {
      const next = await cached.requestPermission({ mode: 'readwrite' });
      if (next === 'granted') return cached;
    }
  }
  try {
    const winFSA = window as WindowWithFSA;
    if (!winFSA.showDirectoryPicker) return null;
    const picked = await winFSA.showDirectoryPicker({ mode: 'readwrite' });
    await saveCachedRootHandle(DB_NAME, picked);
    return picked;
  }
  catch {
    return null;
  }
}

async function writeFile(
  dir: FileSystemDirectoryHandle,
  filename: string,
  data: Blob | string
): Promise<void> {
  const fileHandle = await dir.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(data as FileSystemWriteChunkType);
  await writable.close();
}

async function writeBundleToFilesystem(
  root: FileSystemDirectoryHandle,
  bundle: BundleToWrite
): Promise<WriteResult> {
  const subdir = await root.getDirectoryHandle(bundle.dirName, { create: true });
  await writeFile(subdir, bundle.markdownFilename, bundle.markdownContent);
  for (const img of bundle.images) {
    await writeFile(subdir, img.filename, img.blob);
  }
  return {
    mode: 'filesystem',
    where: `${root.name}/${bundle.dirName}/`,
    fileCount: bundle.images.length + 1
  };
}

function triggerDownload(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function writeBundleViaDownloads(bundle: BundleToWrite): WriteResult {
  triggerDownload(
    bundle.markdownFilename,
    new Blob([bundle.markdownContent], { type: 'text/markdown' })
  );
  for (const img of bundle.images) {
    triggerDownload(img.filename, img.blob);
  }
  return {
    mode: 'downloads',
    where: `Downloads/ (drag into ${bundle.dirName}/ manually)`,
    fileCount: bundle.images.length + 1
  };
}

/**
 * Write the bundle to the best available target. Tries the File System
 * Access API first; on any failure (unsupported browser, user cancelled
 * the picker, permission denied, write error) falls back to triggering
 * multiple `<a download>` into the user's Downloads folder.
 */
export async function writeBundle(bundle: BundleToWrite): Promise<WriteResult> {
  const root = await ensureRootHandle();
  if (!root) return writeBundleViaDownloads(bundle);
  try {
    return await writeBundleToFilesystem(root, bundle);
  }
  catch (err) {
    console.warn('[specsnap] FSA write failed, falling back to downloads:', err);
    return writeBundleViaDownloads(bundle);
  }
}

/**
 * Forget any cached root-folder handle. Next `writeBundle` call will
 * prompt the user to pick a folder again.
 */
export async function clearCachedRoot(): Promise<void> {
  const db = await openDb(DB_NAME);
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete('root');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('IndexedDB delete failed'));
    });
  }
  finally {
    db.close();
  }
}
