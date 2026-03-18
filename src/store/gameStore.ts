import type { GameState, GameConfig, Tile } from '../engine/types';
import {
  createInitialState,
  selectTile,
  confirmSelection,
  cancelSelection,
  selectPendingTile,
  placeTile,
  undoPlacement,
  confirmPlacement,
  applyAiTurn,
  finalizeGame,
} from '../engine/game';
import { evaluateAi } from '../engine/ai';
import { isForestEmpty, computeCollection } from '../engine/forest';

type Listener = (state: GameState) => void;

const AI_SELECT_DELAY = 700;
const AI_PLACE_DELAY = 900;

export class GameStore {
  private _state: GameState;
  private _listeners = new Set<Listener>();

  constructor(config: GameConfig) {
    this._state = createInitialState(config);
  }

  get state(): GameState {
    return this._state;
  }

  subscribe(fn: Listener): () => void {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  }

  private setState(newState: GameState): void {
    this._state = newState;
    this._listeners.forEach(fn => fn(this._state));
  }

  /**
   * Llamar después de suscribirse al store.
   * Si la IA juega primero, arranca su turno.
   */
  start(): void {
    if (this._state.phase === 'AI_TURN') {
      void this.runAiTurn();
    }
  }

  // ─── Acciones del jugador ──────────────────────────────────────────────────

  selectTile(zone: number, tile: Tile): void {
    if (this._state.phase !== 'PLAYER_SELECT') return;
    this.setState(selectTile(this._state, zone, tile));
  }

  confirmSelection(): void {
    if (this._state.phase !== 'PLAYER_SELECT') return;
    this.setState(confirmSelection(this._state));
  }

  cancelSelection(): void {
    if (this._state.phase !== 'PLAYER_SELECT') return;
    this.setState(cancelSelection(this._state));
  }

  selectPendingTile(tile: Tile): void {
    if (this._state.phase !== 'PLAYER_PLACE') return;
    this.setState(selectPendingTile(this._state, tile));
  }

  placeTile(row: number): void {
    if (this._state.phase !== 'PLAYER_PLACE') return;
    this.setState(placeTile(this._state, row));
    // La fase avanza a PLAYER_CONFIRM, no AI_TURN directamente
  }

  undoPlacement(): void {
    if (this._state.phase !== 'PLAYER_PLACE' && this._state.phase !== 'PLAYER_CONFIRM') return;
    this.setState(undoPlacement(this._state));
  }

  confirmPlacement(): void {
    if (this._state.phase !== 'PLAYER_CONFIRM') return;
    const next = confirmPlacement(this._state);
    this.setState(next);
    if (next.phase === 'AI_TURN') {
      void this.runAiTurn();
    }
  }

  newGame(config: GameConfig): void {
    this.setState(createInitialState(config));
  }

  // ─── Turno IA (asíncrono, con animaciones) ────────────────────────────────

  async runAiTurn(): Promise<void> {
    // Si el bosque está vacío, fin de partida
    if (isForestEmpty(this._state.forestZones)) {
      this.setState(finalizeGame({ ...this._state, phase: 'GAME_END' }));
      return;
    }

    const decision = evaluateAi(this._state);

    if (!decision) {
      // No hay jugada posible (bosque vacío o tablero IA lleno)
      this.setState(finalizeGame({ ...this._state, phase: 'GAME_END' }));
      return;
    }

    // 1. Mostrar zona y ficha elegidas por la IA
    const previewTiles = computeCollection(this._state.forestZones, decision.zone, decision.tile);
    this.setState({
      ...this._state,
      phase: 'AI_TURN',
      selectedTile: decision.tile,
      selectedZone: decision.zone,
      previewTiles,
      aiLastMove: { zone: decision.zone, tile: decision.tile, row: decision.row },
      message: `La IA recoge de la Zona ${decision.zone + 1}...`,
    });

    await delay(AI_SELECT_DELAY);

    // 2. Aplicar el turno y transicionar
    const afterAi = applyAiTurn(this._state, decision);
    this.setState(afterAi);

    if (afterAi.phase === 'AI_TURN') {
      // Caso edge: sigue siendo AI_TURN (no debería pasar en flujo normal)
      await delay(AI_PLACE_DELAY);
      this.setState({ ...afterAi, phase: 'PLAYER_SELECT' });
    }
  }
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
