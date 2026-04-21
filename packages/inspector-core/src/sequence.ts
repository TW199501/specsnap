export interface SequenceOptions {
  date: Date;
  storage: Storage | null;
  key: string;
}

export interface CommitOptions extends SequenceOptions {
  sequence: number;
}

export interface NextCaptureId {
  sequence: number;
  captureId: string;
  today: string;
}

interface StoredEntry {
  day: string;
  lastCommitted: number;
}

/** Format a date as YYYYMMDD using local time. */
export function formatDateYYYYMMDD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

function formatCaptureId(day: string, sequence: number): string {
  const nn = sequence < 100 ? String(sequence).padStart(2, '0') : String(sequence);
  return `${day}-${nn}`;
}

function readEntry(storage: Storage | null, key: string): StoredEntry | null {
  if (!storage) return null;
  const raw = storage.getItem(key);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (
      typeof parsed === 'object'
      && parsed !== null
      && 'day' in parsed
      && 'lastCommitted' in parsed
      && typeof (parsed as StoredEntry).day === 'string'
      && typeof (parsed as StoredEntry).lastCommitted === 'number'
    ) {
      return parsed as StoredEntry;
    }
    return null;
  }
  catch {
    return null;
  }
}

function writeEntry(storage: Storage | null, key: string, entry: StoredEntry): void {
  if (!storage) return;
  storage.setItem(key, JSON.stringify(entry));
}

export function getNextCaptureId(opts: SequenceOptions): NextCaptureId {
  const today = formatDateYYYYMMDD(opts.date);
  const entry = readEntry(opts.storage, opts.key);
  const lastCommittedToday = entry && entry.day === today ? entry.lastCommitted : 0;
  const sequence = lastCommittedToday + 1;
  return { sequence, captureId: formatCaptureId(today, sequence), today };
}

export function commitSequence(opts: CommitOptions): void {
  const today = formatDateYYYYMMDD(opts.date);
  writeEntry(opts.storage, opts.key, { day: today, lastCommitted: opts.sequence });
}

export function resetSequenceForTests(): void {
  // stateless module; hook kept for tests that may introduce caching later
}
