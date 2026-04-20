import { toMarkdown } from './serialize-md.js';
import { toAnnotatedPNG } from './to-annotated-png.js';
import type { AnnotatedPngOptions, Session } from './types.js';

export interface SpecSnapBundleOptions {
  /**
   * Which capture of the day (1-99). Drives the "-NN" suffix in filenames.
   * Default: 1. Consumer is responsible for tracking/incrementing this.
   */
  sequence?: number;
  /** Override the date. Default: `new Date()`. */
  date?: Date;
  /** Override the directory name. Default: YYYYMMDD from `date`. */
  dirName?: string;
  /** Override the capture id (stem used in all filenames). Default: `${YYYYMMDD}-${NN}`. */
  captureId?: string;
  // PNG options (forwarded to toAnnotatedPNG)
  badges?: boolean;
  gaps?: boolean;
  sizeLabels?: boolean;
  format?: 'png' | 'jpeg';
  quality?: number;
  pixelRatio?: number;
  padding?: number;
  background?: string;
  filter?: (node: Node) => boolean;
}

export interface SpecSnapBundleImage {
  /** Filename only, e.g. "20260420-01-1.png". No directory prefix. */
  filename: string;
  /** The rendered PNG (or JPEG) Blob for this frame. */
  blob: Blob;
}

export interface SpecSnapBundle {
  /** Directory name intended to live under `specsnap/`, e.g. "20260420". */
  dirName: string;
  /** Capture id — the filename stem shared across MD + PNGs, e.g. "20260420-01". */
  captureId: string;
  /** Filename for the markdown, e.g. "20260420-01.md". Sits inside `dirName`. */
  markdownFilename: string;
  /**
   * The full markdown text, all frames concatenated with `---` dividers.
   * Each frame references its own PNG via relative path `./<filename>`.
   */
  markdownContent: string;
  /** One entry per frame, aligned with `session.frames`. */
  images: SpecSnapBundleImage[];
}

/**
 * Format a Date as YYYYMMDD using local time.
 */
export function formatDateYYYYMMDD(date: Date): string {
  const y = date.getFullYear().toString().padStart(4, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  return `${y}${m}${d}`;
}

/**
 * Compose a capture id from a date and a 1-99 sequence number.
 * Output: "20260420-01".
 */
export function formatCaptureId(date: Date, sequence: number): string {
  const dateStr = formatDateYYYYMMDD(date);
  const seqStr = Math.max(1, Math.min(99, Math.floor(sequence))).toString().padStart(2, '0');
  return `${dateStr}-${seqStr}`;
}

/**
 * Package a Session into a disk-ready bundle: one markdown + one PNG per frame,
 * all named with a shared `YYYYMMDD-NN-*` stem so they live naturally together
 * under `specsnap/YYYYMMDD/` on the consumer's filesystem.
 *
 * The returned `markdownContent` uses **relative paths** (`./YYYYMMDD-NN-1.png`)
 * so the MD renders correctly when stored alongside the images. Consumers
 * (extension, Tauri app, playground download button) are responsible for
 * writing the files to the right place.
 */
export async function toSpecSnapBundle(
  session: Session,
  options: SpecSnapBundleOptions = {}
): Promise<SpecSnapBundle> {
  if (session.frames.length === 0) {
    throw new Error('SpecSnap: cannot bundle an empty session (no frames)');
  }

  const date = options.date ?? new Date();
  const sequence = options.sequence ?? 1;
  const dirName = options.dirName ?? formatDateYYYYMMDD(date);
  const captureId = options.captureId ?? formatCaptureId(date, sequence);

  const imageFilenames = session.frames.map((_, i) => `${captureId}-${i + 1}.png`);

  const pngOptions: AnnotatedPngOptions = {};
  if (options.badges !== undefined) pngOptions.badges = options.badges;
  if (options.gaps !== undefined) pngOptions.gaps = options.gaps;
  if (options.sizeLabels !== undefined) pngOptions.sizeLabels = options.sizeLabels;
  if (options.format !== undefined) pngOptions.format = options.format;
  if (options.quality !== undefined) pngOptions.quality = options.quality;
  if (options.pixelRatio !== undefined) pngOptions.pixelRatio = options.pixelRatio;
  if (options.padding !== undefined) pngOptions.padding = options.padding;
  if (options.background !== undefined) pngOptions.background = options.background;
  if (options.filter !== undefined) pngOptions.filter = options.filter;

  const blobs = await toAnnotatedPNG(session, pngOptions);
  const mdTexts = toMarkdown(session, { imageFilenames });
  const markdownContent = mdTexts.join('\n\n---\n\n');

  return {
    dirName,
    captureId,
    markdownFilename: `${captureId}.md`,
    markdownContent,
    images: blobs.map((blob, i) => ({
      filename: imageFilenames[i]!,
      blob
    }))
  };
}
