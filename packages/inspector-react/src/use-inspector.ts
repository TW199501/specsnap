import { useRef, useSyncExternalStore, useEffect } from 'react';
import { createInspector } from '@tw199501/specsnap-inspector-core';
import type { InspectorOptions, InspectorHandle, InspectorSnapshot } from '@tw199501/specsnap-inspector-core';

export interface UseInspectorReturn {
  snapshot: InspectorSnapshot;
  handle: InspectorHandle;
}

/**
 * React bridge to inspector-core.
 *
 * Uses `useSyncExternalStore` — React 18's official API for external stores.
 *
 * Strict Mode safety: React 18 intentionally double-invokes effects in dev
 * (fake unmount → fake remount) to surface missing cleanup. Naive cleanup
 * `return () => handle.destroy()` would permanently destroy the inspector
 * during the fake unmount, leaving subsequent renders pointing at a dead
 * store. We defer destroy via `setTimeout(0)` and cancel it on the next
 * mount — fake remount cancels the pending destroy before it fires, real
 * unmount lets it fire after React has finished tearing down.
 *
 * This is the textbook React 18 idiom for long-lived external resources;
 * the "queue destroy then maybe cancel" shape is what Discord / many
 * editor embeds use for their CodeMirror / Monaco instances.
 */
export function useInspector(options: InspectorOptions): UseInspectorReturn {
  const handleRef = useRef<InspectorHandle | null>(null);
  const pendingDestroyRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (handleRef.current === null) {
    handleRef.current = createInspector(options);
  }
  const handle = handleRef.current;

  useEffect(() => {
    // Mount / remount: cancel any destroy scheduled by the previous cleanup.
    // In Strict Mode the sequence is: mount → cleanup (schedules destroy) →
    // mount-again (this block, cancels it). Net effect: no destroy.
    if (pendingDestroyRef.current) {
      clearTimeout(pendingDestroyRef.current);
      pendingDestroyRef.current = null;
    }
    return () => {
      // Defer destroy so a Strict Mode immediate remount can cancel it.
      pendingDestroyRef.current = setTimeout(() => {
        handle.destroy();
        handleRef.current = null;
        pendingDestroyRef.current = null;
      }, 0);
    };
    // Empty deps — this effect should run once per mount lifecycle, not on
    // every options change. Options are captured at construction (createInspector
    // above); option reactivity is a follow-up if needed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const snapshot = useSyncExternalStore(
    handle.subscribe,
    handle.getSnapshot,
    handle.getSnapshot
  );

  return { snapshot, handle };
}
