/**
 * Motor puro del juego: funciones de transición de estado.
 * Sin efectos secundarios, sin dependencias de UI.
 */

import type { GameState, GameConfig, Board, ExpansionState, Tile, FirstPlayer } from './types';
import { ANIMALS, COLORS, BOARD_ROWS, BOARD_COLS, MAX_ROUNDS } from './constants';
import { createInitialForest, computeCollection, removeTilesByIds, isForestEmpty, replenishZones } from './forest';

import {
  calculateBoardScore,
  calculateExtinctionBonuses,
  placeTilesInRow,
  availableRowSpace,
} from './scoring';

/** Crea el estado inicial de la partida */
export function createInitialState(config: GameConfig): GameState {
  const playerBoard = createEmptyBoard();
  const aiBoard = createEmptyBoard();
  const { zones: forestZones, pile: tilePile } = createInitialForest();
  const expansionState = createExpansionState(config);
  const humanPlaysFirst = resolveFirstPlayer(config.firstPlayer);

  const emptyScore = calculateBoardScore(playerBoard, expansionState, false);
  const firstTurnMsg = humanPlaysFirst ? 'Elige una ficha del bosque.' : 'La IA empieza esta ronda...';

  return {
    phase: humanPlaysFirst ? 'PLAYER_SELECT' : 'AI_TURN',
    round: 1,
    humanPlaysFirst,
    forestZones,
    tilePile,
    playerBoard,
    aiBoard,
    playerScore: emptyScore,
    aiScore: emptyScore,
    selectedTile: null,
    selectedZone: null,
    previewTiles: [],
    pendingTiles: [],
    selectedPendingTile: null,
    placementSnapshot: null,
    difficulty: config.difficulty,
    expansionConfig: config.expansionConfig,
    expansionState,
    aiLastMove: null,
    message: firstTurnMsg,
  };
}

/** Jugador selecciona una ficha de una zona (previsualizando colección) */
export function selectTile(state: GameState, zone: number, tile: Tile): GameState {
  const previewTiles = computeCollection(state.forestZones, zone, tile);
  return {
    ...state,
    selectedZone: zone,
    selectedTile: tile,
    previewTiles,
    message: `Zona ${zone + 1} seleccionada. ¿Confirmas la recogida?`,
  };
}

/** Jugador confirma la selección → recoge fichas, repone el bosque y pasa a elegir fila */
export function confirmSelection(state: GameState): GameState {
  if (state.selectedTile === null || state.selectedZone === null) return state;

  const ids = new Set(state.previewTiles.map(t => t.id));
  const zonesAfterCollect = removeTilesByIds(state.forestZones, ids);
  // La reposición ocurre después del movimiento, en confirmPlacement

  return {
    ...state,
    phase: 'PLAYER_PLACE',
    forestZones: zonesAfterCollect,
    selectedTile: null,
    selectedZone: null,
    previewTiles: [],
    pendingTiles: state.previewTiles,
    selectedPendingTile: null,
    placementSnapshot: { playerBoard: state.playerBoard, pendingTiles: state.previewTiles },
    message: `Recogiste ${state.previewTiles.length} ficha(s). Elige una fila de tu tablero.`,
  };
}

/** Jugador cancela la selección */
export function cancelSelection(state: GameState): GameState {
  return {
    ...state,
    selectedTile: null,
    selectedZone: null,
    previewTiles: [],
    message: 'Elige una ficha del bosque.',
  };
}

/**
 * Jugador selecciona una ficha concreta de las pendientes para colocar a continuación.
 * Si ya estaba seleccionada, la deselecciona (toggle).
 */
export function selectPendingTile(state: GameState, tile: Tile): GameState {
  if (state.selectedPendingTile?.id === tile.id) {
    return { ...state, selectedPendingTile: null };
  }
  return { ...state, selectedPendingTile: tile };
}

/**
 * Jugador coloca UNA ficha pendiente en la fila indicada.
 * Se coloca la ficha seleccionada (selectedPendingTile) o, si no hay ninguna,
 * la primera de pendingTiles.
 * La fase avanza a AI_TURN solo cuando se han colocado todas las fichas.
 */
