import type { SerializeOptions, Session } from './types.js';

/**
 * Serialize a Session to a JSON string.
 * Pretty-prints by default; pass `pretty: false` for compact output.
 */
export function toJSON(session: Session, options: SerializeOptions = {}): string {
  const pretty = options.pretty !== false;
  return JSON.stringify(session, null, pretty ? 2 : 0);
}
