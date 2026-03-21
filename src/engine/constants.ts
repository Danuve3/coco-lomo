import type { AnimalType, TileColor } from './types';

export const ANIMALS: readonly AnimalType[] = ['RABBIT', 'LEOPARD', 'EAGLE', 'BEAR', 'DUCK'];
export const COLORS: readonly TileColor[] = ['RED', 'GREEN', 'BLUE'];

export const BOARD_ROWS = 5;
export const BOARD_COLS = 5;

/**
 * 4 grupos/zonas en grid 2×2:
 *
 *   [Z0] [Z1]
 *   [Z2] [Z3]
 *
 * Sentido horario: Z0 → Z1 → Z3 → Z2 → Z0
 * Diagonales: (Z0,Z3) y (Z1,Z2)
 */
export const ZONE_COUNT = 4;
export const TILES_PER_ZONE = 4;  // fichas visibles por zona en el bosque
export const TILES_PER_TYPE = 8;  // copias de cada combinación animal × color (5 × 3 × 8 = 120 total)

export const MAX_ROUNDS = 6;

/**
 * Puntuación por grupos/diversidad (índice = cantidad).
 * Usado para Fila 4 (grupos) y Fila 5 (diversidad).
 */
export const COUNT_SCORE: readonly number[] = [0, 1, 2, 5, 9, 14];

/** Puntos extra por bonus de color (fila/columna completa misma color) */
export const COLOR_BONUS = 5;

/** Bonus expansión A — extinción */
export const EXTINCTION_BONUS = 7;

/** Bonus expansión B — acrobacia */
export const ACROBATIC_BONUS = 5;

/** Zona siguiente en sentido horario: Z0→Z1→Z3→Z2→Z0 */
export const ZONE_CW:   Readonly<Record<number, number>> = { 0: 1, 1: 3, 3: 2, 2: 0 };
/** Zona siguiente en sentido antihorario: Z0→Z2→Z3→Z1→Z0 */
export const ZONE_CCW:  Readonly<Record<number, number>> = { 0: 2, 2: 3, 3: 1, 1: 0 };
/** Zona diagonal: (Z0↔Z3) y (Z1↔Z2) */
export const ZONE_DIAG: Readonly<Record<number, number>> = { 0: 3, 1: 2, 2: 1, 3: 0 };
