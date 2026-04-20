import { toMarkdown } from './serialize-md.js';
import { toAnnotatedPNG } from './to-annotated-png.js';
import type { AnnotatedPngOptions, SerializeOptions, Session } from './types.js';

/**
 * Produce N Markdown documents (one per frame), each with its own annotated
 * PNG embedded as a base64 data URL immediately after the YAML frontmatter.
 *
 * This is the "conversation-ready" form — paste the concatenated result
 * straight into Claude / ChatGPT / Cursor and the AI sees both the structured
 * text AND the visual screenshot for every frame, without extra attachments.
 *
 * Browser-only (requires `toAnnotatedPNG`, which needs a live DOM).
 */
export async function toAnnotatedMarkdown(
  session: Session,
  options: SerializeOptions & AnnotatedPngOptions = {}
): Promise<string[]> {
  const blobs = await toAnnotatedPNG(session, options);
  const dataUrls = await Promise.all(blobs.map(blobToDataUrl));
  const texts = toMarkdown(session, options);

  return texts.map((md, i) => {
    const frame = session.frames[i]!;
    return injectScreenshot(md, frame.index, dataUrls[i]!);
  });
}

function injectScreenshot(md: string, frameIndex: number, dataUrl: string): string {
  // Markdown emitted by serialize-md.ts starts with:
  //   ---\n <frontmatter lines> \n---\n\n# Frame N · ...
  // Find the end of the frontmatter block (second '---') and insert the image
  // tag right after it, before the heading.
  const lines = md.split('\n');
  let secondDivider = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === '---') { secondDivider = i; break; }
  }
  const insertAt = secondDivider >= 0 ? secondDivider + 1 : 0;
  const imageLine = `\n![Frame ${frameIndex}](${dataUrl})`;
  lines.splice(insertAt, 0, imageLine);
  return lines.join('\n');
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') resolve(result);
      else reject(new Error('FileReader returned non-string result'));
    };
    reader.onerror = () => reject(reader.error ?? new Error('FileReader failed'));
    reader.readAsDataURL(blob);
  });
}
