import { describe, expect, it } from 'vitest';

import { annotate, DEFAULT_LEXICON } from '../src/lexicon.js';

describe('DEFAULT_LEXICON', () => {
  it('contains at least 50 CSS property translations', () => {
    expect(Object.keys(DEFAULT_LEXICON).length).toBeGreaterThanOrEqual(50);
  });

  it('translates common properties to Traditional Chinese', () => {
    expect(DEFAULT_LEXICON['padding']).toBe('內邊距');
    expect(DEFAULT_LEXICON['margin']).toBe('外邊距');
    expect(DEFAULT_LEXICON['font-size']).toBe('字體大小');
    expect(DEFAULT_LEXICON['background-color']).toBe('背景色');
  });
});

describe('annotate', () => {
  it('returns the default translation when no override given', () => {
    expect(annotate('padding')).toBe('內邊距');
  });

  it('prefers override value over default', () => {
    expect(annotate('padding', { padding: 'inner-spacing' })).toBe('inner-spacing');
  });

  it('returns empty string for unknown property', () => {
    expect(annotate('unknown-xyz-prop')).toBe('');
  });

  it('looks up by lowercased key (case-insensitive)', () => {
    expect(annotate('PADDING')).toBe('內邊距');
    expect(annotate('Font-Size')).toBe('字體大小');
  });
});
