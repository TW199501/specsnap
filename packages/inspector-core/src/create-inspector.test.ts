import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createInspector } from './create-inspector.js';

function resetDom(): void {
  document.body.replaceChildren();
}

describe('createInspector', () => {
  beforeEach(() => {
    resetDom();
    localStorage.clear();
  });

  it('returns a handle with all documented imperative methods', () => {
    const inspector = createInspector();
    expect(typeof inspector.open).toBe('function');
    expect(typeof inspector.close).toBe('function');
    expect(typeof inspector.toggle).toBe('function');
    expect(typeof inspector.startPicker).toBe('function');
    expect(typeof inspector.stopPicker).toBe('function');
    expect(typeof inspector.clearFrames).toBe('function');
    expect(typeof inspector.copyMarkdown).toBe('function');
    expect(typeof inspector.saveBundle).toBe('function');
    expect(typeof inspector.getSnapshot).toBe('function');
    expect(typeof inspector.subscribe).toBe('function');
    expect(typeof inspector.destroy).toBe('function');
    inspector.destroy();
  });

  it('open/close toggles visible state and notifies subscribers', () => {
    const inspector = createInspector();
    const listener = vi.fn();
    inspector.subscribe(listener);

    expect(inspector.getSnapshot().visible).toBe(false);
    inspector.open();
    expect(inspector.getSnapshot().visible).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);
    inspector.close();
    expect(inspector.getSnapshot().visible).toBe(false);
    expect(listener).toHaveBeenCalledTimes(2);
    inspector.destroy();
  });

  it('startPicker + simulated click appends a frame and fires onCapture', async () => {
    const onCapture = vi.fn();
    const target = document.createElement('section');
    document.body.appendChild(target);

    const inspector = createInspector({ onCapture });
    inspector.startPicker();

    target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

    await Promise.resolve();

    expect(inspector.getSnapshot().frames).toContain(target);
    expect(onCapture).toHaveBeenCalledOnce();
    inspector.destroy();
  });

  it('clearFrames empties frames and notifies', () => {
    const inspector = createInspector();
    const listener = vi.fn();
    inspector.subscribe(listener);

    const el = document.createElement('div');
    document.body.appendChild(el);
    inspector.startPicker();
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    listener.mockClear();

    inspector.clearFrames();
    expect(inspector.getSnapshot().frames).toEqual([]);
    expect(listener).toHaveBeenCalled();
    inspector.destroy();
  });

  it('nextCaptureId in the initial snapshot reflects today', () => {
    const inspector = createInspector();
    const snap = inspector.getSnapshot();
    expect(snap.nextCaptureId).toMatch(/^\d{8}-\d{2}$/);
    inspector.destroy();
  });

  it('destroy() stops the picker and removes all listeners', () => {
    const inspector = createInspector();
    inspector.startPicker();
    const removeSpy = vi.spyOn(document, 'removeEventListener');
    inspector.destroy();
    expect(removeSpy).toHaveBeenCalled();
    removeSpy.mockRestore();
  });

  it('scope restricts the picker', () => {
    const root = document.createElement('div');
    const inside = document.createElement('button');
    const outside = document.createElement('button');
    root.appendChild(inside);
    document.body.appendChild(root);
    document.body.appendChild(outside);

    const inspector = createInspector({ scope: root });
    inspector.startPicker();

    outside.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(inspector.getSnapshot().frames).toEqual([]);

    inside.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(inspector.getSnapshot().frames).toEqual([inside]);

    inspector.destroy();
  });
});
