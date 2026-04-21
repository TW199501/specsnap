import { useMemo } from 'react';
import { BoxModelDiagram } from './BoxModelDiagram.js';
import type { InspectorSnapshot, PanelPosition, Session } from '@tw199501/specsnap-inspector-core';
type Frame = Session['frames'][number];

export type CopyFeedback = 'idle' | 'copying' | 'copied' | 'error';

export interface PanelProps {
  snapshot: InspectorSnapshot;
  position: PanelPosition;
  title: string;
  copyFeedback?: CopyFeedback;
  onClose: () => void;
  onTogglePicker: () => void;
  onClear: () => void;
  onCopy: () => void;
}

function describeFrame(el: HTMLElement): string {
  const tag = el.tagName.toLowerCase();
  const id = el.id ? `#${el.id}` : '';
  const cls = typeof el.className === 'string' && el.className
    ? '.' + el.className.split(/\s+/).filter(Boolean).slice(0, 2).join('.')
    : '';
  return `${tag}${id}${cls}`;
}

function frameSize(frame: Frame): string {
  return `${Math.round(frame.rect.width)} × ${Math.round(frame.rect.height)} px`;
}

function fourSides(sides: readonly [number, number, number, number]): string {
  return sides.map(n => Math.round(n)).join(' / ');
}

function rgbToHex(rgb: string): string {
  const m = rgb.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?/i);
  if (!m) return rgb;
  const [, r, g, b, a] = m;
  const hex = (n: number) => n.toString(16).padStart(2, '0');
  const base = '#' + hex(+r!) + hex(+g!) + hex(+b!);
  if (base[1] === base[2] && base[3] === base[4] && base[5] === base[6]) {
    const short = '#' + base[1] + base[3] + base[5];
    return a !== undefined && +a < 1 ? `${short} / ${a}` : short;
  }
  return a !== undefined && +a < 1 ? `${base} / ${a}` : base;
}

function fontLine(frame: Frame): string {
  const t = frame.typography;
  const lh = t.lineHeight === 'normal' ? '' : ` · ${t.lineHeight}`;
  return `${t.fontSize}px · ${t.fontWeight}${lh} · ${rgbToHex(t.color)}`;
}

function backgroundLine(frame: Frame): string {
  const bg = frame.background;
  const bgColor = rgbToHex(bg.color);
  const radius = fourSides(bg.borderRadius);
  const allZero = radius.replace(/[\s\/]/g, '') === '0000';
  return allZero ? bgColor : `${bgColor} · radius ${radius}`;
}

export function Panel({ snapshot, position, title, copyFeedback = 'idle', onClose, onTogglePicker, onClear, onCopy }: PanelProps) {
  const { frames, picking, nextCaptureId, session, lastSave } = snapshot;

  const sessionJson = useMemo(
    () => session ? JSON.stringify(session, null, 2) : 'No session yet.',
    [session]
  );

  const inspectLabel = picking
    ? `Done (${frames.length})`
    : frames.length === 0 ? 'Start Inspect' : `Start Inspect · ${frames.length}`;

  const copyLabel = copyFeedback === 'copying' ? 'Copying…'
    : copyFeedback === 'copied' ? 'Copied ✓'
    : copyFeedback === 'error' ? 'Error ✗'
    : 'Copy MD';

  const statusMessage = (() => {
    if (!lastSave) return '';
    if (lastSave.error) return `✗ ${lastSave.error}`;
    if (lastSave.strategy === 'fs-access') return `✓ Saved to ${lastSave.location} (${lastSave.fileCount} files)`;
    if (lastSave.strategy === 'zip') return `✓ Downloaded ${lastSave.location}`;
    if (lastSave.strategy === 'individual') return `✓ Downloaded ${lastSave.fileCount} files`;
    return '✓ Handled by app';
  })();
  const statusKind = lastSave?.error ? 'error' : lastSave ? 'success' : 'info';

  function gapAfter(i: number): string | null {
    if (!session) return null;
    const gap = session.gaps.find(g => g.from === i + 1 && g.to === i + 2);
    if (!gap) return null;
    return `${Math.round(gap.px)}px ${gap.axis}`;
  }

  return (
    <div
      className="specsnap-inspector-panel specsnap-inspector-root"
      data-position={position}
      role="dialog"
      aria-label="SpecSnap Inspector"
    >
      <header className="specsnap-inspector-panel__header">
        <span className="specsnap-inspector-panel__title">{title}</span>
        <span className="specsnap-inspector-panel__hint">next: {nextCaptureId}</span>
        <button
          type="button"
          className="specsnap-inspector-panel__close"
          aria-label="Close"
          onClick={onClose}
        >×</button>
      </header>

      <div className="specsnap-inspector-panel__actions">
        <button
          type="button"
          className={`specsnap-btn-primary${picking ? ' active' : ''}`}
          onClick={onTogglePicker}
        >{inspectLabel}</button>
        <button type="button" onClick={onClear} disabled={frames.length === 0}>Clear</button>
        <button
          type="button"
          onClick={onCopy}
          disabled={frames.length === 0 || copyFeedback === 'copying'}
          className={copyFeedback === 'copied' ? 'is-feedback-ok' : copyFeedback === 'error' ? 'is-feedback-err' : ''}
        >{copyLabel}</button>
      </div>

      <div className="specsnap-inspector-panel__frames">
        {frames.length === 0 ? (
          <div className="specsnap-inspector-empty">
            Click Start Inspect, then click any element in the target area.
          </div>
        ) : (
          frames.map((frame, i) => {
            const sessionFrame = session?.frames[i];
            const gap = gapAfter(i);
            return (
              <div key={i} className="specsnap-inspector-frame">
                <header className="specsnap-inspector-frame__row">
                  <span className="specsnap-inspector-frame__index">{i + 1}</span>
                  <span>{describeFrame(frame)}</span>
                </header>
                {sessionFrame && (
                  <div className="specsnap-inspector-frame__detail">
                    <div className="specsnap-inspector-frame__boxmodel">
                      <BoxModelDiagram frame={sessionFrame} />
                    </div>
                    <dl className="specsnap-inspector-frame__meta">
                      <div><dt>size</dt><dd>{frameSize(sessionFrame)}</dd></div>
                      <div><dt>padding</dt><dd>{fourSides(sessionFrame.boxModel.padding)}</dd></div>
                      <div><dt>border</dt><dd>{fourSides(sessionFrame.boxModel.border)}</dd></div>
                      <div><dt>margin</dt><dd>{fourSides(sessionFrame.boxModel.margin)}</dd></div>
                      <div><dt>font</dt><dd>{fontLine(sessionFrame)}</dd></div>
                      <div className="specsnap-inspector-frame__meta-wide">
                        <dt>family</dt><dd>{sessionFrame.typography.fontFamily}</dd>
                      </div>
                      <div><dt>bg</dt><dd>{backgroundLine(sessionFrame)}</dd></div>
                      {gap && <div><dt>↓ gap</dt><dd>{gap}</dd></div>}
                    </dl>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {statusMessage && (
        <div className="specsnap-inspector-panel__status" data-kind={statusKind}>{statusMessage}</div>
      )}

      <details className="specsnap-inspector-panel__json">
        <summary>Raw JSON (machine consumers)</summary>
        <pre>{sessionJson}</pre>
      </details>
    </div>
  );
}
