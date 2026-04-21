import type { SpecSnapBundle } from '@tw199501/specsnap-core';
import type { SaveResult } from '../types.js';

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function saveBundleAsIndividualFiles(bundle: SpecSnapBundle): Promise<SaveResult> {
  try {
    const mdBlob = new Blob([bundle.markdown.content], { type: 'text/markdown' });
    downloadBlob(mdBlob, bundle.markdown.filename);
    for (const img of bundle.images) {
      downloadBlob(img.blob, img.filename);
    }
    return {
      strategy: 'individual',
      fileCount: 1 + bundle.images.length,
      location: 'browser downloads folder',
      error: null
    };
  }
  catch (err) {
    return {
      strategy: 'individual',
      fileCount: 0,
      location: null,
      error: err instanceof Error ? err.message : 'unknown individual-fallback error'
    };
  }
}
