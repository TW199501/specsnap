// Factory + vanilla mount
export { createInspector } from './create-inspector.js';
export { mount, type MountOptions } from './mount.js';

// Types
export type {
  InspectorOptions,
  InspectorSnapshot,
  InspectorHandle,
  PanelPosition,
  ScopeInput,
  StorageStrategy,
  SaveResult,
  Listener,
  Session,
  SpecSnapBundle
} from './types.js';

// Sequence utilities
export {
  formatDateYYYYMMDD,
  getNextCaptureId,
  commitSequence
} from './sequence.js';

// Storage building blocks — advanced consumers can compose their own ladders
export { saveBundleWithLadder } from './storage/save-bundle.js';
export type { StorageStrategies, SaveBundleOptions } from './storage/save-bundle.js';
