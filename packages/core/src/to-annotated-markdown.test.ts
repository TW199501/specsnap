import { beforeEach, describe, expect, it, vi } from 'vitest';

import { captureSession } from './capture.js';
import { clearBody, makeElement, mount } from './dom-fixture.js';
import { toAnnotatedMarkdown } from './to-annotated-markdown.js';

vi.mock('dom-to-image-more', () => ({
  default: {
    toBlob: vi.fn(async () => new Blob(['fake'], { type: 'image/png' }))
  },
  toBlob: vi.fn(async () => new Blob(['fake'], { type: 'image/png' }))
}));

describe('toAnnotatedMarkdown', () => {
  beforeEach(() => {
    clearBody();
  });

  it('returns one markdown string per frame', async () => {
    const a = mount(makeElement({ id: 'a', text: 'A' }));
    const b = mount(makeElement({ id: 'b', text: 'B' }));
    const session = captureSession([a, b]);
    const docs = await toAnnotatedMarkdown(session);
    expect(docs).toHaveLength(2);
  });

  it('embeds a data: PNG url immediately after the frontmatter', async () => {
    const el = mount(makeElement({ id: 'x', text: 'hi' }));
    const session = captureSession([el]);
    const [doc] = await toAnnotatedMarkdown(session);
    expect(doc).toMatch(/^---\n[\s\S]+?\n---\n\n!\[Frame 1\]\(data:image\/png;base64,/);
  });

  it('keeps the original heading and body intact after the image line', async () => {
    const el = mount(makeElement({ id: 'x', text: 'hi' }));
    const session = captureSession([el]);
    const [doc] = await toAnnotatedMarkdown(session);
    expect(doc).toContain('# Frame 1 · ');
    expect(doc).toContain('## 盒模型 (Box Model)');
  });
});
