/**
 * SCHEMA VERSION — bump on any breaking change to exported types.
 * Consumers check Session.schemaVersion for compatibility.
 */
export const SCHEMA_VERSION = '0.0.2';

/** Absolute pixel rectangle relative to the document (not the viewport). */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Four-side numeric tuple: top, right, bottom, left. */
export type FourSides = readonly [number, number, number, number];

/** CSS box model values in pixels. */
export interface BoxModel {
  content: { width: number; height: number };
  padding: FourSides;
  border: FourSides;
  margin: FourSides;
}

export interface Typography {
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  lineHeight: string;
  letterSpacing: string;
  color: string;
  textAlign: string;
}

export interface Background {
  color: string;
  image: string;
  borderRadius: FourSides;
}

/** Viewport snapshot — MUST appear on every Session. P1 of the design. */
export interface Viewport {
  width: number;
  height: number;
  devicePixelRatio: number;
}

export interface ScrollPosition {
  x: number;
  y: number;
}

export interface ElementIdentity {
  tagName: string;
  id: string | null;
  classList: readonly string[];
  /** Best-effort semantic name, e.g. 'Button[text="Save"]' or 'input#port'. */
  name: string;
  /** CSS selector path that uniquely locates the element. */
  domPath: string;
}

/** A single captured frame — one inspected element. */
export interface Frame {
  index: number;
  identity: ElementIdentity;
  rect: Rect;
  viewportRelative: { xPct: number; yPct: number };
  boxModel: BoxModel;
  typography: Typography;
  background: Background;
}

export type GapAxis = 'horizontal' | 'vertical';

/**
 * The computed distance between two captured frames along a shared axis.
 * - horizontal: frames share a Y range (side-by-side); `px` is the gap along X
 * - vertical: frames share an X range (stacked); `px` is the gap along Y
 * If two frames overlap or are diagonally unrelated, no Gap is emitted.
 */
export interface Gap {
  /** 1-based index of the frame on the "from" side. */
  from: number;
  /** 1-based index of the frame on the "to" side. */
  to: number;
  axis: GapAxis;
  /** The distance in CSS pixels between the two frames along the shared axis. */
  px: number;
}

/** Session envelope — wraps 1..N frames with shared viewport context. */
export interface Session {
  schemaVersion: typeof SCHEMA_VERSION;
  id: string;
  capturedAt: string;
  url: string;
  pageTitle: string;
  viewport: Viewport;
  scroll: ScrollPosition;
  frames: Frame[];
  /** Distance between every consecutive pair of frames. Empty when <2 frames. */
  gaps: Gap[];
}

export interface SerializeOptions {
  /** Override the bilingual lexicon with extra or replacement entries. */
  lexiconOverride?: Readonly<Record<string, string>>;
  /** If true, JSON output is pretty-printed. Default: true. */
  pretty?: boolean;
}
