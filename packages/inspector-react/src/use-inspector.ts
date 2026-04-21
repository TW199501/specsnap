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
 * Strict Mode safety: the hook subscribes during commit (inside
 * useSyncExternalStore's internal effect), so the double-invocation in dev
 * mode does NOT double-subscribe.
 *
 * Handle stability: we instantiate via useRef so the same inspector instance
 * survives across renders, AND we tear it down on unmount via useEffect cleanup.
 */
export function useInspector(options: InspectorOptions): UseInspectorReturn {
  const handleRef = useRef<InspectorHandle | null>(null);
  if (handleRef.current === null) {
    handleRef.current = createInspector(options);
  }
  const handle = handleRef.current;

  useEffect(() => {
    return () => {
      handle.destroy();
      handleRef.current = null;
    };
  }, [handle]);

  const snapshot = useSyncExternalStore(
    handle.subscribe,
    handle.getSnapshot,
    handle.getSnapshot
  );

  return { snapshot, handle };
}
