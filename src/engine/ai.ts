import type { GameState, Tile } from './types';
import { computeCollection, removeTilesByIds } from './forest';
import { calculateBoardScore, placeTilesInRow, availableRowSpace } from './scoring';
import { BOARD_ROWS } from './constants';

export interface AiDecision {
  zone: number;
  tile: Tile;
  row: number;
}

/** Selecciona la mejor jugada para la IA según la dificultad */
export function evaluateAi(state: GameState): AiDecision | null {
  if (state.difficulty === 'EXTREME') return evaluateExtreme(state);
  if (state.difficulty === 'HARD') return evaluateHard(state);
  return evaluateEasy(state);
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
 * IA extremo: adversarial — maximiza la ganancia propia mientras minimiza
 * la mejor jugada disponible para el jugador en el bosque resultante.
 * score = aiGain × 1.5 − bestPlayerGain
 */
function evaluateExtreme(state: GameState): AiDecision | null {
  const currentAiSubtotal = state.aiScore.subtotal;
  const currentPlayerSubtotal = state.playerScore.subtotal;

  let bestScore = -Infinity;
  let bestChoice: AiDecision | null = null;

  for (const zone of state.forestZones) {
    for (const tile of zone.tiles) {
      const collected = computeCollection(state.forestZones, zone.id, tile);

      for (let row = 0; row < BOARD_ROWS; row++) {
        if (availableRowSpace(state.aiBoard, row) === 0) continue;

        const aiSimBoard = placeTilesInRow(state.aiBoard, collected, row);
        const aiGain = calculateBoardScore(aiSimBoard, state.expansionState, false).subtotal - currentAiSubtotal;

        // Bosque restante tras la jugada de la IA
        const ids = new Set(collected.map(t => t.id));
        const remainingZones = removeTilesByIds(state.forestZones, ids);

        // Mejor ganancia posible del jugador desde ese bosque
        let bestPlayerGain = 0;
        for (const pZone of remainingZones) {
          for (const pTile of pZone.tiles) {
            const playerCollected = computeCollection(remainingZones, pZone.id, pTile);
            for (let pRow = 0; pRow < BOARD_ROWS; pRow++) {
              if (availableRowSpace(state.playerBoard, pRow) === 0) continue;
              const playerSimBoard = placeTilesInRow(state.playerBoard, playerCollected, pRow);
              const playerGain = calculateBoardScore(playerSimBoard, state.expansionState, false).subtotal - currentPlayerSubtotal;
              if (playerGain > bestPlayerGain) bestPlayerGain = playerGain;
            }
          }
        }

        const adversarialScore = aiGain * 1.5 - bestPlayerGain;
        if (adversarialScore > bestScore) {
          bestScore = adversarialScore;
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
