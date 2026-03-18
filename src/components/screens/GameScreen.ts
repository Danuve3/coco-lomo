import type { GameState, GameConfig, Tile } from '../../engine/types';
import { GameStore } from '../../store/gameStore';
import { ForestBoard } from '../ForestBoard';
import { PlayerBoard } from '../PlayerBoard';
import { ScorePanel } from '../ScorePanel';
import { toggleTheme, getTheme, themeIcon } from '../../utils/theme';

export class GameScreen {
  private el: HTMLElement;
  private store: GameStore;
  private forestBoard!: ForestBoard;
  private playerBoard!: PlayerBoard;
  private aiBoard!: PlayerBoard;
  private scorePanel!: ScorePanel;
  private unsubscribe?: () => void;
  private onGameEnd: (state: GameState) => void;
  private onRules: () => void;

  constructor(
    container: HTMLElement,
    source: GameConfig | GameState,
    onGameEnd: (state: GameState) => void,
    onRules: () => void,
  ) {
    this.el = container;
    this.store = new GameStore(source);
    this.onGameEnd = onGameEnd;
    this.onRules = onRules;
  }

  mount(): void {
    this.buildLayout();
    this.unsubscribe = this.store.subscribe(state => this.update(state));
    this.update(this.store.state);
    // Si la IA arranca primero, lanzar su turno tras el primer render
    this.store.start();
  }

  unmount(): void {
    this.unsubscribe?.();
    this.el.innerHTML = '';
  }

  private buildLayout(): void {
    this.el.innerHTML = `
      <div class="game-screen">
        <header class="game-header">
          <span class="game-header__logo">🌲 Coco Lomo</span>
          <nav class="game-header__nav">
            <button class="theme-toggle theme-toggle--sm" id="btn-theme-game" title="Cambiar tema" aria-label="Cambiar tema">${themeIcon(getTheme())}</button>
            <button class="btn btn--ghost btn--xs" id="btn-rules-ingame" title="Ver reglas">?</button>
          </nav>
        </header>

        <div class="game-body">
          <aside class="game-sidebar" id="score-panel-container"></aside>

          <main class="game-main">
            <div id="forest-container" class="game-forest"></div>
            <div class="game-boards">
              <div id="player-board-container"></div>
              <div id="ai-board-container"></div>
            </div>
          </main>
        </div>
      </div>
    `;

    const forestEl = this.el.querySelector<HTMLElement>('#forest-container')!;
    const playerEl = this.el.querySelector<HTMLElement>('#player-board-container')!;
    const aiEl = this.el.querySelector<HTMLElement>('#ai-board-container')!;
    const scorePanelEl = this.el.querySelector<HTMLElement>('#score-panel-container')!;

    this.forestBoard = new ForestBoard(forestEl, (zone: number, tile: Tile) => {
      this.store.selectTile(zone, tile);
    });

    this.playerBoard = new PlayerBoard(
      playerEl,
      (row: number) => { this.store.placeTile(row); },
      false,
      (tile: Tile) => { this.store.selectPendingTile(tile); },
      () => { this.store.undoPlacement(); },
      () => { this.store.confirmPlacement(); },
    );

    this.aiBoard = new PlayerBoard(aiEl, () => {}, true);

    this.scorePanel = new ScorePanel(scorePanelEl);

    forestEl.addEventListener('forest:confirm', () => this.store.confirmSelection());
    forestEl.addEventListener('forest:cancel', () => this.store.cancelSelection());

    this.el.querySelector('#btn-rules-ingame')?.addEventListener('click', () => this.onRules());

    const themeBtn = this.el.querySelector<HTMLButtonElement>('#btn-theme-game');
    themeBtn?.addEventListener('click', () => {
      const next = toggleTheme();
      if (themeBtn) themeBtn.textContent = themeIcon(next);
    });
  }

  private update(state: GameState): void {
    if (state.phase === 'GAME_END') {
      this.onGameEnd(state);
      return;
    }

    this.forestBoard.render(state);
    this.playerBoard.render(state);
    this.aiBoard.render(state);
    this.scorePanel.render(state);
  }
}
