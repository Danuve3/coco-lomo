import type { GameState, Tile, Board, ExpansionState, AnimalType } from './types';
import { computeCollection, removeTilesByIds } from './forest';
import { calculateBoardScore, placeTilesInRow, availableRowSpace } from './scoring';
import { BOARD_ROWS, BOARD_COLS, COUNT_SCORE } from './constants';

export interface AiDecision {
  zone: number;
  tile: Tile;
  row: number;
  /** Per-tile optimal row assignments (EXTREME mode). Same length as collected tiles. */
  rowAssignments?: number[];
}

/** Selecciona la mejor jugada para la IA según la dificultad */
export function evaluateAi(state: GameState): AiDecision | null {
  if (state.difficulty === 'EXTREME') return evaluateExtreme(state);
  if (state.difficulty === 'HARD') return evaluateHard(state);
  return evaluateEasy(state);
}

// ─── HARD ────────────────────────────────────────────────────────────────────

/**
 * IA difícil: busca la zona+ficha+fila que maximiza el incremento de puntuación.
 * Greedy con lookahead de 1 turno.
 */
function evaluateHard(state: GameState): AiDecision | null {
  let bestScore = -Infinity;
  let bestChoice: AiDecision | null = null;

  for (const zone of state.forestZones) {
    for (const tile of zone.tiles) {
      const collected = computeCollection(state.forestZones, zone.id, tile);

      for (let row = 0; row < BOARD_ROWS; row++) {
        if (availableRowSpace(state.aiBoard, row) === 0) continue;

        const simBoard = placeTilesInRow(state.aiBoard, collected, row);
        const simScore = calculateBoardScore(simBoard, state.expansionState, false).subtotal;

        if (simScore > bestScore) {
          bestScore = simScore;
          bestChoice = { zone: zone.id, tile, row };
        }
      }
    }
  }

  return bestChoice;
}

// ─── EXTREME ─────────────────────────────────────────────────────────────────

/**
 * IA extremo — adversarial mejorada:
 *
 * - Búsqueda exhaustiva de la asignación óptima de fichas a filas (max 5^4 combinaciones).
 * - Incluye potencial del tablero (patrones incompletos cercanos a puntuación extra).
 * - Incluye conciencia de expansiones (extinción y acrobacia).
 * - Simula la mejor respuesta del jugador con asignación greedy (rápida).
 *
 * score = (aiGain + potential*0.5 + expansion) * 1.5 − playerValue
 */
function evaluateExtreme(state: GameState): AiDecision | null {
  let bestScore = -Infinity;
  let bestChoice: AiDecision | null = null;

  for (const zone of state.forestZones) {
    for (const tile of zone.tiles) {
      const collected = computeCollection(state.forestZones, zone.id, tile);

      // Búsqueda exhaustiva: mejor asignación de fichas a filas para la IA
      const { board: aiSimBoard, assignments } = exhaustiveTileAssignment(
        state.aiBoard, collected, state.expansionState,
      );

      // Si no se pudo colocar ninguna ficha, ignorar esta jugada
      if (collected.length > 0 && assignments.every(r => r < 0)) continue;

      const aiNewSubtotal = calculateBoardScore(aiSimBoard, state.expansionState, false).subtotal;
      const aiGain = aiNewSubtotal - state.aiScore.subtotal;
      const aiPotential = boardPotential(aiSimBoard, state.expansionState);
      const aiExpBonus = expansionBonus(aiSimBoard, state.expansionState, state.playerBoard);

      // Bosque restante tras la jugada de la IA
      const ids = new Set(collected.map(t => t.id));
      const remainingZones = removeTilesByIds(state.forestZones, ids);

      // Mejor respuesta posible del jugador (greedy, rápida)
      let bestPlayerValue = 0;
      for (const pZone of remainingZones) {
        for (const pTile of pZone.tiles) {
          const playerCollected = computeCollection(remainingZones, pZone.id, pTile);
          const { board: playerSimBoard } = greedyTileAssignment(
            state.playerBoard, playerCollected, state.expansionState,
          );
          const playerGain =
            calculateBoardScore(playerSimBoard, state.expansionState, false).subtotal
            - state.playerScore.subtotal;
          const playerPotential = boardPotential(playerSimBoard, state.expansionState) * 0.4;
          const totalPlayerValue = playerGain + playerPotential;
          if (totalPlayerValue > bestPlayerValue) bestPlayerValue = totalPlayerValue;
        }
      }

      const adversarialScore = (aiGain + aiPotential * 0.5 + aiExpBonus) * 1.5 - bestPlayerValue;

      if (adversarialScore > bestScore) {
        bestScore = adversarialScore;
        const primaryRow = assignments.find(r => r >= 0) ?? 0;
        bestChoice = { zone: zone.id, tile, row: primaryRow, rowAssignments: assignments };
      }
    }
  }

  return bestChoice;
}

