export const VERSION = '0.0.1';

export {
  SCHEMA_VERSION,
  type Background,
  type BoxModel,
  type ElementIdentity,
  type FourSides,
  type Frame,
  type Rect,
  type ScrollPosition,
  type SerializeOptions,
  type Session,
  type Typography,
  type Viewport
} from './types.js';

export { captureScroll, captureViewport } from './viewport.js';

export { annotate, DEFAULT_LEXICON } from './lexicon.js';

export { captureElement, captureSession } from './capture.js';

export { toMarkdown } from './serialize-md.js';

export { toJSON } from './serialize-json.js';
