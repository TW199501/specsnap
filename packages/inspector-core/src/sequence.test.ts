import { describe, it, expect, beforeEach } from 'vitest';
import {
  formatDateYYYYMMDD,
  getNextCaptureId,
  commitSequence,
  resetSequenceForTests
} from './sequence.js';

const KEY = 'specsnap:sequence:test';

function mockLocalStorage(): Storage {
  let store: Record<string, string> = {};
  return {
    getItem: (k) => (k in store ? store[k]! : null),
    setItem: (k, v) => { store[k] = v; },
    removeItem: (k) => { delete store[k]; },
    clear: () => { store = {}; },
    key: (i) => Object.keys(store)[i] ?? null,
    get length() { return Object.keys(store).length; }
  };
}

describe('sequence counter', () => {
  beforeEach(() => {
    resetSequenceForTests();
  });

  it('formats date as YYYYMMDD', () => {
    expect(formatDateYYYYMMDD(new Date('2026-04-20T10:30:00'))).toBe('20260420');
    expect(formatDateYYYYMMDD(new Date('2026-01-05T23:59:00'))).toBe('20260105');
  });

  it('first call of the day returns sequence 1', () => {
    const storage = mockLocalStorage();
    const result = getNextCaptureId({
      date: new Date('2026-04-20T10:00:00'),
      storage,
      key: KEY
    });
    expect(result.sequence).toBe(1);
    expect(result.captureId).toBe('20260420-01');
  });

  it('reading alone does not increment - only commit does', () => {
    const storage = mockLocalStorage();
    const opts = { date: new Date('2026-04-20T10:00:00'), storage, key: KEY };
    const a = getNextCaptureId(opts);
    const b = getNextCaptureId(opts);
    expect(a.sequence).toBe(1);
    expect(b.sequence).toBe(1);
  });

  it('commit advances the counter for the same day', () => {
    const storage = mockLocalStorage();
    const opts = { date: new Date('2026-04-20T10:00:00'), storage, key: KEY };
    expect(getNextCaptureId(opts).sequence).toBe(1);
    commitSequence({ sequence: 1, ...opts });
    expect(getNextCaptureId(opts).sequence).toBe(2);
    commitSequence({ sequence: 2, ...opts });
    expect(getNextCaptureId(opts).sequence).toBe(3);
  });

  it('new day resets the counter', () => {
    const storage = mockLocalStorage();
    commitSequence({ sequence: 5, date: new Date('2026-04-20T23:59:00'), storage, key: KEY });
    const next = getNextCaptureId({ date: new Date('2026-04-21T00:01:00'), storage, key: KEY });
    expect(next.sequence).toBe(1);
    expect(next.captureId).toBe('20260421-01');
  });

  it('sequence above 99 does not crash', () => {
    const storage = mockLocalStorage();
    commitSequence({ sequence: 99, date: new Date('2026-04-20'), storage, key: KEY });
    const next = getNextCaptureId({ date: new Date('2026-04-20'), storage, key: KEY });
    expect(next.sequence).toBe(100);
    expect(next.captureId).toBe('20260420-100');
  });

  it('handles missing localStorage gracefully (SSR)', () => {
    const result = getNextCaptureId({
      date: new Date('2026-04-20'),
      storage: null,
      key: KEY
    });
    expect(result.sequence).toBe(1);
    expect(result.captureId).toBe('20260420-01');
  });

  it('corrupt localStorage value falls back to 1', () => {
    const storage = mockLocalStorage();
    storage.setItem(KEY, 'not-json-at-all');
    const result = getNextCaptureId({
      date: new Date('2026-04-20'),
      storage,
      key: KEY
    });
    expect(result.sequence).toBe(1);
  });
});