// ─── Placement helpers ────────────────────────────────────────────────────────

/**
 * Búsqueda exhaustiva de la asignación óptima de fichas a filas.
 * Combina puntuación actual + potencial de tablero.
 * Complejidad máx.: 5^4 = 625 combinaciones (4 fichas × 5 filas).
 */
function exhaustiveTileAssignment(
  board: Board,
  tiles: readonly Tile[],
  expansionState: ExpansionState,
): { board: Board; assignments: number[] } {
  if (tiles.length === 0) return { board, assignments: [] };

  let bestScore = -Infinity;
  let bestBoard = board;
  let bestAssignment: number[] = [];

  function recurse(current: Board, idx: number, assignment: number[]): void {
    if (idx === tiles.length) {
      const score =
        calculateBoardScore(current, expansionState, false).subtotal
        + boardPotential(current, expansionState) * 0.5;
      if (score > bestScore) {
        bestScore = score;
        bestBoard = current;
        bestAssignment = [...assignment];
      }
      return;
    }

    let anyPlaced = false;
    for (let row = 0; row < BOARD_ROWS; row++) {
      if (availableRowSpace(current, row) === 0) continue;
      anyPlaced = true;
      recurse(placeTilesInRow(current, [tiles[idx]], row), idx + 1, [...assignment, row]);
    }
    // Si no hay filas disponibles, marcar -1 (ficha no colocada)
    if (!anyPlaced) recurse(current, idx + 1, [...assignment, -1]);
  }

  recurse(board, 0, []);
  return { board: bestBoard, assignments: bestAssignment };
}

/**
 * Asignación greedy de fichas a filas (para simular respuesta del jugador).
 * O(fichas × filas) — rápida.
 */
function greedyTileAssignment(
  board: Board,
  tiles: readonly Tile[],
  expansionState: ExpansionState,
): { board: Board } {
  let current = board;
  for (const tile of tiles) {
    let bestRow = -1;
    let bestRowScore = -Infinity;
    for (let row = 0; row < BOARD_ROWS; row++) {
      if (availableRowSpace(current, row) === 0) continue;
      const sim = placeTilesInRow(current, [tile], row);
      const score =
        calculateBoardScore(sim, expansionState, false).subtotal
        + boardPotential(sim, expansionState) * 0.4;
      if (score > bestRowScore) {
        bestRowScore = score;
        bestRow = row;
      }
    }
    if (bestRow >= 0) {
      current = placeTilesInRow(current, [tile], bestRow);
    }
  }
  return { board: current };
}

// ─── Heuristics ───────────────────────────────────────────────────────────────

/**
 * Estima el potencial de puntuación futura de un tablero.
 * Premia patrones incompletos cercanos a completarse:
 * - Grupos de misma especie en fila 4 (índice 3) cerca del siguiente tier
 * - Diversidad en fila 5 (índice 4) cerca del siguiente tier
 * - Columnas con 2 de 3 fichas del mismo animal (→ +4 o +3)
 * - Filas/columnas monochrome parcialmente completas (→ +5 de color)
 * - Proximidad al bonus acrobático
 */
