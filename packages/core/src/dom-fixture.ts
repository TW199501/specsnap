// DOM fixture helpers for tests. Avoids innerHTML for XSS hygiene.

export interface ElementSpec {
  tag?: string; // default 'div'
  id?: string;
  classes?: readonly string[];
  style?: string;
  text?: string;
}

export function makeElement(spec: ElementSpec): HTMLElement {
  const el = document.createElement(spec.tag ?? 'div');
  if (spec.id) el.id = spec.id;
  if (spec.classes) spec.classes.forEach((c) => el.classList.add(c));
  if (spec.style) el.setAttribute('style', spec.style);
  if (spec.text) el.textContent = spec.text;
  return el;
}

export function clearBody(): void {
  while (document.body.firstChild) {
    document.body.removeChild(document.body.firstChild);
  }
}

export function mount(el: HTMLElement): HTMLElement {
  document.body.appendChild(el);
  return el;
}
