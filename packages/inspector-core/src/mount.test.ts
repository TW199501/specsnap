import { describe, it, expect, vi } from 'vitest';
import { mount } from './mount.js';

describe('mount', () => {
  it('returns an InspectorHandle and calls onReady with it', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const onReady = vi.fn();

    const handle = mount(container, { onReady });

    expect(typeof handle.open).toBe('function');
    expect(onReady).toHaveBeenCalledWith(handle);
    handle.destroy();
  });

  it('destroy() leaves the container untouched (renderer is Part 2)', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const handle = mount(container);

    handle.open();
    handle.close();
    handle.destroy();

    expect(container.children.length).toBe(0);
  });
});
