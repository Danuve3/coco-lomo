import { getRecords, getAggregatedStats, clearStats } from '../../utils/stats';
import type { GameRecord, AggregatedStats } from '../../utils/stats';

export class StatsScreen {
  private el: HTMLElement;
  private onBack: () => void;

  constructor(container: HTMLElement, onBack: () => void) {
    this.el = container;
    this.onBack = onBack;
  }

  render(): void {
    const agg = getAggregatedStats();
    const records = getRecords().slice().reverse();

    this.el.innerHTML = `
      <div class="stats-screen">
        <header class="stats-header">
          <button class="btn btn--ghost btn--sm" id="btn-stats-back">← Volver</button>
          <h1 class="stats-title">Estadísticas</h1>
          <button class="btn btn--ghost btn--sm stats-clear-btn" id="btn-clear-stats">Borrar todo</button>
        </header>

        <div class="stats-body">
          ${agg ? this.aggregatedHTML(agg) : '<div class="stats-empty">Aún no hay partidas registradas.</div>'}
          ${records.length > 0 ? this.historyHTML(records) : ''}
        </div>
      </div>
    `;

    this.el.querySelector('#btn-stats-back')?.addEventListener('click', () => this.onBack());
    this.el.querySelector('#btn-clear-stats')?.addEventListener('click', () => {
      if (confirm('¿Borrar todas las estadísticas?')) {
        clearStats();
        this.render();
      }
    });
  }

  private aggregatedHTML(agg: AggregatedStats): string {
    return `
      <section class="stats-section">
        <div class="stats-summary">
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
            <div class="stat-card__label">Victorias</div>
          </div>
        </div>

        <div class="stats-scores-grid">
          <div class="stats-score-item">
            <span class="stats-score-label">Media tuya</span>
            <span class="stats-score-val">${agg.avgPlayerScore} pts</span>
          </div>
          <div class="stats-score-item">
            <span class="stats-score-label">Media IA</span>
            <span class="stats-score-val">${agg.avgAiScore} pts</span>
          </div>
          <div class="stats-score-item">
            <span class="stats-score-label">Mejor marca</span>
            <span class="stats-score-val stats-score-val--best">${agg.bestPlayerScore} pts</span>
          </div>
          <div class="stats-score-item">
            <span class="stats-score-label">Peor marca</span>
            <span class="stats-score-val">${agg.worstPlayerScore} pts</span>
          </div>
        </div>

        <div class="stats-by-diff">
          ${(['EASY', 'HARD', 'EXTREME'] as const).map(diff => {
            const d = agg.byDifficulty[diff];
            if (d.total === 0) return '';
            const label = diff === 'EASY' ? '🐣 Fácil' : diff === 'HARD' ? '🧠 Difícil' : '🔥 Extremo';
            const pct = Math.round((d.wins / d.total) * 100);
            return `
              <div class="diff-stat-row">
                <span class="diff-stat-label">${label}</span>
                <div class="diff-stat-bar">
                  <div class="diff-stat-bar__fill" style="width:${pct}%"></div>
                </div>
                <span class="diff-stat-nums">${d.wins}/${d.total}</span>
              </div>`;
          }).join('')}
        </div>
      </section>
    `;
  }

  private historyHTML(records: GameRecord[]): string {
    return `
      <section class="stats-section">
        <h2 class="stats-section-title">Últimas partidas</h2>
        <div class="stats-history-list">
          ${records.slice(0, 30).map(r => this.recordHTML(r)).join('')}
        </div>
      </section>
    `;
  }

  private recordHTML(r: GameRecord): string {
    const date = new Date(r.date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' });
    const icon = r.result === 'win' ? '🏆' : r.result === 'loss' ? '😤' : '🤝';
    const diffLabel = r.difficulty === 'EASY' ? 'Fácil' : r.difficulty === 'HARD' ? 'Difícil' : 'Extremo';
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