function boardPotential(board: Board, expansionState: ExpansionState): number {
  let potential = 0;

  // ── Fila 4 (índice 3): grupos de misma especie ──────────────────────────────
  const row3Counts = new Map<AnimalType, number>();
  for (const t of board[3]) {
    if (t) row3Counts.set(t.animal, (row3Counts.get(t.animal) ?? 0) + 1);
  }
  for (const cnt of row3Counts.values()) {
    const marginal = (COUNT_SCORE[cnt + 1] ?? 0) - (COUNT_SCORE[cnt] ?? 0);
    potential += marginal * 0.6;
  }

  // ── Fila 5 (índice 4): diversidad de especies ──────────────────────────────
  const row4Species = new Set<AnimalType>();
  let row4Empty = 0;
  for (const t of board[4]) {
    if (t) row4Species.add(t.animal);
    else row4Empty++;
  }
  if (row4Empty > 0) {
    const marginal = (COUNT_SCORE[row4Species.size + 1] ?? 0) - (COUNT_SCORE[row4Species.size] ?? 0);
    potential += marginal * 0.5;
  }

  // ── Alineación columnas (filas 0,1,2) ─────────────────────────────────────
  for (let col = 0; col < BOARD_COLS; col++) {
    const r0 = board[0][col];
    const r1 = board[1][col];
    const r2 = board[2][col];

    // Par en filas 1+2 incompleto — potencial de +3
    if ((r1 !== null) !== (r2 !== null)) potential += 0.8;

    // Triplete: 2 de 3 con mismo animal → potencial de +4 (row0) o +3 (rows12)
    const animals = [r0?.animal, r1?.animal, r2?.animal].filter((a): a is AnimalType => !!a);
    if (animals.length >= 2) {
      const countMap = new Map<AnimalType, number>();
      for (const a of animals) countMap.set(a, (countMap.get(a) ?? 0) + 1);
      const maxCount = Math.max(...countMap.values());
      if (maxCount === 2) potential += 1.5;
    }
  }

  // ── Bonus de color: filas/columnas monocromas parciales ────────────────────
  // Filas
  for (let row = 0; row < BOARD_ROWS; row++) {
    const tiles = board[row].filter((t): t is NonNullable<typeof t> => t !== null);
    if (tiles.length < 2) continue;
    const colorCounts = new Map<string, number>();
    for (const t of tiles) colorCounts.set(t.color, (colorCounts.get(t.color) ?? 0) + 1);
    const maxSameColor = Math.max(...colorCounts.values());
    if (maxSameColor === tiles.length) {
      // Todos los colocados son del mismo color → potencial según proximidad al completar
      potential += (tiles.length - 1) * 0.4;
    }
  }
  // Columnas
  for (let col = 0; col < BOARD_COLS; col++) {
    const tiles = board.map(r => r[col]).filter((t): t is NonNullable<typeof t> => t !== null);
    if (tiles.length < 2) continue;
    const colorCounts = new Map<string, number>();
    for (const t of tiles) colorCounts.set(t.color, (colorCounts.get(t.color) ?? 0) + 1);
    const maxSameColor = Math.max(...colorCounts.values());
    if (maxSameColor === tiles.length) {
      potential += (tiles.length - 1) * 0.4;
    }
  }

  // ── Bonus acrobático ───────────────────────────────────────────────────────
  if (expansionState.acrobaticTarget) {
    const topRight = board[0][BOARD_COLS - 1];
    if (topRight === null) {
      // Casilla libre — cada copia del animal objetivo en el tablero aumenta la probabilidad
      let targetCount = 0;
      for (const row of board) {
        for (const t of row) {
          if (t?.animal === expansionState.acrobaticTarget) targetCount++;
        }
      }
      potential += targetCount * 0.7;
    }
  }

  return potential;
}

/**
 * Estima el valor de las expansiones para una posición de tablero.
 * Guía a la IA hacia objetivos de extinción y acrobacia.
 */
function expansionBonus(
  board: Board,
  expansionState: ExpansionState,
  oppBoard: Board,
): number {
  let bonus = 0;

  // Extinción: gana quien tenga MENOS fichas del target → penalizar tener más que el rival
  if (expansionState.extinctionTarget) {
    const target = expansionState.extinctionTarget;
    const myCount = countTargetTiles(board, target);
    const oppCount = countTargetTiles(oppBoard, target);
    const lead = oppCount - myCount; // positivo si tengo menos (ganando)
    bonus += lead * 2;
  }

  // Acrobacia: +5 si la casilla top-right tiene el animal objetivo
  if (expansionState.acrobaticTarget) {
    const topRight = board[0][BOARD_COLS - 1];
    if (topRight?.animal === expansionState.acrobaticTarget) {
      bonus += 5;
    }
  }

  return bonus;
}

function countTargetTiles(
  board: Board,
  target: NonNullable<ExpansionState['extinctionTarget']>,
): number {
  let n = 0;
  for (const row of board) {
    for (const t of row) {
      if (!t) continue;
      if (target.kind === 'animal' && t.animal === target.value) n++;
      if (target.kind === 'color' && t.color === target.value) n++;
    }
  }
  return n;
}

// ─── EASY ─────────────────────────────────────────────────────────────────────

/**
 * IA fácil: 40% probabilidad de elegir la mejor jugada, 60% aleatoria.
 */
function evaluateEasy(state: GameState): AiDecision | null {
  const choices: Array<AiDecision & { score: number }> = [];

  for (const zone of state.forestZones) {
    for (const tile of zone.tiles) {
      const collected = computeCollection(state.forestZones, zone.id, tile);

      for (let row = 0; row < BOARD_ROWS; row++) {
        if (availableRowSpace(state.aiBoard, row) === 0) continue;

        const simBoard = placeTilesInRow(state.aiBoard, collected, row);
        const score = calculateBoardScore(simBoard, state.expansionState, false).subtotal;
        choices.push({ zone: zone.id, tile, row, score });
      }
    }
  }

  if (choices.length === 0) return null;

  if (Math.random() < 0.4) {
    choices.sort((a, b) => b.score - a.score);
    return { zone: choices[0].zone, tile: choices[0].tile, row: choices[0].row };
  }

  const pick = choices[Math.floor(Math.random() * choices.length)];
  return { zone: pick.zone, tile: pick.tile, row: pick.row };
}
