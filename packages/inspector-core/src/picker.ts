import type { ScopeInput } from './types.js';

export interface PickerOptions {
  onPick: (el: HTMLElement) => void;
  onCancel?: () => void;
  scope?: ScopeInput;
  excludeSelectors?: readonly string[];
}

export interface Picker {
  start: () => void;
  stop: () => void;
  isActive: () => boolean;
}

function resolveScope(scope: ScopeInput | undefined): HTMLElement {
  if (!scope) return document.body;
  if (typeof scope === 'function') return scope();
  return scope;
}

function matchesAny(el: Element, selectors: readonly string[]): boolean {
  for (const sel of selectors) {
    if (el.closest(sel)) return true;
  }
  return false;
}

export function createPicker(opts: PickerOptions): Picker {
  let active = false;

  function onClick(e: MouseEvent): void {
    if (!active) return;
    if (!(e.target instanceof HTMLElement)) return;

    // Excluded elements (panel, trigger, host-provided) must keep their own
    // click handlers working — DON'T swallow. User needs Start Inspect / Clear
    // / Done buttons to remain interactive during picker mode.
    const exclude = opts.excludeSelectors ?? [];
    if (exclude.length > 0 && matchesAny(e.target, exclude)) return;

    // Out-of-scope clicks proceed normally — picker simply doesn't capture
    // them. This keeps navigation / links / form inputs outside the scope
    // working even while picker is on.
    const scopeEl = resolveScope(opts.scope);
    if (!scopeEl.contains(e.target)) return;

    // In-scope successful pick: swallow the native click so the picked
    // element's own click handler (e.g. <a href> navigation, <button>
    // form submit) doesn't fire while the user is inspecting.
    e.preventDefault();
    e.stopPropagation();
    opts.onPick(e.target);
  }

  function onKeyDown(e: KeyboardEvent): void {
    if (!active) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      opts.onCancel?.();
    }
  }

  function onMouseMove(e: MouseEvent): void {
    void e;
  }

  return {
    start(): void {
      if (active) return;
      active = true;
      document.addEventListener('mousemove', onMouseMove, true);
      document.addEventListener('click', onClick, true);
      document.addEventListener('keydown', onKeyDown, true);
    },
    stop(): void {
      if (!active) return;
      active = false;
      document.removeEventListener('mousemove', onMouseMove, true);
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('keydown', onKeyDown, true);
    },
    isActive(): boolean {
      return active;
    }
  };
}
