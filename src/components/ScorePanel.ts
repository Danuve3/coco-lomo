import type { GameState, BoardScore } from '../engine/types';
import { animalIcon, animalName, tileBg, colorName } from '../theme/index';
import { countExtinctionTiles } from '../engine/scoring';
import { EXTINCTION_BONUS, ACROBATIC_BONUS } from '../engine/constants';

export class ScorePanel {
  private el: HTMLElement;
  private elBottom: HTMLElement | null;

  constructor(container: HTMLElement, bottomContainer: HTMLElement | null = null) {
    this.el = container;
    this.elBottom = bottomContainer;
  }

  render(state: GameState): void {
    const phaseLabel =
      state.phase === 'PLAYER_SELECT' ? '🧑'
      : state.phase === 'PLAYER_PLACE' ? '🧑'
      : state.phase === 'AI_TURN' ? '🤖'
      : '🏁';

    this.el.innerHTML = `
      <div class="score-panel__round">
        <div class="score-panel__round-left">
          <div class="round-badge">Ronda ${state.round} / 6</div>
          <div class="phase-badge">${phaseLabel}</div>
        </div>
        <div class="score-panel__round-right">
          ${this.extinctionChip(state)}
          ${this.acrobaticChip(state)}
        </div>
      </div>
    `;

    if (this.elBottom) {
      this.elBottom.innerHTML = `
        <div class="score-panel-bottom">
          ${this.scoreBreakdown('Tu puntuación', state.playerScore)}
          ${state.expansionConfig.extinction ? this.expansionProgress(state) : ''}
        </div>
      `;
    }
  }

  private extinctionChip(state: GameState): string {
    if (!state.expansionConfig.extinction || !state.expansionState.extinctionTarget) return '';
    const t = state.expansionState.extinctionTarget;
    const playerCount = countExtinctionTiles(state.playerBoard, state.expansionState);
    const aiCount = countExtinctionTiles(state.aiBoard, state.expansionState);

    let targetIcon: string;
    if (t.kind === 'color') {
      const bg = tileBg(t.value);
      targetIcon = `<span class="chip-color-swatch" style="background-color:${bg};"></span>`;
    } else {
      targetIcon = `<s class="chip-icon">${animalIcon(t.value)}</s>`;
    }

    const winning = playerCount < aiCount;
    const losing = playerCount > aiCount;
    const statusClass = winning ? 'chip-status--winning' : losing ? 'chip-status--losing' : '';
    const label = t.kind === 'color' ? colorName(t.value) : animalName(t.value);

    return `
      <div class="expansion-chip expansion-chip--ext" title="Extinción: menos ${label} → +${EXTINCTION_BONUS} pts">
        ${targetIcon}
        <span class="expansion-chip__label">${label}</span>
        <span class="expansion-chip__counts ${statusClass}">${playerCount}–${aiCount}</span>
      </div>
    `;
  }

  private acrobaticChip(state: GameState): string {
    if (!state.expansionConfig.acrobatic || !state.expansionState.acrobaticTarget) return '';
    const a = state.expansionState.acrobaticTarget;
    return `
      <div class="expansion-chip expansion-chip--acr" title="Acrobacia: ${animalName(a)} en F1, col. 5 → +${ACROBATIC_BONUS} pts">
        <span class="chip-icon">${animalIcon(a)}</span>
        <span class="expansion-chip__label">${animalName(a)}</span>
      </div>
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
