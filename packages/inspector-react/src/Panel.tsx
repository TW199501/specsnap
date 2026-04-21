import { useMemo } from 'react';
import type { InspectorSnapshot, PanelPosition } from '@tw199501/specsnap-inspector-core';

export interface PanelProps {
  snapshot: InspectorSnapshot;
  position: PanelPosition;
  title: string;
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

export function Panel({ snapshot, position, title, onClose, onTogglePicker, onClear, onCopy }: PanelProps) {
  const { frames, picking, nextCaptureId, session, lastSave } = snapshot;

  const sessionJson = useMemo(
    () => session ? JSON.stringify(session, null, 2) : 'No session yet.',
    [session]
  );

  const inspectLabel = picking
    ? `Done (${frames.length})`
    : frames.length === 0 ? 'Start Inspect' : `Start Inspect · ${frames.length}`;

  const statusMessage = (() => {
    if (!lastSave) return '';
    if (lastSave.error) return `✗ ${lastSave.error}`;
    if (lastSave.strategy === 'fs-access') return `✓ Saved to ${lastSave.location} (${lastSave.fileCount} files)`;
    if (lastSave.strategy === 'zip') return `✓ Downloaded ${lastSave.location}`;
    if (lastSave.strategy === 'individual') return `✓ Downloaded ${lastSave.fileCount} files`;
    return '✓ Handled by app';
  })();
  const statusKind = lastSave?.error ? 'error' : lastSave ? 'success' : 'info';

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
        <button type="button" onClick={onCopy} disabled={frames.length === 0}>Copy MD</button>
      </div>

      <div className="specsnap-inspector-panel__frames">
        {frames.length === 0 ? (
          <div className="specsnap-inspector-empty">
            Click Start Inspect, then click any element in the target area.
          </div>
        ) : (
          frames.map((frame, i) => (
            <div key={i} className="specsnap-inspector-frame">
              <span className="specsnap-inspector-frame__index">{i + 1}</span>
              <span>{describeFrame(frame)}</span>
            </div>
          ))
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
