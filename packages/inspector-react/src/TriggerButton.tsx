import type { PanelPosition } from '@tw199501/specsnap-inspector-core';

export interface TriggerButtonProps {
  position: PanelPosition;
  onClick: () => void;
}

export function TriggerButton({ position, onClick }: TriggerButtonProps) {
  return (
    <button
      type="button"
      className="specsnap-inspector-trigger"
      data-position={position}
      aria-label="Open SpecSnap Inspector"
      onClick={onClick}
    >
      ◎
    </button>
  );
}
