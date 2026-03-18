import type { GameState } from '../engine/types';

const SAVE_KEY = 'cocolomo-save';

export function saveGame(state: GameState): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage errors (e.g. private mode quota)
  }
}

export function loadGame(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const state = JSON.parse(raw) as GameState;
    // Only restore active games
    if (state.phase === 'GAME_END') {
      clearGame();
      return null;
    }
    // Clean up transient AI animation state so runAiTurn starts fresh
    if (state.phase === 'AI_TURN') {
      return { ...state, selectedTile: null, selectedZone: null, previewTiles: [] };
    }
    return state;
  } catch {
    return null;
  }
}

export function clearGame(): void {
  localStorage.removeItem(SAVE_KEY);
}

export function hasSavedGame(): boolean {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const state = JSON.parse(raw) as GameState;
    return state.phase !== 'GAME_END';
  } catch {
    return false;
  }
}
