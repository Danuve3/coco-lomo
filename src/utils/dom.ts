/** Obtiene un elemento del DOM por selector, lanza error si no existe */
export function $<T extends HTMLElement>(selector: string, parent: Element | Document = document): T {
  const el = parent.querySelector<T>(selector);
  if (!el) throw new Error(`Element not found: ${selector}`);
  return el;
}

/** Obtiene todos los elementos del DOM por selector */
export function $$<T extends HTMLElement>(
  selector: string,
  parent: Element | Document = document,
): NodeListOf<T> {
  return parent.querySelectorAll<T>(selector);
}

/** Crea un elemento con atributos opcionales */
export function createElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  innerHTML = '',
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  el.innerHTML = innerHTML;
  return el;
}

/** Limpia listeners reemplazando un elemento por su clon */
export function clearListeners(el: HTMLElement): HTMLElement {
  const clone = el.cloneNode(true) as HTMLElement;
  el.replaceWith(clone);
  return clone;
}
