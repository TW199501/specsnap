import type { SpecSnapBundle } from '@tw199501/specsnap-core';
import type { SaveResult } from '../types.js';

/**
 * Test hook - if defined on globalThis, used INSTEAD of the real dynamic
 * import. Allows simulating module-load failure without network mocks.
 */
declare global {
  // eslint-disable-next-line no-var
  var __importOverride: (() => Promise<unknown>) | undefined;
}

interface FflateZip {
  zipSync: (input: Record<string, Uint8Array>, opts?: { level?: number }) => Uint8Array;
}

async function loadFflate(): Promise<FflateZip> {
  if (globalThis.__importOverride) {
    return (await globalThis.__importOverride()) as FflateZip;
  }
  return (await import('fflate')) as FflateZip;
}

async function blobToUint8(blob: Blob): Promise<Uint8Array> {
  const ab = await blob.arrayBuffer();
  return new Uint8Array(ab);
}

export async function saveBundleAsZip(bundle: SpecSnapBundle): Promise<SaveResult> {
  try {
    const fflate = await loadFflate();

    const mdBytes = new TextEncoder().encode(bundle.markdown.content);
    const entries: Record<string, Uint8Array> = {};
    entries[`${bundle.dirName}/${bundle.markdown.filename}`] = mdBytes;
    for (const img of bundle.images) {
      entries[`${bundle.dirName}/${img.filename}`] = await blobToUint8(img.blob);
    }

    const zipped = fflate.zipSync(entries, { level: 6 });
    const zipBlob = new Blob([zipped as BlobPart], { type: 'application/zip' });
    const url = URL.createObjectURL(zipBlob);
    const zipName = `${bundle.captureId}.zip`;

    const a = document.createElement('a');
    a.href = url;
    a.download = zipName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return {
      strategy: 'zip',
      fileCount: 1 + bundle.images.length,
      location: zipName,
      error: null
    };
  }
  catch (err) {
    return {
      strategy: 'zip',
      fileCount: 0,
      location: null,
      error: err instanceof Error ? err.message : 'unknown zip-fallback error'
    };
  }
}
