import type { GameConfig, Difficulty, FirstPlayer } from '../../engine/types';
import { toggleTheme, getTheme, themeIcon } from '../../utils/theme';
import { loadGame, clearGame } from '../../utils/gamePersistence';
import { TILE_THEMES, getTileThemeId, setTileThemeId, getAnimalImageUrl } from '../../utils/tileTheme';
import type { TileThemeId } from '../../utils/tileTheme';

export class StartScreen {
  private el: HTMLElement;
  private onStart: (config: GameConfig) => void;
  private onStats: () => void;

  private selectedDifficulty: Difficulty = 'EXTREME';
  private selectedFirstPlayer: FirstPlayer = 'RANDOM';
  private extinctionEnabled = true;
  private acrobaticEnabled = true;
  private onResume: (() => void) | null;

  constructor(
    container: HTMLElement,
    onStart: (config: GameConfig) => void,
    onStats: () => void,
    onResume: (() => void) | null = null,
  ) {
    this.el = container;
    this.onStart = onStart;
    this.onStats = onStats;
    this.onResume = onResume;
  }

  private tileThemeButtonsHTML(): string {
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

  private resumeBannerHTML(): string {
    if (!this.onResume) return '';
    const saved = loadGame();
    if (!saved) return '';

    const diffLabel = saved.difficulty === 'EASY' ? 'Fácil' : saved.difficulty === 'HARD' ? 'Difícil' : 'Extremo';
    const phaseLabel =
      saved.phase === 'PLAYER_SELECT' ? 'Eligiendo ficha' :
      saved.phase === 'PLAYER_PLACE' || saved.phase === 'PLAYER_CONFIRM' ? 'Colocando fichas' :
      'Turno de la IA';

    return `
      <div class="resume-banner" id="resume-banner">
        <div class="resume-banner__info">
          <span class="resume-banner__title">▶ Partida guardada</span>
          <span class="resume-banner__meta">Ronda ${saved.round} · ${diffLabel} · ${phaseLabel}</span>
        </div>
        <div class="resume-banner__actions">
          <button class="btn btn--primary btn--sm" id="btn-resume">Continuar</button>
          <button class="btn btn--ghost btn--sm" id="btn-discard-save">Descartar</button>
        </div>
      </div>
    `;
  }

  private static readonly TITLES = [
    'Coco Lomo', 'Moco Loco', 'Lomo Coco', 'Molo Como', 'Como Lomo', 'Lolo Como', 'Molo Como',
  ];

  private static readonly SUBTITLES = [
    'La IA no tiene sentimientos. Tú sí. Mala suerte.',
    'Coloca fichas. Sufre. Repite.',
    'Tu turno. La IA ya lo vio.',
    'El bosque más injusto del mundo digital.',
    'Haz tu mejor jugada. La IA hará una mejor.',
    'Un juego de mesa sin mesa y sin amigos.',
    'Fichas, árboles y decepciones.',
    'Para cuando el ajedrez se te daba demasiado bien.',
    'La extinción empezó contigo.',
    'Modo Extremo: para masoquistas con estilo.',
    'El conejito te mira. Sabe lo que hiciste.',
    'La IA lleva ganando desde que la encendiste.',
    'No es suerte. Es que juegas mal.',
    'El oso tampoco te respeta.',
    'Cada ficha mal puesta es una decisión de vida.',
    'Spoiler: la IA ya ganó, solo está siendo educada.',
    'Perfectamente equilibrado. Para la IA.',
    'Tus amigos jugarían mejor. Pero no están aquí.',
    'La naturaleza es cruel. La IA también.',
    'Cinco animales, un bosque, cero compasión.',
    'Designed to frustrate. Polished to perfection.',
    'El leopardo sabe exactamente lo que hiciste en la ronda 3.',
    'La IA no descansa. Tú sí. Ahí está el problema.',
    'Estrategia, táctica y autoengaño.',
    'Cada vez que pierdes, el pato sonríe.',
    'Tu mejor jugada tiene nombre: suerte.',
    'La IA calcula. Tú sufres. Funciona.',
    'Esta ronda va a ser distinta, te lo juro.',
    'En algún universo paralelo ganaste. No en este.',
    'El águila te juzga desde la fila 1.',
    'Bonificación de color: para gente con fe.',
    'La IA no te odia. Simplemente no le importas.',
    'Hay jugadores con racha positiva. Tú no eres uno de ellos.',
    'El bosque tiene memoria. Y tú no.',
    'Modo fácil disponible. Para los valientes.',
    'Otra partida, las mismas decisiones cuestionables.',
    'La IA aprendió de tus errores. Tú aún no.',
    'El conejo lleva más puntos que tú en la fila 4.',
    'Empezar primero no es ventaja si eres tú.',
    'Tu tablero parece un accidente de tráfico.',
    'Juego de estrategia profunda. Tú ve a lo tuyo.',
    'Extinción: porque el mundo necesita menos de algo. Quizás fichas tuyas.',
    'Nadie te dijo que sería fácil. Bueno, el botón de "Fácil" sí.',
    'La IA tiene una opinión muy formada sobre tu fila 5.',
    'Aquí el azar no existe. Solo tus malas decisiones.',
    'Récord personal: 3 derrotas seguidas. Puedes superarlo.',
    'El bosque no discrimina. Pierde todo el mundo por igual.',
    'Optimista incorregible. Eso te honra y te hunde.',
    'Si fallas, siempre puedes culpar al algoritmo.',
    'Nueva partida. Misma esperanza. Distinto resultado.',
  ];

  private static pick<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  render(): void {
    const theme = getTheme();
    const title = StartScreen.pick(StartScreen.TITLES);
    const subtitle = StartScreen.pick(StartScreen.SUBTITLES);
    this.el.innerHTML = `
      <div class="start-screen">
        <div class="start-screen__topbar">
          <div class="start-screen__topbar-left">
            <button class="theme-toggle" id="btn-theme" title="Cambiar tema" aria-label="Cambiar tema">${themeIcon(theme)}</button>
            <div class="tile-theme-picker">
              <button class="theme-toggle" id="btn-tile-theme-start" title="Tema de fichas" aria-label="Tema de fichas">🎨</button>
              <div class="tile-theme-dropdown hidden" id="tile-theme-dropdown-start">
                ${this.tileThemeButtonsHTML()}
              </div>
            </div>
          </div>
          <button class="btn btn--ghost btn--sm" id="btn-stats-nav">📊 Estadísticas</button>
        </div>

        ${this.resumeBannerHTML()}

        <div class="start-screen__hero">
          <div class="start-logo">
            <span class="start-logo__forest">🌲</span>
            <h1 class="start-logo__title">${title}</h1>
            <p class="start-logo__subtitle">${subtitle}</p>
          </div>
        </div>

        <div class="start-screen__config">
          <section class="config-section">
            <h2 class="config-section__title">Quién empieza</h2>
            <div class="toggle-group toggle-group--3" role="radiogroup" aria-label="Primer turno">
              <button class="toggle-btn" data-first="HUMAN" role="radio" aria-checked="false">
                🧑 Usuario
                <span class="toggle-btn__desc">Tú mueves primero.</span>
              </button>
              <button class="toggle-btn" data-first="AI" role="radio" aria-checked="false">
                🤖 CPU
                <span class="toggle-btn__desc">La IA mueve primero.</span>
              </button>
              <button class="toggle-btn toggle-btn--active" data-first="RANDOM" role="radio" aria-checked="true">
                🎲 Aleatorio
                <span class="toggle-btn__desc">Se decide al azar.</span>
              </button>
            </div>
          </section>

          <section class="config-section">
            <h2 class="config-section__title">Dificultad de la IA</h2>
            <div class="toggle-group toggle-group--3" role="radiogroup" aria-label="Dificultad">
              <button class="toggle-btn" data-diff="EASY" role="radio" aria-checked="false">
                🐣 Fácil
                <span class="toggle-btn__desc">Semi-aleatoria, ideal para aprender.</span>
              </button>
              <button class="toggle-btn" data-diff="HARD" role="radio" aria-checked="false">
                🧠 Difícil
                <span class="toggle-btn__desc">Evalúa cada jugada. ¡Desafiante!</span>
              </button>
              <button class="toggle-btn toggle-btn--extreme toggle-btn--active" data-diff="EXTREME" role="radio" aria-checked="true">
                🔥 Extremo
                <span class="toggle-btn__desc">Adversarial: te corta el paso.</span>
              </button>
            </div>
          </section>

          <section class="config-section">
            <h2 class="config-section__title">Expansiones</h2>

            <div class="expansions-grid">
              <label class="expansion-toggle" id="exp-extinction-label">
                <div class="expansion-toggle__info">
                  <span class="expansion-toggle__name">🌿 Extinción</span>
                  <span class="expansion-toggle__desc">
                    Animal/color aleatorio. Menos fichas de ese tipo al final: +7 pts.
                  </span>
                </div>
                <div class="switch switch--active" role="switch" aria-checked="true" aria-labelledby="exp-extinction-label" tabindex="0" id="switch-extinction">
                  <div class="switch__thumb"></div>
                </div>
              </label>

              <label class="expansion-toggle" id="exp-acrobatic-label">
                <div class="expansion-toggle__info">
                  <span class="expansion-toggle__name">🎪 Acrobacia</span>
                  <span class="expansion-toggle__desc">
                    Animal aleatorio en última casilla de Fila 1 al final: +5 pts.
                  </span>
                </div>
                <div class="switch switch--active" role="switch" aria-checked="true" aria-labelledby="exp-acrobatic-label" tabindex="0" id="switch-acrobatic">
                  <div class="switch__thumb"></div>
                </div>
              </label>
            </div>
          </section>

          <div class="start-screen__actions">
            <button class="btn btn--primary btn--lg" id="btn-start">
              Iniciar partida
            </button>
            <button class="btn btn--ghost btn--sm" id="btn-rules">
              Ver reglas
            </button>
          </div>
        </div>
      </div>
    `;

    this.attachListeners();
  }

  private attachListeners(): void {
    // Primer jugador
    this.el.querySelectorAll<HTMLButtonElement>('[data-first]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.selectedFirstPlayer = btn.dataset['first'] as FirstPlayer;
        this.el.querySelectorAll('[data-first]').forEach(b => {
          b.classList.remove('toggle-btn--active');
          b.setAttribute('aria-checked', 'false');
        });
        btn.classList.add('toggle-btn--active');
        btn.setAttribute('aria-checked', 'true');
      });
    });

    // Dificultad
    this.el.querySelectorAll<HTMLButtonElement>('[data-diff]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.selectedDifficulty = btn.dataset['diff'] as Difficulty;
        this.el.querySelectorAll('[data-diff]').forEach(b => {
          b.classList.remove('toggle-btn--active');
          b.setAttribute('aria-checked', 'false');
        });
        btn.classList.add('toggle-btn--active');
        btn.setAttribute('aria-checked', 'true');
      });
    });

    // Expansiones
    const switchExt = this.el.querySelector<HTMLElement>('#switch-extinction');
    const switchAcro = this.el.querySelector<HTMLElement>('#switch-acrobatic');

    const bindSwitch = (switchEl: HTMLElement | null, wrapperId: string, onChange: (val: boolean) => void): void => {
      if (!switchEl) return;
      const toggle = (): void => {
        const active = switchEl.getAttribute('aria-checked') === 'true';
        switchEl.setAttribute('aria-checked', String(!active));
        switchEl.classList.toggle('switch--active', !active);
        onChange(!active);
      };
      this.el.querySelector(`#${wrapperId}`)?.addEventListener('click', toggle);
      switchEl.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
      });
    };

    bindSwitch(switchExt, 'exp-extinction-label', val => { this.extinctionEnabled = val; });
    bindSwitch(switchAcro, 'exp-acrobatic-label', val => { this.acrobaticEnabled = val; });

    // Tile theme picker (topbar)
    const tileThemeBtn = this.el.querySelector<HTMLButtonElement>('#btn-tile-theme-start');
    const tileThemeDropdown = this.el.querySelector<HTMLElement>('#tile-theme-dropdown-start');

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
      });
    });

    document.addEventListener('click', () => tileThemeDropdown?.classList.add('hidden'));

    this.el.querySelector('#btn-start')?.addEventListener('click', () => {
      this.onStart({
        difficulty: this.selectedDifficulty,
        firstPlayer: this.selectedFirstPlayer,
        expansionConfig: {
          extinction: this.extinctionEnabled,
          acrobatic: this.acrobaticEnabled,
        },
      });
    });

    this.el.querySelector('#btn-rules')?.addEventListener('click', () => {
      this.el.dispatchEvent(new CustomEvent('nav:rules', { bubbles: true }));
    });

    this.el.querySelector('#btn-stats-nav')?.addEventListener('click', () => this.onStats());

    const themeBtn = this.el.querySelector<HTMLButtonElement>('#btn-theme');
    themeBtn?.addEventListener('click', () => {
      const next = toggleTheme();
      if (themeBtn) themeBtn.textContent = themeIcon(next);
    });

    // Resume banner
    this.el.querySelector('#btn-resume')?.addEventListener('click', () => {
      this.onResume?.();
    });
    this.el.querySelector('#btn-discard-save')?.addEventListener('click', () => {
      clearGame();
      this.el.querySelector('#resume-banner')?.remove();
    });
  }
}
