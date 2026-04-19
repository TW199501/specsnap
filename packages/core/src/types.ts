/**
 * SCHEMA VERSION — bump on any breaking change to exported types.
 * Consumers check Session.schemaVersion for compatibility.
 */
export const SCHEMA_VERSION = '0.0.1';

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
}

export interface SerializeOptions {
  /** Override the bilingual lexicon with extra or replacement entries. */
  lexiconOverride?: Readonly<Record<string, string>>;
  /** If true, JSON output is pretty-printed. Default: true. */
  pretty?: boolean;
}
