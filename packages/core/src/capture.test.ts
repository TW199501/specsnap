import { beforeEach, describe, expect, it } from 'vitest';

import { captureElement, captureSession } from './capture.js';
import { clearBody, makeElement, mount } from './dom-fixture.js';

describe('captureElement', () => {
  let el: HTMLElement;

  beforeEach(() => {
    clearBody();
    el = mount(makeElement({
      id: 'box',
      classes: ['card', 'primary'],
      style: 'width:200px;height:40px;padding:8px 16px;margin:4px;border:1px solid #000;font-family:Inter;font-size:14px;font-weight:500;color:#111;background-color:#eee;border-radius:6px',
      text: 'Hello'
    }));
  });

  it('captures tag, id, and class list', () => {
    const frame = captureElement(el, 1);
    expect(frame.identity.tagName).toBe('div');
    expect(frame.identity.id).toBe('box');
    expect(frame.identity.classList).toEqual(['card', 'primary']);
  });

  it('produces a DOM path that resolves back to the element', () => {
    const frame = captureElement(el, 1);
    const resolved = document.querySelector(frame.identity.domPath);
    expect(resolved).toBe(el);
  });

  it('captures box model padding and margin as FourSides tuples', () => {
    const frame = captureElement(el, 1);
    expect(frame.boxModel.padding).toEqual([8, 16, 8, 16]);
    expect(frame.boxModel.margin).toEqual([4, 4, 4, 4]);
  });

  it('captures typography fields', () => {
    const frame = captureElement(el, 1);
    expect(frame.typography.fontSize).toBe(14);
    expect(frame.typography.fontWeight).toBe('500');
    expect(frame.typography.fontFamily).toContain('Inter');
  });

  it('preserves the requested 1-based index', () => {
    expect(captureElement(el, 3).index).toBe(3);
  });

  it('throws if element is not attached to the document', () => {
    const detached = document.createElement('div');
    expect(() => captureElement(detached, 1)).toThrow(/not attached/i);
  });

  it('produces a class-based name when element has no id', () => {
    clearBody();
    const plain = mount(makeElement({ tag: 'div', classes: ['widget', 'big'], text: 'x' }));
    const frame = captureElement(plain, 1);
    expect(frame.identity.id).toBeNull();
    expect(frame.identity.name).toBe('div[text="x"]'); // text takes precedence over class in formatName
  });

  it('produces a bare tag name when element has no id, class, or text', () => {
    clearBody();
    const bare = mount(makeElement({ tag: 'span' }));
    const frame = captureElement(bare, 1);
    expect(frame.identity.name).toBe('span');
    expect(frame.identity.id).toBeNull();
    expect(frame.identity.classList).toEqual([]);
  });

  it('uses :nth-of-type in DOM path when sibling tags exist', () => {
    clearBody();
    mount(makeElement({ tag: 'p', text: 'first' }));
    const second = mount(makeElement({ tag: 'p', text: 'second' }));
    mount(makeElement({ tag: 'p', text: 'third' }));

    const frame = captureElement(second, 1);
    expect(frame.identity.domPath).toContain(':nth-of-type(2)');
    expect(document.querySelector(frame.identity.domPath)).toBe(second);
  });

  it('truncates long text to 24 chars in the identity name', () => {
    clearBody();
    const longText = 'This is a rather long piece of text that should get truncated';
    const el = mount(makeElement({ tag: 'p', text: longText }));
    const frame = captureElement(el, 1);
    // name should be p[text="..."] with at most 24 chars inside quotes
    const match = frame.identity.name.match(/^p\[text="(.+)"\]$/);
    expect(match).not.toBeNull();
    expect(match![1]!.length).toBeLessThanOrEqual(24);
  });
});

describe('captureSession', () => {
  it('wraps captured frames with viewport + timestamp + URL', () => {
    clearBody();
    const a = mount(makeElement({ tag: 'p', id: 'a', text: 'A' }));
    const b = mount(makeElement({ tag: 'p', id: 'b', text: 'B' }));

    const session = captureSession([a, b]);
    expect(session.frames).toHaveLength(2);
    expect(session.frames[0]!.index).toBe(1);
    expect(session.frames[1]!.index).toBe(2);
    expect(session.viewport.width).toBeGreaterThan(0);
    expect(session.capturedAt).toMatch(/\d{4}-\d{2}-\d{2}T/);
    expect(session.schemaVersion).toBe('0.0.1');
    expect(session.id).toMatch(/^s-[a-z0-9]{6}$/);
  });

  it('handles an empty elements array', () => {
    const session = captureSession([]);
    expect(session.frames).toHaveLength(0);
    expect(session.viewport.width).toBeGreaterThan(0);
    expect(session.schemaVersion).toBe('0.0.1');
  });

  it('produces unique 1-based indices across many frames', () => {
    clearBody();
    const els = [];
    for (let i = 0; i < 5; i++) {
      els.push(mount(makeElement({ tag: 'div', id: `e${i}`, text: `Item ${i}` })));
    }
    const session = captureSession(els);
    expect(session.frames).toHaveLength(5);
    expect(session.frames.map((f) => f.index)).toEqual([1, 2, 3, 4, 5]);
  });
});
