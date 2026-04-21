import { shallowRef, onBeforeUnmount, type ShallowRef } from 'vue';
import { createInspector } from '@tw199501/specsnap-inspector-core';
import type { InspectorOptions, InspectorHandle, InspectorSnapshot } from '@tw199501/specsnap-inspector-core';

export interface UseInspectorReturn {
  /** Reactive snapshot — swapped on every change so Vue's shallowRef reactivity triggers. */
  snapshot: ShallowRef<InspectorSnapshot>;
  /** Imperative handle for programmatic control. */
  handle: InspectorHandle;
}

/**
 * Bridge between the framework-agnostic inspector-core store and Vue's reactivity.
 *
 * Why shallowRef (not ref):
 *  - The snapshot is replaced whole on every change (core's store returns a fresh object);
 *    deep reactivity would be wasted work.
 *  - Vue's shallowRef triggers on identity change, which matches core's invalidate-and-emit pattern.
 */
export function useInspector(options: InspectorOptions): UseInspectorReturn {
  const handle = createInspector(options);
  const snapshot = shallowRef<InspectorSnapshot>(handle.getSnapshot());

  const unsubscribe = handle.subscribe(() => {
    snapshot.value = handle.getSnapshot();
  });

  onBeforeUnmount(() => {
    unsubscribe();
    handle.destroy();
  });

  return { snapshot, handle };
}
