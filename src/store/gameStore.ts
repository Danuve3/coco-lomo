import type { GameState, GameConfig, Tile } from '../engine/types';
import {
  createInitialState,
  selectTile,
  confirmSelection,
  cancelSelection,
  selectPendingTile,
  placeTile,
  undoPlacement,
  confirmPlacement as engineConfirmPlacement,
  applyAiCollect,
  resolveAiTurnPhase,
  finalizeGame,
} from '../engine/game';
import { evaluateAi } from '../engine/ai';
import { isForestEmpty, computeCollection, replenishOneSlot } from '../engine/forest';
import { saveGame, clearGame } from '../utils/gamePersistence';
import { audioManager } from '../utils/audio';
import { showAiThinking } from '../utils/aiThinking';

type Listener = (state: GameState) => void;

const AI_SELECT_DELAY = 1400;
const REPLENISH_SLOT_DELAY = 560;     // ms entre fichas (igual para jugador e IA)
const PRE_AI_DELAY = 500;             // pausa tras rellenado antes del turno IA

export class GameStore {
  private _state: GameState;
  private _listeners = new Set<Listener>();

  constructor(source: GameConfig | GameState) {
    this._state = 'phase' in source ? source : createInitialState(source);
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
    if (newState.phase === 'GAME_END') {
      clearGame();
      audioManager.playSfx(`${import.meta.env.BASE_URL}sounds/fx/finish.mp3`);
    } else {
      saveGame(newState);
    }
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
    audioManager.playSfx(`${import.meta.env.BASE_URL}sounds/fx/confirm-pickup.mp3`, 0.6);
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
    audioManager.playSfx(`${import.meta.env.BASE_URL}sounds/fx/place-tile.mp3`);
    // La fase avanza a PLAYER_CONFIRM, no AI_TURN directamente
  }

  undoPlacement(): void {
    if (this._state.phase !== 'PLAYER_PLACE' && this._state.phase !== 'PLAYER_CONFIRM') return;
    this.setState(undoPlacement(this._state));
  }

  async confirmPlacement(): Promise<void> {
    if (this._state.phase !== 'PLAYER_CONFIRM') return;

    // Si la partida termina en este momento (ej. última ronda con IA primero),
    // aplicar el estado final directamente sin animación de relleno.
    const finalState = engineConfirmPlacement(this._state);
    if (finalState.phase === 'GAME_END') {
      this.setState(finalState);
      return;
    }

    // Mostrar estado intermedio: huecos vacíos en el bosque, fase AI_TURN
    this.setState({
      ...this._state,
      placementSnapshot: null,
      phase: 'AI_TURN',
      round: finalState.round,
      message: 'Reponiendo el bosque...',
    });

    // Rellenar el bosque una ficha a la vez
    while (true) {
      const { forestZones, tilePile } = this._state;
      const result = replenishOneSlot(forestZones, tilePile);
      if (result.zones === forestZones) break; // sin más huecos ni fichas
      this.setState({ ...this._state, forestZones: result.zones, tilePile: result.pile });
      audioManager.playSfx(`${import.meta.env.BASE_URL}sounds/fx/replenish.mp3`);
      await delay(REPLENISH_SLOT_DELAY);
    }

    // Pausa antes de que la IA empiece
    await delay(PRE_AI_DELAY);
    void this.runAiTurn();
  }

  newGame(config: GameConfig): void {
    clearGame();
    this.setState(createInitialState(config));
  }

  // ─── Turno IA (asíncrono, con animaciones) ────────────────────────────────

  async runAiTurn(): Promise<void> {
    audioManager.playSfx(`${import.meta.env.BASE_URL}sounds/fx/turn-change.mp3`);

    if (isForestEmpty(this._state.forestZones)) {
      this.setState(finalizeGame({ ...this._state, phase: 'GAME_END' }));
      return;
    }

    const hideThinking = showAiThinking();
    // Esperar 2 frames para que el browser pinte el indicador antes de bloquear con minimax
    await new Promise<void>(resolve => requestAnimationFrame(() => { requestAnimationFrame(() => resolve()); }));
    const decision = evaluateAi(this._state);
    hideThinking();

    if (!decision) {
      this.setState(finalizeGame({ ...this._state, phase: 'GAME_END' }));
      return;
    }

    // 1. Mostrar zona y ficha elegidas por la IA
    const previewTiles = computeCollection(this._state.forestZones, decision.zone, decision.tile);
    audioManager.playSfx(`${import.meta.env.BASE_URL}sounds/fx/pick.mp3`);
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

    // 2. Aplicar recogida sin reponer (muestra huecos vacíos + ficha en tablero IA)
    this.setState(applyAiCollect(this._state, decision));

    // 3. Rellenar el bosque una ficha a la vez
    while (true) {
      const { forestZones, tilePile } = this._state;
      const result = replenishOneSlot(forestZones, tilePile);
      if (result.zones === forestZones) break;
      this.setState({ ...this._state, forestZones: result.zones, tilePile: result.pile });
      audioManager.playSfx(`${import.meta.env.BASE_URL}sounds/fx/replenish.mp3`);
      await delay(REPLENISH_SLOT_DELAY);
    }

    // 4. Determinar fase siguiente y transicionar
    const nextState = resolveAiTurnPhase(this._state);
    if (nextState.phase === 'PLAYER_SELECT') {
      audioManager.playSfx(`${import.meta.env.BASE_URL}sounds/fx/turn-change.mp3`);
    }
    this.setState(nextState);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
