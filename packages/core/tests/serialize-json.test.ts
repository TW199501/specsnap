import { describe, expect, it } from 'vitest';

import { captureSession } from '../src/capture.js';
import { toJSON } from '../src/serialize-json.js';
import { clearBody, makeElement, mount } from './dom-fixture.js';

function setupDiv(): HTMLElement {
  clearBody();
  return mount(makeElement({
    id: 'x',
    style: 'width:50px;height:20px',
    text: 'X'
  }));
}

describe('toJSON', () => {
  it('returns a pretty-printed JSON string by default', () => {
    const s = captureSession([setupDiv()]);
    const out = toJSON(s);
    expect(out).toContain('\n');
    expect(out.startsWith('{\n')).toBe(true);
  });

  it('returns compact JSON when pretty=false', () => {
    const s = captureSession([setupDiv()]);
    const out = toJSON(s, { pretty: false });
    expect(out).not.toContain('\n');
  });

  it('round-trips through JSON.parse back to the session shape', () => {
    const s = captureSession([setupDiv()]);
    const parsed = JSON.parse(toJSON(s));
    expect(parsed.schemaVersion).toBe('0.0.1');
    expect(parsed.frames).toHaveLength(1);
    expect(parsed.frames[0].index).toBe(1);
  });

  it('preserves viewport in the output', () => {
    const s = captureSession([setupDiv()]);
    const parsed = JSON.parse(toJSON(s));
    expect(parsed.viewport).toHaveProperty('width');
    expect(parsed.viewport).toHaveProperty('height');
    expect(parsed.viewport).toHaveProperty('devicePixelRatio');
  });
});
