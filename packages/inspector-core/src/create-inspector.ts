import { captureSession, toMarkdown, toSpecSnapBundle } from '@tw199501/specsnap-core';
import { createStore } from './store.js';
import { createPicker } from './picker.js';
import { getNextCaptureId, commitSequence } from './sequence.js';
import { copyTextToClipboard } from './clipboard.js';
import { saveBundleToFsAccess, type BundleToWrite } from './storage/fs-access.js';
import { saveBundleAsZip } from './storage/zip-fallback.js';
import { saveBundleAsIndividualFiles } from './storage/individual-fallback.js';
import { saveBundleWithLadder } from './storage/save-bundle.js';
import { createOverlay } from './overlay.js';
import type {
  InspectorOptions,
  InspectorHandle,
  InspectorSnapshot,
  SaveResult,
  SpecSnapBundle
} from './types.js';

const DEFAULT_SEQUENCE_KEY = 'specsnap:sequence';

function getLocalStorageSafely(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  }
  catch {
    return null;
  }
}

function toBundleToWrite(b: SpecSnapBundle): BundleToWrite {
  return {
    dirName: b.dirName,
    markdownFilename: b.markdownFilename,
    markdownContent: b.markdownContent,
    images: b.images
  };
}

function extractSequenceFromCaptureId(captureId: string): number {
  const parts = captureId.split('-');
  const tail = parts[parts.length - 1] ?? '1';
  const n = Number(tail);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

export function createInspector(options: InspectorOptions = {}): InspectorHandle {
  if (typeof window === 'undefined') {
    throw new Error('SpecSnap Inspector requires a browser environment (typeof window === "undefined")');
  }

  const storage = getLocalStorageSafely();
  const sequenceKey = options.sequenceStorageKey ?? DEFAULT_SEQUENCE_KEY;

  function computeNextId(): string {
    const now = new Date();
    const { captureId } = getNextCaptureId({ date: now, storage, key: sequenceKey });
    return captureId;
  }

  const store = createStore({ nextCaptureId: computeNextId() });

  // On-page visual overlay: numbered badges + outlines on picked frames,
  // gap distance markers between them. Subscribes to store; cleaned up in destroy().
  const overlay = createOverlay();
  const unsubscribeOverlay = store.subscribe(() => {
    overlay.update(store.getSnapshot().frames);
  });

  const excludeSelectors = [
    '.specsnap-inspector-panel',
    '.specsnap-inspector-trigger',
    '#specsnap-inspector-overlay',
    // Internal download anchors (created transiently by the storage layer
    // to trigger file downloads). These click() calls bubble to document
    // and were being captured as picks — ate-our-own-tail bug.
    'a[download]'
  ];

  const picker = createPicker({
    scope: options.scope ?? null,
    excludeSelectors,
    onPick(el) {
      store.appendFrame(el);
      const frames = store.getSnapshot().frames;
      const session = captureSession(frames as readonly HTMLElement[]);
      store.setState({ session });
      options.onCapture?.({ frameIndex: frames.length, session });
    },
    onCancel() {
      picker.stop();
      store.setState({ picking: false });
    }
  });

  function open(): void {
    if (store.getSnapshot().visible) return;
    store.setState({ visible: true });
    options.onOpen?.();
  }

  function close(): void {
    if (!store.getSnapshot().visible) return;
    if (picker.isActive()) {
      picker.stop();
      store.setState({ picking: false });
    }
    store.setState({ visible: false });
    options.onClose?.();
  }

  function toggle(): void {
    if (store.getSnapshot().visible) close();
    else open();
  }

  function startPicker(): void {
    if (picker.isActive()) return;
    picker.start();
    store.setState({ picking: true });
  }

  function stopPicker(): void {
    if (!picker.isActive()) return;
    picker.stop();
    store.setState({ picking: false });
  }

  function clearFrames(): void {
    store.clearFrames();
    options.onClear?.();
  }

  async function copyMarkdown(): Promise<void> {
    const session = store.getSnapshot().session;
    if (!session) return;
    const md = toMarkdown(session);
    const joined = md.join('\n\n━━━━━\n\n');
    await copyTextToClipboard(joined);
    options.onCopy?.(joined);
  }

  async function saveBundle(): Promise<SaveResult> {
    const session = store.getSnapshot().session;
    if (!session) {
      const empty: SaveResult = { strategy: 'callback', fileCount: 0, location: null, error: 'No frames to save' };
      store.setState({ lastSave: empty });
      return empty;
    }

    const now = new Date();
    const bundle = await toSpecSnapBundle(session, { date: now });

    const result = await saveBundleWithLadder(bundle, {
      ...(options.onSave ? { onSave: options.onSave } : {}),
      strategies: {
        fsAccess: async (b) => {
          try {
            const r = await saveBundleToFsAccess(toBundleToWrite(b));
            if (!r) return null;
            return {
              strategy: 'fs-access',
              fileCount: r.fileCount,
              location: r.where,
              error: null
            };
          }
          catch {
            return null;
          }
        },
        zip: saveBundleAsZip,
        individual: saveBundleAsIndividualFiles
      }
    });

    if (result.error === null) {
      commitSequence({
        sequence: extractSequenceFromCaptureId(bundle.captureId),
        date: now,
        storage,
        key: sequenceKey
      });
      store.setState({ nextCaptureId: computeNextId() });
    }
    store.setState({ lastSave: result });
    return result;
  }

  function destroy(): void {
    if (picker.isActive()) picker.stop();
    unsubscribeOverlay();
    overlay.destroy();
  }

  return {
    open,
    close,
    toggle,
    startPicker,
    stopPicker,
    clearFrames,
    copyMarkdown,
    saveBundle,
    getSnapshot: (): InspectorSnapshot => store.getSnapshot(),
    subscribe: (listener) => store.subscribe(listener),
    destroy
  };
}
