import type { SpecSnapBundle } from '@tw199501/specsnap-core';
import type { SaveResult } from '../types.js';

export interface StorageStrategies {
  /** Resolves to a SaveResult on success, or null when the strategy is unavailable (e.g. non-Chromium browser). */
  fsAccess: (bundle: SpecSnapBundle) => Promise<SaveResult | null>;
  zip: (bundle: SpecSnapBundle) => Promise<SaveResult>;
  individual: (bundle: SpecSnapBundle) => Promise<SaveResult>;
}

export interface SaveBundleOptions {
  onSave?: (bundle: SpecSnapBundle) => void | Promise<void>;
  strategies: StorageStrategies;
}

export async function saveBundleWithLadder(
  bundle: SpecSnapBundle,
  opts: SaveBundleOptions
): Promise<SaveResult> {
  if (opts.onSave) {
    try {
      await opts.onSave(bundle);
      return {
        strategy: 'callback',
        fileCount: 1 + bundle.images.length,
        location: 'handled by host app',
        error: null
      };
    }
    catch (err) {
      return {
        strategy: 'callback',
        fileCount: 0,
        location: null,
        error: err instanceof Error ? err.message : 'onSave rejected'
      };
    }
  }

  const viaFs = await opts.strategies.fsAccess(bundle);
  if (viaFs && viaFs.error === null) return viaFs;

  const viaZip = await opts.strategies.zip(bundle);
  if (viaZip.error === null) return viaZip;

  return opts.strategies.individual(bundle);
}
