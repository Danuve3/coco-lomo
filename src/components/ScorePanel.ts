import type { GameState, BoardScore } from '../engine/types';
import { animalName, colorName } from '../theme/index';
import { countExtinctionTiles } from '../engine/scoring';

export class ScorePanel {
  private el: HTMLElement;

  constructor(container: HTMLElement) {
    this.el = container;
  }

  render(state: GameState): void {
    this.el.innerHTML = `
      <div class="score-panel">
        ${this.roundInfo(state)}
        ${this.expansionBanners(state)}
        ${this.scoreBreakdown('Tu puntuación', state.playerScore)}
        ${state.expansionConfig.extinction || state.expansionConfig.acrobatic
          ? this.expansionProgress(state)
          : ''}
      </div>
    `;
  }

  private roundInfo(state: GameState): string {
    const phaseLabel =
      state.phase === 'PLAYER_SELECT' ? '🧑 Tu turno'
      : state.phase === 'PLAYER_PLACE' ? '🧑 Elige fila'
      : state.phase === 'AI_TURN' ? '🤖 Turno IA'
      : '🏁 Fin';

    return `
      <div class="score-panel__round">
        <div class="round-badge">Ronda ${state.round} / 6</div>
        <div class="phase-badge">${phaseLabel}</div>
      </div>
      <div class="score-panel__message">${state.message}</div>
    `;
  }

  private scoreBreakdown(title: string, score: BoardScore): string {
    const { breakdown } = score;

    return `
      <div class="score-breakdown">
        <div class="score-breakdown__title">${title}</div>
        <table class="score-table">
          <tbody>
            <tr><td>F1 (bonus par):</td><td class="${breakdown.row0 > 0 ? 'pts-positive' : ''}">${breakdown.row0}</td></tr>
            <tr><td>F2-F3 (pares):</td><td class="${breakdown.rows12 > 0 ? 'pts-positive' : ''}">${breakdown.rows12}</td></tr>
            <tr><td>F4 (grupos):</td><td class="${breakdown.row3 > 0 ? 'pts-positive' : ''}">${breakdown.row3}</td></tr>
            <tr><td>F5 (diversidad):</td><td class="${breakdown.row4 > 0 ? 'pts-positive' : ''}">${breakdown.row4}</td></tr>
            <tr><td>Bonus color:</td><td class="${breakdown.colorBonus > 0 ? 'pts-positive' : ''}">${breakdown.colorBonus}</td></tr>
            ${score.extinctionBonus > 0 ? `<tr><td>Extinción:</td><td class="pts-positive">+${score.extinctionBonus}</td></tr>` : ''}
            ${score.acrobaticBonus > 0 ? `<tr><td>Acrobacia:</td><td class="pts-positive">+${score.acrobaticBonus}</td></tr>` : ''}
          </tbody>
          <tfoot>
            <tr class="score-total"><td>Total:</td><td>${score.total}</td></tr>
          </tfoot>
        </table>
      </div>
    `;
  }

  private expansionBanners(state: GameState): string {
    const banners: string[] = [];

    if (state.expansionConfig.extinction && state.expansionState.extinctionTarget) {
      const t = state.expansionState.extinctionTarget;
      const label = t.kind === 'animal' ? `${animalName(t.value)} 🐾` : `Color ${colorName(t.value)}`;
      banners.push(`
        <div class="expansion-banner expansion-banner--extinction">
          <span class="expansion-banner__tag">Extinción</span>
          <span>Menos <strong>${label}</strong> → +7 pts</span>
        </div>
      `);
    }

    if (state.expansionConfig.acrobatic && state.expansionState.acrobaticTarget) {
      const a = state.expansionState.acrobaticTarget;
      banners.push(`
        <div class="expansion-banner expansion-banner--acrobatic">
          <span class="expansion-banner__tag">Acrobacia</span>
          <span><strong>${animalName(a)}</strong> en F1, col. 5 → +5 pts</span>
        </div>
      `);
    }

    return banners.join('');
  }

  private expansionProgress(state: GameState): string {
    if (!state.expansionConfig.extinction || !state.expansionState.extinctionTarget) return '';

    const playerCount = countExtinctionTiles(state.playerBoard, state.expansionState);
    const aiCount = countExtinctionTiles(state.aiBoard, state.expansionState);

    return `
      <div class="extinction-progress">
        <div class="extinction-progress__label">Fichas del objetivo:</div>
        <div class="extinction-progress__row">
          <span>Tú: <strong>${playerCount}</strong></span>
          <span>IA: <strong>${aiCount}</strong></span>
          <span class="extinction-progress__hint">${
            playerCount < aiCount ? '✓ Vas ganando el bonus'
            : playerCount > aiCount ? '✗ IA va ganando el bonus'
            : '— Empate'
          }</span>
        </div>
      </div>
    `;
  }
}
