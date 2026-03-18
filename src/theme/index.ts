export { ANIMAL_DEFS } from './animals';
export { COLOR_DEFS } from './colors';
export type { AnimalDefinition } from './animals';
export type { ColorDefinition } from './colors';

import type { AnimalType, TileColor } from '../engine/types';
import { ANIMAL_DEFS } from './animals';
import { COLOR_DEFS } from './colors';

/** HTML de una ficha: emoji + nombre del color como data-attr */
export function tileHTML(animal: AnimalType, color: TileColor, extraClass = ''): string {
  const a = ANIMAL_DEFS[animal];
  const c = COLOR_DEFS[color];
  return `<div
    class="tile ${extraClass}"
    style="background:${c.bg};color:${c.text};border-color:${c.border};"
    data-animal="${animal}"
    data-color="${color}"
    aria-label="${a.name} ${c.name}"
    title="${a.name} — ${c.name}"
  ><span class="tile__icon">${a.icon}</span></div>`;
}

/** Icono del animal como string (emoji o SVG inline en el futuro) */
export function animalIcon(animal: AnimalType): string {
  return ANIMAL_DEFS[animal].icon;
}

/** Nombre del animal en español */
export function animalName(animal: AnimalType): string {
  return ANIMAL_DEFS[animal].name;
}

/** Nombre del color en español */
export function colorName(color: TileColor): string {
  return COLOR_DEFS[color].name;
}

/** Color de fondo de la ficha */
export function tileBg(color: TileColor): string {
  return COLOR_DEFS[color].bg;
}
