/**
 * SISTEMA DE THEMING — Colores de fichas
 *
 * Para cambiar la paleta globalmente:
 *   Modifica los valores `bg`, `text` y `border` aquí.
 *   Todos los componentes los leen desde este módulo.
 *
 * Para añadir un nuevo color de ficha:
 *   1. Añade su tipo en engine/types.ts (TileColor).
 *   2. Añade la entrada aquí.
 *   3. Añádelo en engine/constants.ts (COLORS).
 */

import type { TileColor } from '../engine/types';

export interface ColorDefinition {
  readonly type: TileColor;
  /** Color de fondo de la ficha */
  readonly bg: string;
  /** Color de texto/emoji sobre el fondo */
  readonly text: string;
  /** Color del borde */
  readonly border: string;
  /** Nombre en español */
  readonly name: string;
  /** Variable CSS para referencia rápida */
  readonly cssVar: string;
}

export const COLOR_DEFS: Record<TileColor, ColorDefinition> = {
  TERRACOTTA: {
    type: 'TERRACOTTA',
    bg: '#C75B39',
    text: '#FFF3ED',
    border: '#E07050',
    name: 'Terracota',
    cssVar: '--tile-terracotta',
  },
  SAGE: {
    type: 'SAGE',
    bg: '#4D8C6F',
    text: '#F0FFF4',
    border: '#5EA882',
    name: 'Salvia',
    cssVar: '--tile-sage',
  },
  INK: {
    type: 'INK',
    bg: '#3D5494',
    text: '#EEF0FF',
    border: '#5070B8',
    name: 'Tinta',
    cssVar: '--tile-ink',
  },
};
