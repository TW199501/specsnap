import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createInspector } from './create-inspector.js';

function resetDom(): void {
  document.body.replaceChildren();
}

describe('inspector-core integration', () => {
  beforeEach(() => {
    resetDom();
    localStorage.clear();
  });

  it('full flow: open -> pick two elements -> copyMarkdown -> clear', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText }
    });

    const onCapture = vi.fn();
    const onCopy = vi.fn();
    const onClear = vi.fn();

    const inspector = createInspector({ onCapture, onCopy, onClear });

    const a = document.createElement('article');
    const b = document.createElement('section');
    document.body.appendChild(a);
    document.body.appendChild(b);

    inspector.open();
    inspector.startPicker();

    a.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    b.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

    expect(inspector.getSnapshot().frames).toEqual([a, b]);
    expect(onCapture).toHaveBeenCalledTimes(2);

    await inspector.copyMarkdown();
    expect(writeText).toHaveBeenCalledOnce();
    expect(onCopy).toHaveBeenCalledOnce();
    expect((writeText.mock.calls[0]![0] as string).length).toBeGreaterThan(0);

    inspector.clearFrames();
    expect(inspector.getSnapshot().frames).toEqual([]);
    expect(onClear).toHaveBeenCalledOnce();

    inspector.destroy();
  });

  it('destroy stops the picker even if open is never called', () => {
    const inspector = createInspector();
    inspector.startPicker();
    expect(inspector.getSnapshot().picking).toBe(true);
    inspector.destroy();
  });

  it('visibility changes notify subscribers exactly once per transition', () => {
    const inspector = createInspector();
    const listener = vi.fn();
    inspector.subscribe(listener);

    inspector.open();
    inspector.open();
    inspector.close();
    inspector.close();

    expect(listener).toHaveBeenCalledTimes(2);
    inspector.destroy();
  });
});
