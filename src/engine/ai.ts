import type { GameState, Tile } from './types';
import { computeCollection } from './forest';
import { calculateBoardScore, placeTilesInRow, availableRowSpace } from './scoring';
import { BOARD_ROWS } from './constants';

export interface AiDecision {
  zone: number;
  tile: Tile;
  row: number;
}

/** Selecciona la mejor jugada para la IA según la dificultad */
export function evaluateAi(state: GameState): AiDecision | null {
  return state.difficulty === 'HARD' ? evaluateHard(state) : evaluateEasy(state);
}

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
