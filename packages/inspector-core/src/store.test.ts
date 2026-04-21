import { describe, it, expect, vi } from 'vitest';
import { createStore } from './store.js';

describe('createStore', () => {
  it('starts with empty default state', () => {
    const store = createStore({ nextCaptureId: '20260420-01' });
    const snapshot = store.getSnapshot();
    expect(snapshot.frames).toEqual([]);
    expect(snapshot.session).toBeNull();
    expect(snapshot.visible).toBe(false);
    expect(snapshot.picking).toBe(false);
    expect(snapshot.nextCaptureId).toBe('20260420-01');
    expect(snapshot.lastSave).toBeNull();
  });

  it('setState produces a new snapshot object (referential inequality)', () => {
    const store = createStore({ nextCaptureId: '20260420-01' });
    const before = store.getSnapshot();
    store.setState({ visible: true });
    const after = store.getSnapshot();
    expect(after).not.toBe(before);
    expect(after.visible).toBe(true);
    expect(before.visible).toBe(false);
  });

  it('setState notifies all subscribers exactly once per change', () => {
    const store = createStore({ nextCaptureId: '20260420-01' });
    const listener = vi.fn();
    store.subscribe(listener);
    store.setState({ visible: true });
    expect(listener).toHaveBeenCalledTimes(1);
    store.setState({ picking: true });
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('setState with identical values does not notify', () => {
    const store = createStore({ nextCaptureId: '20260420-01' });
    const listener = vi.fn();
    store.subscribe(listener);
    store.setState({ visible: false });
    expect(listener).not.toHaveBeenCalled();
  });

  it('unsubscribe removes the listener', () => {
    const store = createStore({ nextCaptureId: '20260420-01' });
    const listener = vi.fn();
    const unsub = store.subscribe(listener);
    store.setState({ visible: true });
    expect(listener).toHaveBeenCalledTimes(1);
    unsub();
    store.setState({ visible: false });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('appendFrame adds an element + emits', () => {
    const store = createStore({ nextCaptureId: '20260420-01' });
    const el = document.createElement('div');
    store.appendFrame(el);
    expect(store.getSnapshot().frames).toEqual([el]);
  });

  it('clearFrames empties the frame list', () => {
    const store = createStore({ nextCaptureId: '20260420-01' });
    store.appendFrame(document.createElement('div'));
    store.appendFrame(document.createElement('span'));
    expect(store.getSnapshot().frames).toHaveLength(2);
    store.clearFrames();
    expect(store.getSnapshot().frames).toEqual([]);
    expect(store.getSnapshot().session).toBeNull();
  });
});
