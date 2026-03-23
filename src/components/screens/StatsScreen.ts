import { getRecords, getAggregatedStats, clearStats } from '../../utils/stats';
import type { GameRecord, AggregatedStats } from '../../utils/stats';
import type { AnimalType, TileColor } from '../../engine/types';
import { setupLeavesCanvas, pickBgUrl } from '../../utils/leavesCanvas';

const ANIMAL_LABEL: Record<AnimalType, string> = {
  RABBIT:  '🐰 Conejo',
  LEOPARD: '🐆 Leopardo',
  EAGLE:   '🦅 Águila',
  BEAR:    '🐻 Oso',
  DUCK:    '🦆 Pato',
};

const COLOR_LABEL: Record<TileColor, string> = {
  RED:   'Rojo',
  GREEN: 'Verde',
  BLUE:  'Azul',
};

const COLOR_HEX: Record<TileColor, string> = {
  RED:   '#C75B39',
  GREEN: '#4D8C6F',
  BLUE:  '#3D5494',
};

export class StatsScreen {
  private el: HTMLElement;
  private onBack: () => void;
  private cancelLeaves: (() => void) | null = null;

  constructor(container: HTMLElement, onBack: () => void) {
    this.el = container;
    this.onBack = onBack;
  }

  render(): void {
    this.cancelLeaves?.();
    this.cancelLeaves = null;

    const agg = getAggregatedStats();
    const records = getRecords().slice().reverse();
    const bgUrl = pickBgUrl(import.meta.env.BASE_URL);

    this.el.innerHTML = `
      <div class="stats-screen" style="background-image: url('${bgUrl}')">
        <header class="stats-header">
          <button class="btn btn--ghost btn--sm" id="btn-stats-back">← Volver</button>
          <h1 class="stats-title">Estadísticas</h1>
          <button class="btn btn--ghost btn--sm stats-clear-btn" id="btn-clear-stats">Borrar todo</button>
        </header>

        <div class="stats-body">
          ${agg ? this.allSectionsHTML(agg, records) : '<div class="stats-empty">Aún no hay partidas registradas.</div>'}
        </div>
      </div>
    `;

    const screen = this.el.querySelector<HTMLElement>('.stats-screen');
    if (screen) this.cancelLeaves = setupLeavesCanvas(screen);

    this.el.querySelector('#btn-stats-back')?.addEventListener('click', () => this.onBack());
    this.el.querySelector('#btn-clear-stats')?.addEventListener('click', () => {
      if (confirm('¿Borrar todas las estadísticas?')) {
        clearStats();
        this.render();
      }
    });
  }

  private allSectionsHTML(agg: AggregatedStats, records: GameRecord[]): string {
    return [
      this.sectionResumen(agg),
      this.sectionPuntuaciones(agg),
      this.sectionPorFila(agg),
      this.sectionContexto(agg),
      this.sectionFichas(agg),
      records.length > 0 ? this.sectionHistorial(records) : '',
    ].join('');
  }

  /* ── Sección 1: Resumen ─────────────────────────────────────────────────── */
  private sectionResumen(agg: AggregatedStats): string {
    const streakHTML = agg.currentStreak
      ? this.streakBadge(agg.currentStreak.type, agg.currentStreak.count)
      : '';

    const recentDotsHTML = this.recentDots(agg.recentScores.map((_, i) => {
      // We need original order records to get result dots — use recentScores index
      const all = getRecords();
      const last = all.slice(-15);
      return last[i]?.result ?? 'tie';
    }));

    return `
      <section class="stats-section">
        <div class="ss-label">Resumen</div>
        <div class="stats-summary">
          <div class="stat-card stat-card--total">
            <div class="stat-card__val">${agg.total}</div>
            <div class="stat-card__label">Partidas</div>
          </div>
          <div class="stat-card stat-card--win">
            <div class="stat-card__val">${agg.wins}</div>
            <div class="stat-card__label">Victorias</div>
          </div>
          <div class="stat-card stat-card--loss">
            <div class="stat-card__val">${agg.losses}</div>
            <div class="stat-card__label">Derrotas</div>
          </div>
          <div class="stat-card">
            <div class="stat-card__val">${agg.ties}</div>
            <div class="stat-card__label">Empates</div>
          </div>
          <div class="stat-card stat-card--rate">
            <div class="stat-card__val">${agg.winRate}%</div>
            <div class="stat-card__label">victorias</div>
          </div>
        </div>

        ${streakHTML || recentDotsHTML ? `
        <div class="streak-row">
          ${streakHTML}
          <div class="streak-spacer"></div>
          ${recentDotsHTML}
        </div>` : ''}

        ${agg.bestWinStreak > 0 ? `
        <div class="best-streak-line">
          Mejor racha: <strong>${agg.bestWinStreak} victorias seguidas</strong>
        </div>` : ''}
      </section>
    `;
  }

