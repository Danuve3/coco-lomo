/**
 * SISTEMA DE THEMING — Definición de animales
 *
 * Para sustituir emojis por SVGs o imágenes:
 *   1. Cambia `icon` a una función que retorne un elemento <img> o <svg> en string.
 *   2. Ajusta `renderIcon` en TileComponent.ts.
 *
 * Para añadir un nuevo animal:
 *   1. Añade su tipo en engine/types.ts (AnimalType).
 *   2. Añade la entrada aquí.
 *   3. Añádelo en engine/constants.ts (ANIMALS).
 *   4. Implementa su regla de movimiento en engine/movement.ts.
 */

import type { AnimalType } from '../engine/types';

export interface AnimalDefinition {
  readonly type: AnimalType;
  /** Emoji o placeholder mientras no haya asset gráfico */
  readonly icon: string;
  /** Nombre en español */
  readonly name: string;
  /** Descripción del movimiento para la pantalla de reglas */
  readonly movement: string;
  /** Color de acento sugerido para la ficha (sobreescrito por TileColor) */
  readonly accentHint: string;
}

export const ANIMAL_DEFS: Record<AnimalType, AnimalDefinition> = {
  RABBIT: {
    type: 'RABBIT',
    icon: '🐇',
    name: 'Conejo',
    movement: 'Se mueve 1 zona en sentido horario.',
    accentHint: '#F5C5A3',
  },
  LEOPARD: {
    type: 'LEOPARD',
    icon: '🐆',
    name: 'Leopardo',
    movement: 'Se mueve 1 zona en sentido antihorario.',
    accentHint: '#F5E6A3',
  },
  EAGLE: {
    type: 'EAGLE',
    icon: '🦅',
    name: 'Águila',
    movement: 'Salta 2 zonas en diagonal (sentido horario).',
    accentHint: '#B0C8E0',
  },
  BEAR: {
    type: 'BEAR',
    icon: '🐻',
    name: 'Oso',
    movement: 'No se mueve. Permanece en su zona.',
    accentHint: '#C8B49A',
  },
  DUCK: {
    type: 'DUCK',
    icon: '🦆',
    name: 'Pato',
    movement: 'Avanza (horario) hasta la siguiente zona con otro pato. Si no hay, permanece.',
    accentHint: '#A3D4C8',
  },
};
