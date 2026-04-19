import { beforeEach, describe, expect, it } from 'vitest';

import { captureSession } from '../src/capture.js';
import { toMarkdown } from '../src/serialize-md.js';
import { clearBody, makeElement, mount } from './dom-fixture.js';

function setupButton(): HTMLElement {
  clearBody();
  return mount(makeElement({
    tag: 'button',
    id: 'save',
    style: 'width:100px;height:32px;padding:4px 12px;margin:8px;font-family:Inter;font-size:13px;font-weight:500;color:#fff;background-color:#ff5000;border-radius:6px',
    text: 'Save'
  }));
}

describe('toMarkdown', () => {
  beforeEach(() => {
    clearBody();
  });

  it('returns one markdown string per frame', () => {
    const el = setupButton();
    const session = captureSession([el]);
    const docs = toMarkdown(session);
    expect(docs).toHaveLength(1);
    expect(typeof docs[0]).toBe('string');
  });

  it('includes YAML frontmatter with viewport and session id', () => {
    const el = setupButton();
    const session = captureSession([el]);
    const [md] = toMarkdown(session);
    expect(md!).toMatch(/^---\n/);
    expect(md!).toContain('frame: 1 of 1');
    expect(md!).toContain('viewport:');
    expect(md!).toContain('session_id: s-');
  });

  it('includes bilingual annotations by default', () => {
    const el = setupButton();
    const session = captureSession([el]);
    const [md] = toMarkdown(session);
    expect(md!).toContain('(寬度)');
    expect(md!).toContain('(字體大小)');
    expect(md!).toContain('(內邊距)');
  });

  it('respects lexicon override', () => {
    const el = setupButton();
    const session = captureSession([el]);
    const [md] = toMarkdown(session, {
      lexiconOverride: { padding: 'inner-pad' }
    });
    expect(md!).toContain('(inner-pad)');
    expect(md!).not.toContain('(內邊距)');
  });

  it('renders box model using four-side tuples', () => {
    const el = setupButton();
    const session = captureSession([el]);
    const [md] = toMarkdown(session);
    expect(md!).toMatch(/padding:\s+4\s+\/\s+12\s+\/\s+4\s+\/\s+12/);
  });
});
