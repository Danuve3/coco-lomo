import type { GameState } from '../../engine/types';
import { animalName, colorName } from '../../theme/index';

export class ResultScreen {
  private el: HTMLElement;
  private onPlayAgain: () => void;
  private onHome: () => void;

  constructor(container: HTMLElement, onPlayAgain: () => void, onHome: () => void) {
    this.el = container;
    this.onPlayAgain = onPlayAgain;
    this.onHome = onHome;
  }

  render(state: GameState): void {
    const { playerScore, aiScore } = state;
    const playerWins = playerScore.total > aiScore.total;
    const tie = playerScore.total === aiScore.total;

    this.el.innerHTML = `
      <div class="result-screen">
        <div class="result-screen__hero ${playerWins ? 'result-hero--win' : tie ? 'result-hero--tie' : 'result-hero--loss'}">
          <div class="result-emoji">${playerWins ? '🏆' : tie ? '🤝' : '😤'}</div>
          <h1 class="result-title">${
            playerWins ? '¡Ganaste!' : tie ? '¡Empate!' : 'La IA ganó'
          }</h1>
          <p class="result-subtitle">${state.message}</p>
        </div>

        <div class="result-screen__scores">
          <div class="result-card ${playerWins ? 'result-card--winner' : ''}">
            <div class="result-card__header">🧑 Tú</div>
            <div class="result-card__total">${playerScore.total} pts</div>
            ${this.breakdownHTML(playerScore)}
          </div>

          <div class="result-card ${!playerWins && !tie ? 'result-card--winner' : ''}">
            <div class="result-card__header">🤖 IA</div>
            <div class="result-card__total">${aiScore.total} pts</div>
            ${this.breakdownHTML(aiScore)}
          </div>
        </div>

        ${this.expansionResults(state)}

        <div class="result-screen__actions">
          <button class="btn btn--primary btn--lg" id="btn-play-again">Jugar de nuevo</button>
          <button class="btn btn--ghost" id="btn-home">Volver al inicio</button>
        </div>
      </div>
    `;

    this.el.querySelector('#btn-play-again')?.addEventListener('click', () => this.onPlayAgain());
    this.el.querySelector('#btn-home')?.addEventListener('click', () => this.onHome());
  }

  private breakdownHTML(score: GameState['playerScore']): string {
    const { breakdown } = score;
    const rows = [
      ['Fila 1 (bonus par)', breakdown.row0],
      ['Filas 2-3 (pares)', breakdown.rows12],
      ['Fila 4 (grupos)', breakdown.row3],
      ['Fila 5 (diversidad)', breakdown.row4],
      ['Bonus color', breakdown.colorBonus],
    ] as const;

    const bonusRows = [
      score.extinctionBonus > 0 ? `<tr><td>Extinción</td><td class="pts-positive">+${score.extinctionBonus}</td></tr>` : '',
      score.acrobaticBonus > 0 ? `<tr><td>Acrobacia</td><td class="pts-positive">+${score.acrobaticBonus}</td></tr>` : '',
    ].join('');

    return `
      <table class="result-breakdown">
        <tbody>
          ${rows.map(([label, pts]) =>
            `<tr><td>${label}</td><td>${pts}</td></tr>`
          ).join('')}
          ${bonusRows}
        </tbody>
        <tfoot>
          <tr class="score-total"><td>Total</td><td>${score.total}</td></tr>
        </tfoot>
      </table>
    `;
  }

  private expansionResults(state: GameState): string {
    const parts: string[] = [];

    if (state.expansionConfig.extinction && state.expansionState.extinctionTarget) {
      const t = state.expansionState.extinctionTarget;
      const label = t.kind === 'animal' ? animalName(t.value) : `color ${colorName(t.value)}`;
      const playerBonus = state.playerScore.extinctionBonus;
      const aiBonus = state.aiScore.extinctionBonus;

      parts.push(`
        <div class="expansion-result">
          <span class="expansion-result__title">🌿 Extinción: <strong>${label}</strong></span>
          <p>${
            playerBonus > 0 ? '¡Tú tenías menos! +7 pts para ti.'
            : aiBonus > 0 ? 'La IA tenía menos. +7 pts para la IA.'
            : 'Empate — nadie recibe el bonus.'
          }</p>
        </div>
      `);
    }

    if (state.expansionConfig.acrobatic && state.expansionState.acrobaticTarget) {
      const a = state.expansionState.acrobaticTarget;
      const playerBonus = state.playerScore.acrobaticBonus;
      const aiBonus = state.aiScore.acrobaticBonus;

      parts.push(`
        <div class="expansion-result">
          <span class="expansion-result__title">🎪 Acrobacia: <strong>${animalName(a)}</strong></span>
          <p>${
            playerBonus > 0 && aiBonus > 0 ? 'Ambos tenéis el animal acrobático. +5 pts para cada uno.'
            : playerBonus > 0 ? '¡Tienes el animal acrobático en posición! +5 pts.'
            : aiBonus > 0 ? 'La IA tiene el animal acrobático. +5 pts para la IA.'
            : 'Ninguno consiguió la acrobacia.'
          }</p>
        </div>
      `);
    }

    if (parts.length === 0) return '';
    return `<div class="result-expansions">${parts.join('')}</div>`;
  }
}
