// happy-dom does not expose a real IndexedDB implementation in v20.
// fake-indexeddb provides a spec-compliant in-memory substitute that
// lets us unit-test the IndexedDB persistence layer in fs-access.ts.
import 'fake-indexeddb/auto';
