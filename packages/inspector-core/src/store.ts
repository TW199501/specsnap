import type { InspectorSnapshot, Listener, SaveResult } from './types.js';

export interface StoreState {
  frames: HTMLElement[];
  session: InspectorSnapshot['session'];
  visible: boolean;
  picking: boolean;
  nextCaptureId: string;
  lastSave: SaveResult | null;
}

export interface Store {
  getSnapshot: () => InspectorSnapshot;
  setState: (partial: Partial<StoreState>) => void;
  subscribe: (listener: Listener) => () => void;
  appendFrame: (el: HTMLElement) => void;
  clearFrames: () => void;
}

export interface CreateStoreOptions {
  nextCaptureId: string;
}

export function createStore(opts: CreateStoreOptions): Store {
  let state: StoreState = {
    frames: [],
    session: null,
    visible: false,
    picking: false,
    nextCaptureId: opts.nextCaptureId,
    lastSave: null
  };
  let cachedSnapshot: InspectorSnapshot | null = null;
  const listeners = new Set<Listener>();

  function snapshot(): InspectorSnapshot {
    if (cachedSnapshot) return cachedSnapshot;
    cachedSnapshot = {
      frames: state.frames,
      session: state.session,
      visible: state.visible,
      picking: state.picking,
      nextCaptureId: state.nextCaptureId,
      lastSave: state.lastSave
    };
    return cachedSnapshot;
  }

  function invalidateAndEmit(): void {
    cachedSnapshot = null;
    for (const l of listeners) l();
  }

  function setState(partial: Partial<StoreState>): void {
    let changed = false;
    const next: StoreState = { ...state };
    for (const k of Object.keys(partial) as (keyof StoreState)[]) {
      const nextVal = partial[k];
      if (nextVal === undefined) continue;
      if (next[k] !== nextVal) {
        (next as unknown as Record<string, unknown>)[k] = nextVal;
        changed = true;
      }
    }
    if (!changed) return;
    state = next;
    invalidateAndEmit();
  }

  return {
    getSnapshot: snapshot,
    setState,
    subscribe(listener) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    appendFrame(el) {
      state = { ...state, frames: [...state.frames, el] };
      invalidateAndEmit();
    },
    clearFrames() {
      if (state.frames.length === 0 && state.session === null) return;
      state = { ...state, frames: [], session: null };
      invalidateAndEmit();
    }
  };
}
