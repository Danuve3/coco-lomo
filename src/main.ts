import './style.css';
import type { GameConfig, GameState } from './engine/types';
import { StartScreen } from './components/screens/StartScreen';
import { GameScreen } from './components/screens/GameScreen';
import { RulesScreen } from './components/screens/RulesScreen';
import { ResultScreen } from './components/screens/ResultScreen';
import { StatsScreen } from './components/screens/StatsScreen';
import { initTheme } from './utils/theme';
import { saveGameResult } from './utils/stats';
import { loadGame, clearGame } from './utils/gamePersistence';

type Screen = 'start' | 'game' | 'rules' | 'result' | 'stats';

initTheme();

class App {
  private appEl: HTMLElement;
  private activeGameScreen: GameScreen | null = null;
  private lastConfig: GameConfig | null = null;

  // Screen containers
  private startEl!: HTMLElement;
  private gameEl!: HTMLElement;
  private rulesEl!: HTMLElement;
  private resultEl!: HTMLElement;
  private statsEl!: HTMLElement;

  constructor(root: HTMLElement) {
    this.appEl = root;
    this.buildContainers();
    this.showScreen('start');
  }

  private buildContainers(): void {
    this.appEl.innerHTML = `
      <div id="screen-start" class="screen"></div>
      <div id="screen-game" class="screen"></div>
      <div id="screen-rules" class="screen"></div>
      <div id="screen-result" class="screen"></div>
      <div id="screen-stats" class="screen"></div>
    `;

    this.startEl = document.getElementById('screen-start')!;
    this.gameEl = document.getElementById('screen-game')!;
    this.rulesEl = document.getElementById('screen-rules')!;
    this.resultEl = document.getElementById('screen-result')!;
    this.statsEl = document.getElementById('screen-stats')!;

    // Navegación global desde eventos custom
    this.appEl.addEventListener('nav:rules', () => this.showScreen('rules'));

    this.renderStart();
  }

  private showScreen(screen: Screen): void {
    [this.startEl, this.gameEl, this.rulesEl, this.resultEl, this.statsEl].forEach(el =>
      el.classList.remove('screen--active'),
    );

    const map: Record<Screen, HTMLElement> = {
      start: this.startEl,
      game: this.gameEl,
      rules: this.rulesEl,
      result: this.resultEl,
      stats: this.statsEl,
    };
    map[screen].classList.add('screen--active');
  }

  private renderStart(): void {
    const savedState = loadGame();
    const startScreen = new StartScreen(
      this.startEl,
      (config: GameConfig) => {
        clearGame();
        this.lastConfig = config;
        this.startGame(config);
      },
      () => this.showStats(),
      savedState ? () => this.resumeGame(savedState) : null,
    );
    startScreen.render();

    const rulesScreen = new RulesScreen(this.rulesEl, () => this.showScreen('start'));
    rulesScreen.render();
  }

  private resumeGame(savedState: ReturnType<typeof loadGame>): void {
    if (!savedState) return;
    this.activeGameScreen?.unmount();
    this.activeGameScreen = new GameScreen(
      this.gameEl,
      savedState,
      (finalState: GameState) => { this.showResult(finalState); },
      () => { this.showRulesFromGame(); },
    );
    this.activeGameScreen.mount();
    this.showScreen('game');
  }

  private showStats(): void {
    const statsScreen = new StatsScreen(this.statsEl, () => {
      this.showScreen('start');
    });
    statsScreen.render();
    this.showScreen('stats');
  }

  private startGame(config: GameConfig): void {
    this.activeGameScreen?.unmount();
    this.activeGameScreen = new GameScreen(
      this.gameEl,
      config,
      (finalState: GameState) => { this.showResult(finalState); },
      () => { this.showRulesFromGame(); },
    );
    this.activeGameScreen.mount();
    this.showScreen('game');
  }

  private showRulesFromGame(): void {
    const rulesScreen = new RulesScreen(this.rulesEl, () => {
      this.showScreen('game');
    });
    rulesScreen.render();
    this.showScreen('rules');
  }

  private showResult(state: GameState): void {
    saveGameResult(state);

    const resultScreen = new ResultScreen(
      this.resultEl,
      () => {
        // Jugar de nuevo con misma config
        if (this.lastConfig) this.startGame(this.lastConfig);
        else this.goHome();
      },
      () => this.goHome(),
    );
    resultScreen.render(state);
    this.showScreen('result');
  }

  private goHome(): void {
    this.activeGameScreen?.unmount();
    this.activeGameScreen = null;
    this.renderStart();
    this.showScreen('start');
  }
}

const appEl = document.getElementById('app');
if (!appEl) throw new Error('No se encontró #app en el DOM.');
new App(appEl);
