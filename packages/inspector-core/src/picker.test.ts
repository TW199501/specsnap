import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createPicker } from './picker.js';

function resetDom(): void {
  document.body.replaceChildren();
}

describe('createPicker', () => {
  beforeEach(() => {
    resetDom();
  });

  afterEach(() => {
    resetDom();
  });

  it('does not attach listeners before start()', () => {
    const spy = vi.spyOn(document, 'addEventListener');
    createPicker({ onPick: vi.fn() });
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('start() attaches mousemove + click + keydown listeners', () => {
    const spy = vi.spyOn(document, 'addEventListener');
    const picker = createPicker({ onPick: vi.fn() });
    picker.start();
    const events = spy.mock.calls.map(([evt]) => evt);
    expect(events).toContain('mousemove');
    expect(events).toContain('click');
    expect(events).toContain('keydown');
    picker.stop();
    spy.mockRestore();
  });

  it('stop() removes all attached listeners', () => {
    const addSpy = vi.spyOn(document, 'addEventListener');
    const removeSpy = vi.spyOn(document, 'removeEventListener');
    const picker = createPicker({ onPick: vi.fn() });
    picker.start();
    const addedCount = addSpy.mock.calls.length;
    picker.stop();
    expect(removeSpy.mock.calls.length).toBe(addedCount);
    addSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it('clicking inside scope fires onPick with the clicked element', () => {
    const root = document.createElement('div');
    root.id = 'root';
    const child = document.createElement('span');
    root.appendChild(child);
    document.body.appendChild(root);

    const onPick = vi.fn();
    const picker = createPicker({ onPick, scope: () => root });
    picker.start();

    child.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(onPick).toHaveBeenCalledWith(child);
    picker.stop();
  });

  it('clicking outside scope does NOT fire onPick', () => {
    const root = document.createElement('div');
    const outside = document.createElement('span');
    document.body.appendChild(root);
    document.body.appendChild(outside);

    const onPick = vi.fn();
    const picker = createPicker({ onPick, scope: () => root });
    picker.start();

    outside.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(onPick).not.toHaveBeenCalled();
    picker.stop();
  });

  it('clicking elements in the exclude list does NOT fire onPick', () => {
    const panel = document.createElement('div');
    panel.className = 'specsnap-inspector-panel';
    const btn = document.createElement('button');
    panel.appendChild(btn);
    document.body.appendChild(panel);

    const onPick = vi.fn();
    const picker = createPicker({ onPick, excludeSelectors: ['.specsnap-inspector-panel'] });
    picker.start();

    btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(onPick).not.toHaveBeenCalled();
    picker.stop();
  });

  it('ESC keydown fires onCancel', () => {
    const onCancel = vi.fn();
    const picker = createPicker({ onPick: vi.fn(), onCancel });
    picker.start();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(onCancel).toHaveBeenCalledOnce();
    picker.stop();
  });

  it('click swallows default + propagation so the host page does not react', () => {
    const target = document.createElement('a');
    target.href = '#';
    document.body.appendChild(target);

    const picker = createPicker({ onPick: vi.fn() });
    picker.start();

    const evt = new MouseEvent('click', { bubbles: true, cancelable: true });
    target.dispatchEvent(evt);

    expect(evt.defaultPrevented).toBe(true);
    picker.stop();
  });
});
