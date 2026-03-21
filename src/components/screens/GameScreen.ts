import type { GameState, GameConfig, Tile } from '../../engine/types';
import { GameStore } from '../../store/gameStore';
import { ForestBoard } from '../ForestBoard';
import { PlayerBoard } from '../PlayerBoard';
import { ScorePanel } from '../ScorePanel';
import { toggleTheme, getTheme, themeIcon } from '../../utils/theme';
import { TILE_THEMES, getTileThemeId, setTileThemeId, getAnimalImageUrl } from '../../utils/tileTheme';
import type { TileThemeId } from '../../utils/tileTheme';
import { MAX_ROUNDS } from '../../engine/constants';

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
  private _lastRoundAnnounced = 0;

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
    // Esperar a que desaparezca el anuncio antes de arrancar la partida
    this.showTurnAnnouncement(this.store.state.humanPlaysFirst).then(() => {
      this.store.start();
    });
  }

  unmount(): void {
    this.unsubscribe?.();
    this.el.innerHTML = '';
  }

  private tileThemeDropdownHTML(): string {
    const current = getTileThemeId();
    return TILE_THEMES.map(theme => {
      const active = theme.id === current ? 'tile-theme-btn--active' : '';
      const imgUrl = theme.hasImages ? getAnimalImageUrl(theme.id, 'RABBIT', 'RED') : null;
      const preview = imgUrl
        ? `<img src="${imgUrl}" alt="${theme.name}" />`
        : `🐇`;
      return `
        <button class="tile-theme-btn ${active}" data-tile-theme="${theme.id}" role="radio" aria-checked="${theme.id === current}">
          <div class="tile-theme-preview">${preview}</div>
          <span>${theme.name}</span>
        </button>
      `;
    }).join('');
  }

  private buildLayout(): void {
    this.el.innerHTML = `
      <div class="game-screen">
        <header class="game-header">
          <span class="game-header__logo">🌲 Coco Lomo</span>
          <nav class="game-header__nav">
            <div class="tile-theme-picker">
              <button class="theme-toggle theme-toggle--sm" id="btn-tile-theme" title="Tema de fichas" aria-label="Tema de fichas">🎨</button>
              <div class="tile-theme-dropdown hidden" id="tile-theme-dropdown">
                ${this.tileThemeDropdownHTML()}
              </div>
            </div>
            <button class="theme-toggle theme-toggle--sm" id="btn-theme-game" title="Cambiar tema" aria-label="Cambiar tema">${themeIcon(getTheme())}</button>
            <button class="btn btn--ghost btn--xs" id="btn-rules-ingame" title="Ver reglas">?</button>
          </nav>
        </header>

        <div class="game-info-bar" id="score-panel-container"></div>

        <div class="game-body">
          <main class="game-main">
            <div id="forest-container" class="game-forest"></div>
            <div class="game-boards">
              <div id="player-board-container"></div>
              <div id="ai-board-container"></div>
            </div>
            <div id="game-info-bottom" class="game-info-bottom"></div>
          </main>
        </div>
      </div>
    `;

    const forestEl = this.el.querySelector<HTMLElement>('#forest-container')!;
    const playerEl = this.el.querySelector<HTMLElement>('#player-board-container')!;
    const aiEl = this.el.querySelector<HTMLElement>('#ai-board-container')!;
    const scorePanelEl = this.el.querySelector<HTMLElement>('#score-panel-container')!;
    const gameInfoBottomEl = this.el.querySelector<HTMLElement>('#game-info-bottom')!;

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

    this.scorePanel = new ScorePanel(scorePanelEl, gameInfoBottomEl);

    forestEl.addEventListener('forest:confirm', () => this.collectWithAnimation(forestEl));
    forestEl.addEventListener('forest:cancel', () => this.store.cancelSelection());

    this.el.querySelector('#btn-rules-ingame')?.addEventListener('click', () => this.onRules());

    const themeBtn = this.el.querySelector<HTMLButtonElement>('#btn-theme-game');
    themeBtn?.addEventListener('click', () => {
      const next = toggleTheme();
      if (themeBtn) themeBtn.textContent = themeIcon(next);
    });

    // Tile theme picker
    const tileThemeBtn = this.el.querySelector<HTMLButtonElement>('#btn-tile-theme');
    const tileThemeDropdown = this.el.querySelector<HTMLElement>('#tile-theme-dropdown');

    tileThemeBtn?.addEventListener('click', e => {
      e.stopPropagation();
      tileThemeDropdown?.classList.toggle('hidden');
    });

    tileThemeDropdown?.querySelectorAll<HTMLButtonElement>('[data-tile-theme]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset['tileTheme'] as TileThemeId;
        setTileThemeId(id);
        tileThemeDropdown.querySelectorAll('[data-tile-theme]').forEach(b => {
          b.classList.remove('tile-theme-btn--active');
          b.setAttribute('aria-checked', 'false');
        });
        btn.classList.add('tile-theme-btn--active');
        btn.setAttribute('aria-checked', 'true');
        tileThemeDropdown.classList.add('hidden');
        const state = this.store.state;
        this.forestBoard.render(state);
        this.playerBoard.render(state);
        this.aiBoard.render(state);
      });
    });

    document.addEventListener('click', () => tileThemeDropdown?.classList.add('hidden'));
  }

  private update(state: GameState): void {
    if (state.phase === 'GAME_END') {
      this.forestBoard.render(state);
      this.playerBoard.render(state);
      this.aiBoard.render(state);
      this.scorePanel.render(state);
      this.showEndBanner(state);
      return;
    }

    if (
      state.round === MAX_ROUNDS &&
      this._lastRoundAnnounced < MAX_ROUNDS &&
      (state.phase === 'PLAYER_SELECT' || state.phase === 'AI_TURN')
    ) {
      this._lastRoundAnnounced = MAX_ROUNDS;
      this.showLastRoundAnnouncement();
    }

    this.forestBoard.render(state);
    this.playerBoard.render(state);
    this.aiBoard.render(state);
    this.scorePanel.render(state);
  }

  private collectWithAnimation(forestEl: HTMLElement): void {
    const DURATION = 380;
    const STAGGER = 60;

    // 1. Capturar antes del re-render
    const selectedEls = Array.from(forestEl.querySelectorAll<HTMLElement>('.tile--selected'));
    const sourceData = selectedEls.map(el => ({
      rect: el.getBoundingClientRect(),
      html: el.outerHTML,
    }));

    // 2. Actualizar estado (re-render síncrono)
    this.store.confirmSelection();

    if (sourceData.length === 0) return;

    // 3. Obtener targets y mostrar placeholders mientras vuelan los clones
    const targetEls = Array.from(
      this.el.querySelectorAll<HTMLElement>('#player-board-container .pending-tile'),
    );
    targetEls.forEach(el => el.classList.add('pending-tile--arriving'));

    // 4. Animar un clon por ficha con escalonado
    sourceData.forEach(({ rect: src, html }, i) => {
      const targetEl = targetEls[i];
      if (!targetEl) return;
      const dst = targetEl.getBoundingClientRect();

      const dx = dst.left - src.left;
      const dy = dst.top - src.top;
      const sx = dst.width / src.width;
      const sy = dst.height / src.height;

      // Revelar ficha real cuando el clon aterriza
      setTimeout(() => {
        targetEl.classList.remove('pending-tile--arriving');
        targetEl.classList.add('pending-tile--landing');
        setTimeout(() => targetEl.classList.remove('pending-tile--landing'), 300);
      }, i * STAGGER + DURATION);

      setTimeout(() => {
        const fly = document.createElement('div');
        fly.style.cssText = `position:fixed;left:${src.left}px;top:${src.top}px;`
          + `width:${src.width}px;height:${src.height}px;`
          + `z-index:500;pointer-events:none;transform-origin:top left;`;
        fly.innerHTML = html;

        const inner = fly.firstElementChild as HTMLElement | null;
        if (inner) {
          inner.classList.remove('tile--selected', 'tile--zone-dimmed');
          inner.style.width = '100%';
          inner.style.height = '100%';
          inner.style.margin = '0';
        }

        document.body.appendChild(fly);

        requestAnimationFrame(() => requestAnimationFrame(() => {
          fly.style.transition = `transform ${DURATION}ms cubic-bezier(0.4,0,0.2,1),`
            + ` opacity 160ms ease ${DURATION - 80}ms`;
          fly.style.transform = `translate(${dx}px,${dy}px) scale(${sx},${sy})`;
          fly.style.opacity = '0';
          setTimeout(() => fly.remove(), DURATION + 200);
        }));
      }, i * STAGGER);
    });
  }

  private showLastRoundAnnouncement(): void {
    const overlay = document.createElement('div');
    overlay.className = 'turn-announcement';
    overlay.innerHTML = `
      <div class="turn-announcement__pill">
        <span class="turn-announcement__icon">⚡</span>
        <span class="turn-announcement__text">¡Última ronda!</span>
      </div>
    `;
    document.body.appendChild(overlay);
    setTimeout(() => overlay.remove(), 2700);
  }

  private showTurnAnnouncement(humanFirst: boolean): Promise<void> {
    const text = humanFirst ? '¡Empiezas tú!' : 'Empieza la IA';
    const icon = humanFirst ? '🧑' : '🤖';

    const overlay = document.createElement('div');
    overlay.className = 'turn-announcement';
    overlay.innerHTML = `
      <div class="turn-announcement__pill">
        <span class="turn-announcement__icon">${icon}</span>
        <span class="turn-announcement__text">${text}</span>
      </div>
    `;

    document.body.appendChild(overlay);
    return new Promise(resolve => {
      setTimeout(() => { overlay.remove(); resolve(); }, 2700);
    });
  }

  private showEndBanner(state: GameState): void {
    if (this.el.querySelector('.game-end-banner')) return;

    const { playerScore, aiScore } = state;
    const playerWins = playerScore.total > aiScore.total;
    const tie = playerScore.total === aiScore.total;

    const icon  = playerWins ? '🏆' : tie ? '🤝' : '😤';
    const title = playerWins ? '¡Ganaste!' : tie ? '¡Empate!' : 'La IA ganó';
    const mod   = playerWins ? 'banner--win' : tie ? 'banner--tie' : 'banner--loss';

    const banner = document.createElement('div');
    banner.className = `game-end-banner ${mod}`;
    banner.innerHTML = `
      <div class="game-end-banner__inner">
        <span class="game-end-banner__icon">${icon}</span>
        <span class="game-end-banner__title">${title}</span>
        <button class="btn btn--primary btn--sm" id="btn-see-results">Ver puntuación final →</button>
      </div>
    `;

    const gameScreen = this.el.querySelector<HTMLElement>('.game-screen');
    gameScreen?.appendChild(banner);

    banner.querySelector('#btn-see-results')?.addEventListener('click', () => {
      this.onGameEnd(state);
    });
  }
}
