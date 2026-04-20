import { beforeEach, describe, expect, it } from 'vitest';

import { captureSession } from './capture.js';
import { toMarkdown } from './serialize-md.js';
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

  it('returns one markdown string per frame in a multi-frame session', () => {
    clearBody();
    const a = mount(makeElement({ tag: 'button', id: 'a', text: 'A' }));
    const b = mount(makeElement({ tag: 'button', id: 'b', text: 'B' }));
    const c = mount(makeElement({ tag: 'button', id: 'c', text: 'C' }));
    const session = captureSession([a, b, c]);

    const docs = toMarkdown(session);
    expect(docs).toHaveLength(3);
    expect(docs[0]!).toContain('frame: 1 of 3');
    expect(docs[1]!).toContain('frame: 2 of 3');
    expect(docs[2]!).toContain('frame: 3 of 3');
    expect(docs[0]!).toContain('# Frame 1 · button#a');
    expect(docs[1]!).toContain('# Frame 2 · button#b');
    expect(docs[2]!).toContain('# Frame 3 · button#c');
  });

  it('returns empty array for an empty session', () => {
    const session = captureSession([]);
    expect(toMarkdown(session)).toEqual([]);
  });

  it('renders a gaps section on frame 1 when session.gaps is non-empty', () => {
    const el = setupButton();
    const session = captureSession([el]);
    const sessionWithGaps: typeof session = {
      ...session,
      frames: [...session.frames, { ...session.frames[0]!, index: 2 }],
      gaps: [
        { from: 1, to: 2, axis: 'horizontal', px: 16 }
      ]
    };
    const docs = toMarkdown(sessionWithGaps);
    const first = docs[0]!;

    expect(first).toContain('## 間距 (Gaps)');
    expect(first).toContain('Frame 1 → Frame 2');
    expect(first).toContain('horizontal');
    expect(first).toContain('16');
    expect(first).toContain('水平間距');
  });

  it('does not render gaps section on frames after the first', () => {
    const el = setupButton();
    const session = captureSession([el]);
    const sessionWithGaps: typeof session = {
      ...session,
      frames: [...session.frames, { ...session.frames[0]!, index: 2 }],
      gaps: [{ from: 1, to: 2, axis: 'vertical', px: 8 }]
    };
    const docs = toMarkdown(sessionWithGaps);
    expect(docs[1]!).not.toContain('間距 (Gaps)');
  });

  it('omits gaps section entirely when session has no gaps', () => {
    const el = setupButton();
    const session = captureSession([el]);
    const [md] = toMarkdown(session);
    expect(md!).not.toContain('間距 (Gaps)');
  });
});

describe('identity extras in MD body', () => {
  it('emits i18n_key line in Basics when identity.i18nKey is set', () => {
    clearBody();
    const el = document.createElement('button');
    el.setAttribute('data-i18n-key', 'general.save');
    el.textContent = 'Save';
    mount(el);
    const session = captureSession([el]);
    const md = toMarkdown(session)[0]!;
    expect(md).toContain('**i18n_key**: `general.save`');
  });

  it('emits source line in Basics when identity.source is set', () => {
    clearBody();
    const el = document.createElement('button');
    el.setAttribute('data-v-source', 'Button.vue:42-67');
    mount(el);
    const session = captureSession([el]);
    const md = toMarkdown(session)[0]!;
    expect(md).toContain('**source**: `Button.vue:42-67`');
  });

  it('omits both lines when neither attribute is set', () => {
    clearBody();
    const el = mount(makeElement({ tag: 'button', text: 'Save' }));
    const session = captureSession([el]);
    const md = toMarkdown(session)[0]!;
    expect(md).not.toContain('**i18n_key**');
    expect(md).not.toContain('**source**');
  });
});

describe('border subpixel display', () => {
  it('rounds fractional border widths to the nearest CSS pixel in MD output', () => {
    const session = {
      schemaVersion: '0.0.2' as const,
      id: 's-test',
      capturedAt: '2026-04-20T00:00:00Z',
      url: '',
      pageTitle: '',
      viewport: { width: 1000, height: 800, devicePixelRatio: 1.5 },
      scroll: { x: 0, y: 0 },
      frames: [{
        index: 1,
        identity: {
          tagName: 'input',
          id: 'username',
          classList: [],
          name: 'input#username',
          domPath: 'input#username'
        },
        rect: { x: 0, y: 0, width: 245, height: 43 },
        viewportRelative: { xPct: 0, yPct: 0 },
        boxModel: {
          content: { width: 219, height: 33 },
          padding: [4, 12, 4, 12] as const,
          border: [0.67, 0.67, 0.67, 0.67] as const,
          margin: [0, 0, 0, 0] as const
        },
        typography: {
          fontFamily: 'Arial', fontSize: 13, fontWeight: '400',
          lineHeight: 'normal', letterSpacing: 'normal',
          color: 'rgb(0,0,0)', textAlign: 'start'
        },
        background: {
          color: 'rgb(255,255,255)', image: 'none',
          borderRadius: [6, 6, 6, 6] as const
        }
      }],
      gaps: []
    };
    const md = toMarkdown(session).join('\n');
    expect(md).toContain('border: 1 / 1 / 1 / 1');
    expect(md).not.toContain('0.67');
  });
});