export function placeTile(state: GameState, row: number): GameState {
  if (state.pendingTiles.length === 0) return state;
  if (availableRowSpace(state.playerBoard, row) === 0) {
    return { ...state, message: 'Esa fila está completa. Elige otra.' };
  }

  const tileToPlace = state.selectedPendingTile ?? state.pendingTiles[0];
  const newPlayerBoard = placeTilesInRow(state.playerBoard, [tileToPlace], row);
  const remaining = state.pendingTiles.filter(t => t.id !== tileToPlace.id);
  const newPlayerScore = calculateBoardScore(newPlayerBoard, state.expansionState, false);

  if (remaining.length > 0) {
    // Quedan fichas por colocar → seguimos en PLAYER_PLACE
    return {
      ...state,
      playerBoard: newPlayerBoard,
      pendingTiles: remaining,
      selectedPendingTile: null,
      playerScore: newPlayerScore,
      message: `Queda${remaining.length > 1 ? 'n' : ''} ${remaining.length} ficha${remaining.length > 1 ? 's' : ''} por colocar.`,
    };
  }

  // Todas colocadas → esperar confirmación
  return {
    ...state,
    phase: 'PLAYER_CONFIRM',
    playerBoard: newPlayerBoard,
    pendingTiles: [],
    selectedPendingTile: null,
    playerScore: newPlayerScore,
    message: '¡Todas colocadas! Confirma tu turno o deshaz la colocación.',
  };
}

/** Deshace todas las colocaciones del turno, volviendo al estado previo al reparto */
export function undoPlacement(state: GameState): GameState {
  if (!state.placementSnapshot) return state;
  return {
    ...state,
    phase: 'PLAYER_PLACE',
    playerBoard: state.placementSnapshot.playerBoard,
    pendingTiles: state.placementSnapshot.pendingTiles,
    selectedPendingTile: null,
    playerScore: calculateBoardScore(state.placementSnapshot.playerBoard, state.expansionState, false),
    message: 'Colocación deshecha. Vuelve a elegir filas.',
  };
}

/** Confirma la colocación: aplica el movimiento del bosque y avanza de fase */
export function confirmPlacement(state: GameState): GameState {
  if (state.phase !== 'PLAYER_CONFIRM') return state;

  const { zones: newForest, pile: newPile } = replenishZones(state.forestZones, state.tilePile);
  const base = {
    ...state,
    forestZones: newForest,
    tilePile: newPile,
    placementSnapshot: null,
  };

  if (!state.humanPlaysFirst) {
    if (state.round >= MAX_ROUNDS) return finalizeGame({ ...base, phase: 'GAME_END' });
    if (isForestEmpty(newForest)) return finalizeGame({ ...base, phase: 'GAME_END' });
    return { ...base, phase: 'AI_TURN', round: state.round + 1, message: 'Turno de la IA...' };
  } else {
    return { ...base, phase: 'AI_TURN', message: 'Turno de la IA...' };
  }
}

/**
 * Aplica el turno de la IA con una decisión ya tomada.
 */
export function applyAiTurn(
  state: GameState,
  decision: { zone: number; tile: Tile; row: number; rowAssignments?: number[] },
): GameState {
  const collected = computeCollection(state.forestZones, decision.zone, decision.tile);
  const ids = new Set(collected.map(t => t.id));
  const zonesAfterCollect = removeTilesByIds(state.forestZones, ids);
  const { zones: newForest, pile: newPile } = replenishZones(zonesAfterCollect, state.tilePile);

  const newAiBoard = collected.length > 0
    ? applyRowAssignments(state.aiBoard, collected, decision)
    : state.aiBoard;
  const newAiScore = calculateBoardScore(newAiBoard, state.expansionState, false);

  const base = {
    ...state,
    aiBoard: newAiBoard,
    forestZones: newForest,
    tilePile: newPile,
    aiScore: newAiScore,
    aiLastMove: { zone: decision.zone, tile: decision.tile, row: decision.row },
    selectedTile: null,
    selectedZone: null,
    previewTiles: [],
    pendingTiles: [],
  };

  if (state.humanPlaysFirst) {
    // IA juega segundo → el round termina aquí
    if (state.round >= MAX_ROUNDS) {
      return finalizeGame({ ...base, phase: 'GAME_END' });
    }
    if (isForestEmpty(newForest)) {
      return finalizeGame({ ...base, phase: 'GAME_END' });
    }
    return {
      ...base,
      phase: 'PLAYER_SELECT',
      round: state.round + 1,
      message: `Ronda ${state.round + 1}. Elige una ficha del bosque.`,
    };
  } else {
    // IA juega primero → viene el turno del humano
    if (isForestEmpty(newForest)) {
      return finalizeGame({ ...base, phase: 'GAME_END' });
    }
    return {
      ...base,
      phase: 'PLAYER_SELECT',
      message: 'Elige una ficha del bosque.',
    };
  }
}

/**
 * Recoge fichas de la IA y las coloca en su tablero, sin reponer el bosque.
 * Útil para mostrar los huecos vacíos antes del rellenado secuencial.
 */
