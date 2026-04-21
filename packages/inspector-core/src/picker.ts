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

    const exclude = opts.excludeSelectors ?? [];
    if (exclude.length > 0 && matchesAny(e.target, exclude)) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    const scopeEl = resolveScope(opts.scope);
    if (!scopeEl.contains(e.target)) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

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