  private streakBadge(type: 'win' | 'loss' | 'tie', count: number): string {
    const icon = type === 'win' ? '🔥' : type === 'loss' ? '💔' : '🤝';
    const label = type === 'win' ? `${count} victoria${count > 1 ? 's' : ''} seguida${count > 1 ? 's' : ''}`
                : type === 'loss' ? `${count} derrota${count > 1 ? 's' : ''} seguida${count > 1 ? 's' : ''}`
                : 'Empate reciente';
    const mod = type === 'win' ? 'streak--win' : type === 'loss' ? 'streak--loss' : 'streak--tie';
    return `<div class="streak-badge ${mod}">${icon} ${label}</div>`;
  }

  private recentDots(results: ('win' | 'loss' | 'tie')[]): string {
    if (results.length === 0) return '';
    const dots = results.map(r => {
      const cls = r === 'win' ? 'dot--win' : r === 'loss' ? 'dot--loss' : 'dot--tie';
      return `<span class="result-dot ${cls}" title="${r}"></span>`;
    }).join('');
    return `<div class="recent-dots">${dots}</div>`;
  }

  /* ── Sección 2: Puntuaciones ────────────────────────────────────────────── */
  private sectionPuntuaciones(agg: AggregatedStats): string {
    const diffSign = agg.avgScoreDiff >= 0 ? '+' : '';
    const diffCls = agg.avgScoreDiff > 0 ? 'pos' : agg.avgScoreDiff < 0 ? 'neg' : '';

    return `
      <section class="stats-section">
        <div class="ss-label">Puntuaciones</div>

        <div class="scores-compare">
          <div class="score-side score-side--player">
            <div class="score-side__val">${agg.avgPlayerScore}</div>
            <div class="score-side__label">Tu media</div>
          </div>
          <div class="score-side__vs">
            <div class="avg-diff ${diffCls}">${diffSign}${agg.avgScoreDiff}</div>
            <div class="avg-diff-label">diferencia</div>
          </div>
          <div class="score-side score-side--ai">
            <div class="score-side__val">${agg.avgAiScore}</div>
            <div class="score-side__label">Media IA</div>
          </div>
        </div>

        <div class="stats-scores-grid">
          <div class="stats-score-item">
            <span class="stats-score-label">Mejor puntuación</span>
            <span class="stats-score-val stats-score-val--best">${agg.bestPlayerScore} pts</span>
          </div>
          <div class="stats-score-item">
            <span class="stats-score-label">Peor puntuación</span>
            <span class="stats-score-val">${agg.worstPlayerScore} pts</span>
          </div>
          <div class="stats-score-item">
            <span class="stats-score-label">Mayor victoria</span>
            <span class="stats-score-val stats-score-val--best">+${agg.biggestWin} pts</span>
          </div>
          <div class="stats-score-item">
            <span class="stats-score-label">Mayor derrota</span>
            <span class="stats-score-val stats-score-val--loss">−${agg.biggestLoss} pts</span>
          </div>
        </div>

        ${agg.recentScores.length >= 2 ? this.sparklineHTML(agg.recentScores) : ''}
      </section>
    `;
  }

