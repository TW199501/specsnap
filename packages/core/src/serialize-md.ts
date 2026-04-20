import { annotate } from './lexicon.js';
import type { Frame, SerializeOptions, Session } from './types.js';

/**
 * Convert a Session into one Markdown document per frame.
 *
 * If `options.imageFilenames[i]` is provided, frame i's MD gets an
 * `![Frame N](./<filename>)` image reference after the frontmatter — enabling
 * consumers to bundle MD next to relative-path PNGs on disk.
 */
export function toMarkdown(
  session: Session,
  options: SerializeOptions = {}
): string[] {
  return session.frames.map((frame, i) => {
    const imageFilename = options.imageFilenames?.[i];
    return renderFrame(session, frame, options, imageFilename);
  });
}

function renderFrame(
  session: Session,
  frame: Frame,
  options: SerializeOptions,
  imageFilename?: string
): string {
  const a = (prop: string) => {
    const cn = annotate(prop, options.lexiconOverride);
    return cn ? ` (${cn})` : '';
  };
  const total = session.frames.length;
  const { identity, rect, viewportRelative, boxModel, typography, background } = frame;
  const pad = boxModel.padding;
  const bd = boxModel.border;
  const mg = boxModel.margin;

  return [
    '---',
    `frame: ${frame.index} of ${total}`,
    `captured_at: ${session.capturedAt}`,
    `viewport: { width: ${session.viewport.width}, height: ${session.viewport.height}, dpr: ${session.viewport.devicePixelRatio} }`,
    `scroll: { x: ${session.scroll.x}, y: ${session.scroll.y} }`,
    `url: ${session.url}`,
    `page_title: ${session.pageTitle}`,
    `session_id: ${session.id}`,
    '---',
    '',
    ...(imageFilename ? [`![Frame ${frame.index}](./${imageFilename})`, ''] : []),
    `# Frame ${frame.index} · ${identity.name}`,
    '',
    '## 基本 (Basics)',
    `- **name**: \`${identity.name}\``,
    `- **dom_path**: \`${identity.domPath}\``,
    `- **position**: (${rect.x}, ${rect.y}) · viewport-relative (${viewportRelative.xPct}%, ${viewportRelative.yPct}%)`,
    `- **size**: ${rect.width} × ${rect.height} px${a('width')} ×${a('height')}`,
    '',
    '## 盒模型 (Box Model)',
    `- content: ${boxModel.content.width} × ${boxModel.content.height} px`,
    `- padding: ${pad[0]} / ${pad[1]} / ${pad[2]} / ${pad[3]} (上/右/下/左)${a('padding')}`,
    `- border: ${bd[0]} / ${bd[1]} / ${bd[2]} / ${bd[3]}${a('border')}`,
    `- margin: ${mg[0]} / ${mg[1]} / ${mg[2]} / ${mg[3]}${a('margin')}`,
    '',
    '## 字體 (Typography)',
    `- font-family: ${typography.fontFamily}${a('font-family')}`,
    `- font-size: ${typography.fontSize}px${a('font-size')}`,
    `- font-weight: ${typography.fontWeight}${a('font-weight')}`,
    `- line-height: ${typography.lineHeight}${a('line-height')}`,
    `- color: ${typography.color}${a('color')}`,
    '',
    '## 背景 (Background)',
    `- background-color: ${background.color}${a('background-color')}`,
    `- border-radius: ${background.borderRadius.join(' / ')}${a('border-radius')}`,
    '',
    ...(frame.index === 1 && session.gaps.length > 0
      ? [
          '## 間距 (Gaps)',
          ...session.gaps.map(
            (g) => `- **Frame ${g.from} → Frame ${g.to}**: ${g.px}px ${g.axis} (${g.axis === 'horizontal' ? '水平間距' : '垂直間距'})`
          ),
          ''
        ]
      : [])
  ].join('\n');
}