export function applyAiCollect(
  state: GameState,
  decision: { zone: number; tile: Tile; row: number; rowAssignments?: number[] },
): GameState {
  const collected = computeCollection(state.forestZones, decision.zone, decision.tile);
  const ids = new Set(collected.map(t => t.id));
  const zonesAfterCollect = removeTilesByIds(state.forestZones, ids);
  const newAiBoard = collected.length > 0
    ? applyRowAssignments(state.aiBoard, collected, decision)
    : state.aiBoard;
  const newAiScore = calculateBoardScore(newAiBoard, state.expansionState, false);
  return {
    ...state,
    aiBoard: newAiBoard,
    forestZones: zonesAfterCollect,
    aiScore: newAiScore,
    aiLastMove: { zone: decision.zone, tile: decision.tile, row: decision.row },
    selectedTile: null,
    selectedZone: null,
    previewTiles: [],
    pendingTiles: [],
    message: 'Reponiendo el bosque...',
  };
}

/**
 * Determina la fase siguiente tras el turno de la IA, una vez el bosque
 * ya ha sido repuesto. Llamar después del rellenado secuencial.
 */
export function resolveAiTurnPhase(state: GameState): GameState {
  if (state.humanPlaysFirst) {
    if (state.round >= MAX_ROUNDS) return finalizeGame({ ...state, phase: 'GAME_END' });
    if (isForestEmpty(state.forestZones)) return finalizeGame({ ...state, phase: 'GAME_END' });
    return {
      ...state,
      phase: 'PLAYER_SELECT',
      round: state.round + 1,
      message: `Ronda ${state.round + 1}. Elige una ficha del bosque.`,
    };
  } else {
    if (isForestEmpty(state.forestZones)) return finalizeGame({ ...state, phase: 'GAME_END' });
    return {
      ...state,
      phase: 'PLAYER_SELECT',
      message: 'Elige una ficha del bosque.',
    };
  }
}

/** ¿Queda alguna fila disponible para el jugador? */
export function hasAvailableRow(state: GameState): boolean {
  return Array.from({ length: BOARD_ROWS }, (_, i) => i)
    .some(row => availableRowSpace(state.playerBoard, row) > 0);
}

// ─── Private helpers ──────────────────────────────────────────────────────────

function createEmptyBoard(): Board {
  return Array.from({ length: BOARD_ROWS }, () => Array(BOARD_COLS).fill(null) as null[]);
}

function resolveFirstPlayer(pref: FirstPlayer): boolean {
  if (pref === 'HUMAN') return true;
  if (pref === 'AI') return false;
  return Math.random() < 0.5;
}

function createExpansionState(config: GameConfig): ExpansionState {
  const extinctionTarget = config.expansionConfig.extinction
    ? pickExtinctionTarget()
    : null;

  const acrobaticTarget = config.expansionConfig.acrobatic
    ? ANIMALS[Math.floor(Math.random() * ANIMALS.length)]
    : null;

  return { extinctionTarget, acrobaticTarget };
}

function pickExtinctionTarget(): ExpansionState['extinctionTarget'] {
  const options: ExpansionState['extinctionTarget'][] = [
    ...ANIMALS.map(a => ({ kind: 'animal' as const, value: a })),
    ...COLORS.map(c => ({ kind: 'color' as const, value: c })),
  ];
  return options[Math.floor(Math.random() * options.length)];
}

/**
 * Coloca las fichas recogidas en el tablero de la IA usando rowAssignments si existen,
 * o bien todo en decision.row (comportamiento clásico de HARD/EASY).
 */
function applyRowAssignments(
  board: Board,
  collected: Tile[],
  decision: { row: number; rowAssignments?: number[] },
): Board {
  const assignments = decision.rowAssignments;
  if (assignments && assignments.length === collected.length) {
    let current = board;
    for (let i = 0; i < collected.length; i++) {
      const row = assignments[i];
      if (row >= 0) {
        current = placeTilesInRow(current, [collected[i]], row);
      }
    }
    return current;
  }
  return placeTilesInRow(board, collected, decision.row);
}

export function finalizeGame(state: GameState): GameState {
  const [playerExtBonus, aiExtBonus] = calculateExtinctionBonuses(
    state.playerBoard,
    state.aiBoard,
    state.expansionState,
  );

  const playerFinalScore = calculateBoardScore(state.playerBoard, state.expansionState, true);
  const aiFinalScore = calculateBoardScore(state.aiBoard, state.expansionState, true);

  const playerTotal = playerFinalScore.subtotal + playerFinalScore.acrobaticBonus + playerExtBonus;
  const aiTotal = aiFinalScore.subtotal + aiFinalScore.acrobaticBonus + aiExtBonus;

  const message = playerTotal > aiTotal
    ? '¡Ganaste! 🎉'
    : playerTotal < aiTotal
      ? 'La IA ganó esta vez.'
      : '¡Empate!';

  return {
    ...state,
    phase: 'GAME_END',
    playerScore: { ...playerFinalScore, extinctionBonus: playerExtBonus, total: playerTotal },
    aiScore: { ...aiFinalScore, extinctionBonus: aiExtBonus, total: aiTotal },
    message,
  };
}
