import { describe, it, expectTypeOf } from 'vitest';
import type {
  InspectorOptions,
  InspectorSnapshot,
  InspectorHandle,
  StorageStrategy,
  SaveResult,
  Listener
} from './types.js';
import type { Session, SpecSnapBundle } from '@tw199501/specsnap-core';

describe('inspector-core public types', () => {
  it('InspectorOptions has required shape', () => {
    expectTypeOf<InspectorOptions>().toHaveProperty('scope');
    expectTypeOf<InspectorOptions>().toHaveProperty('position');
    expectTypeOf<InspectorOptions>().toHaveProperty('initialSequence');
    expectTypeOf<InspectorOptions>().toHaveProperty('sequenceStorageKey');
  });

  it('InspectorSnapshot carries frames + sequence + visibility', () => {
    expectTypeOf<InspectorSnapshot>().toHaveProperty('frames');
    expectTypeOf<InspectorSnapshot>().toHaveProperty('session');
    expectTypeOf<InspectorSnapshot>().toHaveProperty('nextCaptureId');
    expectTypeOf<InspectorSnapshot>().toHaveProperty('visible');
    expectTypeOf<InspectorSnapshot>().toHaveProperty('picking');
  });

  it('InspectorHandle exposes imperative methods', () => {
    expectTypeOf<InspectorHandle['open']>().toEqualTypeOf<() => void>();
    expectTypeOf<InspectorHandle['close']>().toEqualTypeOf<() => void>();
    expectTypeOf<InspectorHandle['toggle']>().toEqualTypeOf<() => void>();
    expectTypeOf<InspectorHandle['startPicker']>().toEqualTypeOf<() => void>();
    expectTypeOf<InspectorHandle['stopPicker']>().toEqualTypeOf<() => void>();
    expectTypeOf<InspectorHandle['clearFrames']>().toEqualTypeOf<() => void>();
    expectTypeOf<InspectorHandle['getSnapshot']>().toEqualTypeOf<() => InspectorSnapshot>();
  });

  it('StorageStrategy is the discriminated union', () => {
    expectTypeOf<StorageStrategy>().toEqualTypeOf<'fs-access' | 'zip' | 'individual' | 'callback'>();
  });

  it('SaveResult records the strategy that ran', () => {
    expectTypeOf<SaveResult>().toHaveProperty('strategy');
    expectTypeOf<SaveResult>().toHaveProperty('fileCount');
    expectTypeOf<SaveResult>().toHaveProperty('error');
  });

  it('Listener is a no-arg void function', () => {
    expectTypeOf<Listener>().toEqualTypeOf<() => void>();
  });

  it('SpecSnapBundle is re-exported from specsnap-core', () => {
    expectTypeOf<SpecSnapBundle>().toHaveProperty('dirName');
    expectTypeOf<SpecSnapBundle>().toHaveProperty('images');
  });

  it('Session is still available (transitive re-export)', () => {
    expectTypeOf<Session>().toHaveProperty('schemaVersion');
  });
});
