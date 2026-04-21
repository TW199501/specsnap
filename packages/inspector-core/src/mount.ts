import { createInspector } from './create-inspector.js';
import type { InspectorOptions, InspectorHandle } from './types.js';

export interface MountOptions extends InspectorOptions {
  /** Called once the inspector is ready; receives the handle so consumers can wire keyboard shortcuts, etc. */
  onReady?: (handle: InspectorHandle) => void;
}

export function mount(container: HTMLElement, options: MountOptions = {}): InspectorHandle {
  void container;
  const handle = createInspector(options);
  options.onReady?.(handle);
  return handle;
}
