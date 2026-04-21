import { forwardRef, useEffect, useImperativeHandle, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { TriggerButton } from './TriggerButton.js';
import { Panel } from './Panel.js';
import { useInspector } from './use-inspector.js';
import type {
  InspectorOptions,
  InspectorSnapshot,
  InspectorHandle,
  PanelPosition,
  Session,
  SpecSnapBundle,
  SaveResult
} from '@tw199501/specsnap-inspector-core';

export interface SpecSnapInspectorProps {
  scope?: InspectorOptions['scope'];
  position?: PanelPosition;
  trigger?: boolean;
  panelTitle?: string;
  onSave?: (bundle: SpecSnapBundle) => void | Promise<void>;
  onCopy?: (markdown: string) => void;
  onCapture?: (payload: { frameIndex: number; session: Session }) => void;
  onClear?: () => void;
  onOpen?: () => void;
  onClose?: () => void;
}

export interface SpecSnapInspectorHandle {
  open: () => void;
  close: () => void;
  toggle: () => void;
  startPicker: () => void;
  stopPicker: () => void;
  clearFrames: () => void;
  copyMarkdown: () => Promise<void>;
  saveBundle: () => Promise<SaveResult>;
  getSnapshot: () => InspectorSnapshot;
  /** Escape hatch for power users. */
  handle: InspectorHandle;
}

export const SpecSnapInspector = forwardRef<SpecSnapInspectorHandle, SpecSnapInspectorProps>(
  function SpecSnapInspector(props, ref) {
    const position = props.position ?? 'bottom-right';
    const showTrigger = props.trigger ?? true;
    const panelTitle = props.panelTitle ?? 'SpecSnap Inspector';

    const inspectorOptions: InspectorOptions = {
      position,
      trigger: showTrigger,
      panelTitle
    };
    if (props.scope !== undefined) inspectorOptions.scope = props.scope;
    if (props.onSave) inspectorOptions.onSave = props.onSave;
    if (props.onCopy) inspectorOptions.onCopy = props.onCopy;
    if (props.onCapture) inspectorOptions.onCapture = props.onCapture;
    if (props.onClear) inspectorOptions.onClear = props.onClear;
    if (props.onOpen) inspectorOptions.onOpen = props.onOpen;
    if (props.onClose) inspectorOptions.onClose = props.onClose;

    const { snapshot, handle } = useInspector(inspectorOptions);

    useEffect(() => {
      document.body.classList.toggle('specsnap-inspecting', snapshot.picking);
    }, [snapshot.picking]);

    useImperativeHandle(ref, () => ({
      open: handle.open,
      close: handle.close,
      toggle: handle.toggle,
      startPicker: handle.startPicker,
      stopPicker: handle.stopPicker,
      clearFrames: handle.clearFrames,
      copyMarkdown: handle.copyMarkdown,
      saveBundle: handle.saveBundle,
      getSnapshot: handle.getSnapshot,
      handle
    }), [handle]);

    const onCopy = useCallback(async () => {
      handle.stopPicker();
      await handle.copyMarkdown();
      await handle.saveBundle();
    }, [handle]);

    const onTogglePicker = useCallback(() => {
      if (snapshot.picking) handle.stopPicker();
      else handle.startPicker();
    }, [handle, snapshot.picking]);

    return (
      <>
        {showTrigger && !snapshot.visible && (
          <TriggerButton
            position={position}
            onClick={handle.toggle}
          />
        )}
        {snapshot.visible && typeof document !== 'undefined' && createPortal(
          <Panel
            snapshot={snapshot}
            position={position}
            title={panelTitle}
            onClose={handle.close}
            onTogglePicker={onTogglePicker}
            onClear={handle.clearFrames}
            onCopy={onCopy}
          />,
          document.body
        )}
      </>
    );
  }
);
