import type { Board, BoardScore, RowScoreBreakdown, ExpansionState, AnimalType, TileColor, Tile } from './types';
import { BOARD_ROWS, BOARD_COLS, COUNT_SCORE, COLOR_BONUS, EXTINCTION_BONUS, ACROBATIC_BONUS } from './constants';

/**
 * Calcula la puntuación completa de un tablero.
 * Si includeExpansions=false, los bonuses de expansión quedan en 0
 * (útil durante la partida para mostrar puntuación parcial).
 */
export function calculateBoardScore(
  board: Board,
  expansionState: ExpansionState,
  includeExpansions: boolean,
): BoardScore {
  const breakdown = calculateBreakdown(board);
  const subtotal = breakdown.row0 + breakdown.rows12 + breakdown.row3 + breakdown.row4 + breakdown.colorBonus;

  let extinctionBonus = 0;
  let acrobaticBonus = 0;

  if (includeExpansions) {
    extinctionBonus = 0; // Se calcula al final comparando ambos tableros
    acrobaticBonus = calculateAcrobaticBonus(board, expansionState);
  }

  return {
    breakdown,
    subtotal,
    extinctionBonus,
    acrobaticBonus,
    total: subtotal + extinctionBonus + acrobaticBonus,
  };
}

function calculateBreakdown(board: Board): RowScoreBreakdown {
  return {
    row0: scoreRow0(board),
    rows12: scoreRows12(board),
    row3: scoreRow3(board),
    row4: scoreRow4(board),
    colorBonus: scoreColorBonus(board),
  };
}

/**
 * Fila 1 (índice 0): +4 por cada columna donde
 * board[0][c], board[1][c] y board[2][c] tienen la misma especie.
 */
function scoreRow0(board: Board): number {
  let pts = 0;
  for (let col = 0; col < BOARD_COLS; col++) {
    const r0 = board[0][col];
    const r1 = board[1][col];
    const r2 = board[2][col];
    if (r0 && r1 && r2 && r0.animal === r1.animal && r1.animal === r2.animal) {
      pts += 4;
    }
  }
  return pts;
}

/**
 * Filas 2 y 3 (índices 1 y 2): +3 por cada par de misma especie
 * en la misma columna (board[1][c] y board[2][c]).
 */
function scoreRows12(board: Board): number {
  let pts = 0;
  for (let col = 0; col < BOARD_COLS; col++) {
    const r1 = board[1][col];
    const r2 = board[2][col];
    if (r1 && r2 && r1.animal === r2.animal) {
      pts += 3;
    }
  }
  return pts;
}

/**
 * Fila 4 (índice 3): puntuación por grupos de misma especie.
 * Cada grupo se puntúa independientemente con COUNT_SCORE.
 */
function scoreRow3(board: Board): number {
  const counts = new Map<AnimalType, number>();
  for (const tile of board[3]) {
    if (tile) counts.set(tile.animal, (counts.get(tile.animal) ?? 0) + 1);
  }
  let pts = 0;
  for (const count of counts.values()) {
    pts += COUNT_SCORE[count] ?? 0;
  }
  return pts;
}

/**
 * Fila 5 (índice 4): puntuación por diversidad de especies distintas.
 */
function scoreRow4(board: Board): number {
  const species = new Set<AnimalType>();
  for (const tile of board[4]) {
    if (tile) species.add(tile.animal);
  }
  return COUNT_SCORE[species.size] ?? 0;
}

/**
 * +5 por cada fila o columna completa (5 fichas) del mismo color.
 */
function scoreColorBonus(board: Board): number {
  let pts = 0;

  // Filas
  for (let row = 0; row < BOARD_ROWS; row++) {
    const rowTiles = board[row];
    if (rowTiles.every(t => t !== null)) {
      const colors = new Set(rowTiles.map(t => t!.color));
      if (colors.size === 1) pts += COLOR_BONUS;
    }
  }

  // Columnas
  for (let col = 0; col < BOARD_COLS; col++) {
    const colTiles = board.map(row => row[col]);
    if (colTiles.every(t => t !== null)) {
      const colors = new Set(colTiles.map(t => t!.color));
      if (colors.size === 1) pts += COLOR_BONUS;
    }
  }

  return pts;
}

/** Bonus acrobático: +5 si board[0][4] tiene el animal objetivo */
function calculateAcrobaticBonus(board: Board, state: ExpansionState): number {
  if (!state.acrobaticTarget) return 0;
  const cell = board[0][BOARD_COLS - 1];
  return cell && cell.animal === state.acrobaticTarget ? ACROBATIC_BONUS : 0;
}

/**
 * Calcula el bonus de extinción comparando los dos tableros.
 * El jugador con MENOS fichas del target obtiene EXTINCTION_BONUS.
 * Retorna [playerBonus, aiBonus].
 */
export function calculateExtinctionBonuses(
  playerBoard: Board,
  aiBoard: Board,
  expansionState: ExpansionState,
): [number, number] {
  if (!expansionState.extinctionTarget) return [0, 0];

  const target = expansionState.extinctionTarget;

  const countBoard = (board: Board): number => {
    let n = 0;
    for (const row of board) {
      for (const tile of row) {
        if (!tile) continue;
        if (target.kind === 'animal' && tile.animal === target.value) n++;
        if (target.kind === 'color' && tile.color === (target.value as TileColor)) n++;
      }
    }
    return n;
  };

  const playerCount = countBoard(playerBoard);
  const aiCount = countBoard(aiBoard);

  if (playerCount < aiCount) return [EXTINCTION_BONUS, 0];
  if (aiCount < playerCount) return [0, EXTINCTION_BONUS];
  return [0, 0]; // empate: nadie recibe el bonus
}

/** Cuenta fichas de un target en un tablero (para mostrar durante la partida) */
export function countExtinctionTiles(board: Board, expansionState: ExpansionState): number {
  if (!expansionState.extinctionTarget) return 0;
  const target = expansionState.extinctionTarget;
  let n = 0;
  for (const row of board) {
    for (const tile of row) {
      if (!tile) continue;
      if (target.kind === 'animal' && tile.animal === target.value) n++;
      if (target.kind === 'color' && tile.color === (target.value as TileColor)) n++;
    }
  }
  return n;
}

/** Devuelve cuántas fichas caben en una fila */
export function availableRowSpace(board: Board, row: number): number {
  return board[row].filter(cell => cell === null).length;
}

/** Coloca fichas en la fila (las primeras posiciones libres de izquierda a derecha) */
export function placeTilesInRow(board: Board, tiles: readonly Tile[], row: number): Board {
  const newBoard = board.map(r => [...r]);
  let placed = 0;
  for (let col = 0; col < BOARD_COLS && placed < tiles.length; col++) {
    if (newBoard[row][col] === null) {
      newBoard[row][col] = tiles[placed];
      placed++;
    }
  }
  return newBoard;
}