  private sparklineHTML(data: Array<{ player: number; ai: number }>): string {
    const W = 300;
    const H = 52;
    const PAD_X = 6;
    const PAD_Y = 6;

    const allScores = data.flatMap(d => [d.player, d.ai]);
    const minS = Math.min(...allScores);
    const maxS = Math.max(...allScores);
    const range = maxS - minS || 1;

    const sx = (i: number) => PAD_X + (i / (data.length - 1)) * (W - PAD_X * 2);
    const sy = (s: number) => PAD_Y + (1 - (s - minS) / range) * (H - PAD_Y * 2);

    const playerPts = data.map((d, i) => `${sx(i).toFixed(1)},${sy(d.player).toFixed(1)}`);
    const aiPts = data.map((d, i) => `${sx(i).toFixed(1)},${sy(d.ai).toFixed(1)}`);
    const playerPath = playerPts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p}`).join(' ');
    const aiPath = aiPts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p}`).join(' ');
    const areaPath = `${playerPath} L${sx(data.length - 1).toFixed(1)},${H} L${PAD_X},${H} Z`;

    const lastPlayer = data[data.length - 1];

    return `
      <div class="sparkline-wrap">
        <div class="sparkline-header">
          <span class="sparkline-legend sparkline-legend--player">— Tú</span>
          <span class="sparkline-legend sparkline-legend--ai">- - IA</span>
          <span class="sparkline-caption">Últimas ${data.length} partidas</span>
        </div>
        <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" class="sparkline-svg">
          <defs>
            <linearGradient id="spark-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.25"/>
              <stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/>
            </linearGradient>
          </defs>
          <path d="${areaPath}" fill="url(#spark-grad)"/>
          <path d="${playerPath}" fill="none" stroke="var(--accent)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="${aiPath}" fill="none" stroke="var(--red)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="3,2" opacity="0.7"/>
          <circle cx="${sx(data.length - 1).toFixed(1)}" cy="${sy(lastPlayer.player).toFixed(1)}" r="3" fill="var(--accent)"/>
          <circle cx="${sx(data.length - 1).toFixed(1)}" cy="${sy(lastPlayer.ai).toFixed(1)}" r="3" fill="var(--red)" opacity="0.7"/>
        </svg>
      </div>
    `;
  }

  /* ── Sección 3: Por fila ────────────────────────────────────────────────── */
  private sectionPorFila(agg: AggregatedStats): string {
    if (!agg.avgBreakdown) return '';

    const bd = agg.avgBreakdown;
    const rows = [
      { label: 'Fila 1', desc: 'Triple columna', val: bd.row0, max: 20 },
      { label: 'Filas 2–3', desc: 'Pares', val: bd.rows12, max: 15 },
      { label: 'Fila 4', desc: 'Grupos', val: bd.row3, max: 14 },
      { label: 'Fila 5', desc: 'Diversidad', val: bd.row4, max: 14 },
      { label: 'Bonus color', desc: 'Filas/cols monocolor', val: bd.colorBonus, max: 20 },
    ];

    const items = rows.map(r => {
      const pct = Math.round((r.val / r.max) * 100);
      return `
        <div class="breakdown-row">
          <div class="breakdown-info">
            <span class="breakdown-label">${r.label}</span>
            <span class="breakdown-desc">${r.desc}</span>
          </div>
          <div class="breakdown-bar-wrap">
            <div class="breakdown-bar">
              <div class="breakdown-bar__fill" style="width:${pct}%"></div>
            </div>
          </div>
          <span class="breakdown-val">${r.val.toFixed(r.val % 1 === 0 ? 0 : 1)}</span>
        </div>`;
    }).join('');

    return `
      <section class="stats-section">
        <div class="ss-label">Rendimiento por fila <span class="ss-label-sub">(media de puntos)</span></div>
        <div class="breakdown-list">${items}</div>
      </section>
    `;
  }

  /* ── Sección 4: Contexto ────────────────────────────────────────────────── */
  private sectionContexto(agg: AggregatedStats): string {
    return `
      <section class="stats-section">
        <div class="ss-label">Contexto de juego</div>

        <div class="context-grid">
          ${this.contextCard('Por dificultad', this.difficultyContent(agg))}
          ${this.contextCard('Turno inicial', this.turnOrderContent(agg))}
          ${agg.withExtinction.total > 0 || agg.withAcrobatic.total > 0
            ? this.contextCard('Expansiones', this.expansionsContent(agg))
            : ''}
        </div>
      </section>
    `;
  }

  private contextCard(title: string, content: string): string {
    return `
      <div class="ctx-card">
        <div class="ctx-card__title">${title}</div>
        ${content}
      </div>`;
  }

  private difficultyContent(agg: AggregatedStats): string {
    return (['EASY', 'NORMAL', 'HARD', 'EXTREME'] as const).map(diff => {
      const d = agg.byDifficulty[diff];
      if (d.total === 0) return '';
      const label = diff === 'EASY' ? '🐣 Fácil' : diff === 'NORMAL' ? '🧠 Normal' : diff === 'HARD' ? '🔥 Difícil' : '💀 Extremo';
      const pct = Math.round((d.wins / d.total) * 100);
      return `
        <div class="diff-stat-row">
          <span class="diff-stat-label">${label}</span>
          <div class="diff-stat-bar">
            <div class="diff-stat-bar__fill" style="width:${pct}%"></div>
          </div>
          <span class="diff-stat-nums">${d.wins}/${d.total}</span>
        </div>`;
    }).join('');
  }

  private turnOrderContent(agg: AggregatedStats): string {
    const fp = agg.firstPlayer;
    const sp = agg.secondPlayer;
    const fpPct = fp.total > 0 ? Math.round((fp.wins / fp.total) * 100) : 0;
    const spPct = sp.total > 0 ? Math.round((sp.wins / sp.total) * 100) : 0;
    const rows = [
      { label: 'Primero', data: fp, pct: fpPct },
      { label: 'Segundo', data: sp, pct: spPct },
    ];
    return rows.filter(r => r.data.total > 0).map(r => `
      <div class="diff-stat-row">
        <span class="diff-stat-label">${r.label}</span>
        <div class="diff-stat-bar">
          <div class="diff-stat-bar__fill" style="width:${r.pct}%"></div>
        </div>
        <span class="diff-stat-nums">${r.data.wins}/${r.data.total}</span>
      </div>`).join('');
  }

  private expansionsContent(agg: AggregatedStats): string {
    const rows = [];
    if (agg.withExtinction.total > 0) {
      const e = agg.withExtinction;
      const pct = Math.round((e.wins / e.total) * 100);
      rows.push(`
        <div class="diff-stat-row">
          <span class="diff-stat-label">Extinción</span>
          <div class="diff-stat-bar">
            <div class="diff-stat-bar__fill" style="width:${pct}%"></div>
          </div>
          <span class="diff-stat-nums">${e.wins}/${e.total}</span>
        </div>
        ${e.bonusCount > 0 ? `<div class="exp-bonus-line">Bonus conseguido ${e.bonusCount}× de ${e.total}</div>` : ''}`);
    }
    if (agg.withAcrobatic.total > 0) {
      const a = agg.withAcrobatic;
      const pct = Math.round((a.wins / a.total) * 100);
      rows.push(`
        <div class="diff-stat-row">
          <span class="diff-stat-label">Acrobático</span>
          <div class="diff-stat-bar">
            <div class="diff-stat-bar__fill diff-stat-bar__fill--acr" style="width:${pct}%"></div>
          </div>
          <span class="diff-stat-nums">${a.wins}/${a.total}</span>
        </div>
        ${a.bonusCount > 0 ? `<div class="exp-bonus-line">Bonus conseguido ${a.bonusCount}× de ${a.total}</div>` : ''}`);
    }
    return rows.join('');
  }

  /* ── Sección 5: Fichas ──────────────────────────────────────────────────── */
  private sectionFichas(agg: AggregatedStats): string {
    const hasAnimal = Object.keys(agg.animalFrequency).length > 0;
    const hasColor = Object.keys(agg.colorFrequency).length > 0;
    if (!hasAnimal && !hasColor) return '';

    const animals: AnimalType[] = ['RABBIT', 'LEOPARD', 'EAGLE', 'BEAR', 'DUCK'];
    const colors: TileColor[] = ['RED', 'GREEN', 'BLUE'];

    const animalMax = Math.max(...animals.map(a => agg.animalFrequency[a] ?? 0), 1);
    const colorMax = Math.max(...colors.map(c => agg.colorFrequency[c] ?? 0), 1);

    const animalRows = hasAnimal ? animals.map(a => {
      const val = agg.animalFrequency[a] ?? 0;
      const pct = Math.round((val / animalMax) * 100);
      return `
        <div class="tile-freq-row">
          <span class="tile-freq-label">${ANIMAL_LABEL[a]}</span>
          <div class="tile-freq-bar">
            <div class="tile-freq-bar__fill tile-freq-bar__fill--animal" style="width:${pct}%"></div>
          </div>
          <span class="tile-freq-val">${val.toFixed(1)}</span>
        </div>`;
    }).join('') : '';

    const colorRows = hasColor ? colors.map(c => {
      const val = agg.colorFrequency[c] ?? 0;
      const pct = Math.round((val / colorMax) * 100);
      return `
        <div class="tile-freq-row">
          <span class="tile-freq-label">
            <span class="color-dot" style="background:${COLOR_HEX[c]}"></span>
            ${COLOR_LABEL[c]}
          </span>
          <div class="tile-freq-bar">
            <div class="tile-freq-bar__fill" style="width:${pct}%; background:${COLOR_HEX[c]}; opacity:0.75;"></div>
          </div>
          <span class="tile-freq-val">${val.toFixed(1)}</span>
        </div>`;
    }).join('') : '';

    return `
      <section class="stats-section">
        <div class="ss-label">Fichas en tu tablero <span class="ss-label-sub">(media por partida)</span></div>
        <div class="fichas-grid">
          ${hasAnimal ? `<div class="fichas-sub">
            <div class="fichas-sub-title">Por animal</div>
            <div class="tile-freq-list">${animalRows}</div>
          </div>` : ''}
          ${hasColor ? `<div class="fichas-sub">
            <div class="fichas-sub-title">Por color</div>
            <div class="tile-freq-list">${colorRows}</div>
          </div>` : ''}
        </div>
      </section>
    `;
  }

  /* ── Sección 6: Historial ───────────────────────────────────────────────── */
  private sectionHistorial(records: GameRecord[]): string {
    return `
      <section class="stats-section">
        <div class="ss-label">Historial <span class="ss-label-sub">(últimas ${Math.min(records.length, 30)})</span></div>
        <div class="stats-history-list">
          ${records.slice(0, 30).map(r => this.recordHTML(r)).join('')}
        </div>
      </section>
    `;
  }

  private recordHTML(r: GameRecord): string {
    const date = new Date(r.date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' });
    const icon = r.result === 'win' ? '🏆' : r.result === 'loss' ? '😤' : '🤝';
    const diffLabel = r.difficulty === 'EASY' ? 'Fácil' : r.difficulty === 'NORMAL' ? 'Normal' : r.difficulty === 'HARD' ? 'Difícil' : 'Extremo';
    const diff = r.player.total - r.ai.total;
    const diffStr = diff > 0 ? `+${diff}` : String(diff);

    return `
      <div class="history-item history-item--${r.result}">
        <span class="history-icon">${icon}</span>
        <div class="history-info">
          <span class="history-score">${r.player.total} — ${r.ai.total}</span>
          <span class="history-diff-score ${diff > 0 ? 'pos' : diff < 0 ? 'neg' : ''}">${diffStr}</span>
        </div>
        <div class="history-meta">
          <span class="history-diff-badge history-diff-badge--${r.difficulty.toLowerCase()}">${diffLabel}</span>
          <span class="history-date">${date}</span>
        </div>
      </div>
    `;
  }
}
