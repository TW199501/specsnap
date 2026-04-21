import type { Session, SpecSnapBundle } from '@tw199501/specsnap-core';

export type PanelPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export type ScopeInput = HTMLElement | (() => HTMLElement) | null;

export interface InspectorOptions {
  /** Region the picker is allowed to select inside. `null` = whole document.body. */
  scope?: ScopeInput;
  /** Corner anchor for the trigger and opened panel. */
  position?: PanelPosition;
  /** Whether to render the built-in floating trigger button. */
  trigger?: boolean;
  /** Override the daily sequence counter starting value (otherwise read from localStorage). */
  initialSequence?: number;
  /** localStorage key used for sequence persistence. */
  sequenceStorageKey?: string;
  /** Header text shown in the opened panel. */
  panelTitle?: string;
  /**
   * If provided, ALL built-in storage is skipped and this callback receives the bundle.
   * Resolving the promise signals success; rejecting it is reflected in the status line.
   */
  onSave?: (bundle: SpecSnapBundle) => void | Promise<void>;
  /** Optional observers. Fired in addition to any onSave. */
  onCopy?: (markdown: string) => void;
  onCapture?: (payload: { frameIndex: number; session: Session }) => void;
  onClear?: () => void;
  onOpen?: () => void;
  onClose?: () => void;
}

export interface InspectorSnapshot {
  /** The element references the user has picked, in capture order (1-based indexing matches Frame.index). */
  frames: readonly HTMLElement[];
  /** The serialized Session, or null if no frames captured yet. */
  session: Session | null;
  /** Preview of the next capture id that will be assigned ("20260420-05"). */
  nextCaptureId: string;
  /** Whether the panel is open. */
  visible: boolean;
  /** Whether the picker is actively listening. */
  picking: boolean;
  /** Last save attempt outcome, or null if the user hasn't saved in this session. */
  lastSave: SaveResult | null;
}

export interface InspectorHandle {
  open: () => void;
  close: () => void;
  toggle: () => void;
  startPicker: () => void;
  stopPicker: () => void;
  clearFrames: () => void;
  copyMarkdown: () => Promise<void>;
  saveBundle: () => Promise<SaveResult>;
  getSnapshot: () => InspectorSnapshot;
  subscribe: (listener: Listener) => () => void;
  destroy: () => void;
}

export type StorageStrategy = 'fs-access' | 'zip' | 'individual' | 'callback';

export interface SaveResult {
  strategy: StorageStrategy;
  fileCount: number;
  /** Human-readable location ("/specsnap/20260420", "downloads/20260420-01.zip", null if errored). */
  location: string | null;
  /** If present, the save failed and the string explains why. */
  error: string | null;
}

export type Listener = () => void;

/** Re-export commonly used types so wrappers don't have to import from two packages. */
export type { Session, SpecSnapBundle };
